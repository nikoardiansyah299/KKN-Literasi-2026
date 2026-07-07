try {
  require("dotenv").config();
} catch (error) {
  console.warn("dotenv is not available; continuing without it.");
}

let express;
let cors;
let bcrypt;
let z;
let ready;
let query;
let transaction;
let toBookResponse;
let getBookAvailability;
let signToken;
let authenticate;
let authorizeRole;

try {
  express = require("express");
  cors = require("cors");
  bcrypt = require("bcryptjs");
  ({ z } = require("zod"));
  ({ ready, query, transaction, toBookResponse, getBookAvailability } = require("./db"));
  ({ signToken, authenticate, authorizeRole } = require("./auth"));
} catch (error) {
  console.error("Failed to load server runtime dependencies:", error);
  throw error;
}

const app = express();
const PORT = process.env.PORT || 4000;
const DAILY_LATE_FEE = Number(process.env.DAILY_LATE_FEE || 2000);
const BORROW_DAYS_DEFAULT = Number(process.env.BORROW_DAYS_DEFAULT || 14);

app.use(cors());
app.use(express.json());

app.use(async (_req, _res, next) => {
  try {
    await ready;
    next();
  } catch (error) {
    next(error);
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/auth/register", async (req, res) => {
  const schema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid input", issues: parsed.error.issues });
  }

  const { name, email, password } = parsed.data;
  const existingResult = await query("SELECT id FROM users WHERE email = $1", [email]);
  if (existingResult.rows[0]) {
    return res.status(409).json({ message: "Email already registered" });
  }

  const hash = bcrypt.hashSync(password, 10);
  const insertResult = await query(
    "INSERT INTO users(name, email, password_hash, role) VALUES ($1, $2, $3, 'user') RETURNING id",
    [name, email, hash]
  );

  const userId = insertResult.lastInsertId || insertResult.rows?.[0]?.id;
  const userResult = await query("SELECT id, name, email, role FROM users WHERE id = $1", [userId]);
  const user = userResult.rows[0];
  const token = signToken(user);
  return res.status(201).json({ token, user });
});

app.post("/api/auth/login", async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid input", issues: parsed.error.issues });
  }

  const userResult = await query(
    "SELECT id, name, email, role, password_hash FROM users WHERE email = $1",
    [parsed.data.email]
  );

  const user = userResult.rows[0];
  if (!user || !bcrypt.compareSync(parsed.data.password, user.password_hash)) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = signToken(user);
  return res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

app.get("/api/catalog", async (req, res) => {
  const page = Math.max(Number(req.query.page || 1), 1);
  const pageSize = Math.min(Math.max(Number(req.query.pageSize || 12), 1), 50);
  const offset = (page - 1) * pageSize;
  const search = req.query.search ? `%${String(req.query.search).trim()}%` : null;

  const start = req.query.start !== undefined ? Number(req.query.start) : 0;
  const end = req.query.end !== undefined ? Number(req.query.end) : 999;

  if (Number.isNaN(start) || Number.isNaN(end) || start < 0 || end > 999 || start > end) {
    return res.status(400).json({ message: "Invalid range. Use start/end between 000-999." });
  }

  let rows;
  let totalRow;

  if (search) {
    rows = (
      await query(
        `SELECT * FROM books
         WHERE catalog_number BETWEEN $1 AND $2
         AND (title LIKE $3 OR author LIKE $4)
         ORDER BY catalog_number ASC, title ASC
         LIMIT $5 OFFSET $6`,
        [start, end, search, search, pageSize, offset]
      )
    ).rows;

    totalRow = (
      await query(
        `SELECT COUNT(*) AS total FROM books
         WHERE catalog_number BETWEEN $1 AND $2
         AND (title LIKE $3 OR author LIKE $4)`,
        [start, end, search, search]
      )
    ).rows[0];
  } else {
    rows = (
      await query(
        `SELECT * FROM books
         WHERE catalog_number BETWEEN $1 AND $2
         ORDER BY catalog_number ASC, title ASC
         LIMIT $3 OFFSET $4`,
        [start, end, pageSize, offset]
      )
    ).rows;

    totalRow = (
      await query("SELECT COUNT(*) AS total FROM books WHERE catalog_number BETWEEN $1 AND $2", [
        start,
        end,
      ])
    ).rows[0];
  }

  const items = await Promise.all(
    rows.map(async (row) => {
      try {
        return await toBookResponse(row);
      } catch (error) {
        console.error("Failed to build book response for catalog item:", error);
        return {
          ...row,
          catalog_number_label: row.catalog_number ? String(row.catalog_number).padStart(3, "0") : "000",
          availability: {
            totalCopies: 0,
            activeLoans: 0,
            activeReservations: 0,
            availableCopies: 0,
            status: "unknown",
          },
        };
      }
    })
  );

  return res.json({
    page,
    pageSize,
    total: Number(totalRow.total),
    items,
  });
});

app.get("/api/books/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "Invalid id" });
  }

  const row = (await query("SELECT * FROM books WHERE id = $1", [id])).rows[0];
  if (!row) {
    return res.status(404).json({ message: "Book not found" });
  }

  try {
    return res.json(await toBookResponse(row));
  } catch (error) {
    console.error("Failed to build single-book response:", error);
    return res.json({
      ...row,
      catalog_number_label: row.catalog_number ? String(row.catalog_number).padStart(3, "0") : "000",
      availability: {
        totalCopies: 0,
        activeLoans: 0,
        activeReservations: 0,
        availableCopies: 0,
        status: "unknown",
      },
    });
  }
});

app.post("/api/borrow-requests", authenticate, authorizeRole("user"), async (req, res) => {
  const schema = z.object({
    bookId: z.number().int().positive(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid input", issues: parsed.error.issues });
  }

  const book = (await query("SELECT id FROM books WHERE id = $1", [parsed.data.bookId])).rows[0];
  if (!book) {
    return res.status(404).json({ message: "Book not found" });
  }

  const existingPending = (
    await query(
      "SELECT id FROM borrow_requests WHERE user_id = $1 AND book_id = $2 AND status = 'pending'",
      [req.user.id, parsed.data.bookId]
    )
  ).rows[0];

  if (existingPending) {
    return res.status(409).json({ message: "Request already pending" });
  }

  const result = await query(
    "INSERT INTO borrow_requests(user_id, book_id) VALUES ($1, $2) RETURNING id",
    [req.user.id, parsed.data.bookId]
  );

  return res.status(201).json({
    id: result.lastInsertId || result.rows?.[0]?.id || null,
    message: "Borrow request submitted",
  });
});

app.post("/api/reservations", authenticate, authorizeRole("user"), async (req, res) => {
  const schema = z.object({
    bookId: z.number().int().positive(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid input", issues: parsed.error.issues });
  }

  const availability = await getBookAvailability(parsed.data.bookId);
  if (!availability) {
    return res.status(404).json({ message: "Book not found" });
  }

  if (availability.availableCopies > 0) {
    return res.status(409).json({ message: "Book is currently available; borrow directly" });
  }

  const existing = (
    await query("SELECT id FROM reservations WHERE user_id = $1 AND book_id = $2 AND status = 'active'", [
      req.user.id,
      parsed.data.bookId,
    ])
  ).rows[0];

  if (existing) {
    return res.status(409).json({ message: "Reservation already active" });
  }

  const result = await query("INSERT INTO reservations(user_id, book_id) VALUES ($1, $2) RETURNING id", [
    req.user.id,
    parsed.data.bookId,
  ]);

  return res.status(201).json({
    id: result.lastInsertId || result.rows?.[0]?.id || null,
    message: "Reservation created",
  });
});

app.get("/api/me/loans", authenticate, async (req, res) => {
  const rows = (
    await query(
      `SELECT l.*, b.title, b.author, b.catalog_number
       FROM loans l
       JOIN books b ON b.id = l.book_id
       WHERE l.user_id = $1
       ORDER BY l.created_at DESC`,
      [req.user.id]
    )
  ).rows;

  res.json(rows);
});

app.get("/api/me/notifications", authenticate, async (req, res) => {
  try {
    const rows = (
      await query("SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC", [req.user.id])
    ).rows;
    res.json(rows);
  } catch (_error) {
    res.json([]);
  }
});

app.get("/api/admin/books", authenticate, authorizeRole("admin"), async (_req, res) => {
  const rows = (await query("SELECT * FROM books ORDER BY catalog_number ASC, title ASC")).rows;
  const items = await Promise.all(rows.map((row) => toBookResponse(row)));
  res.json(items);
});

app.post("/api/admin/books", authenticate, authorizeRole("admin"), async (req, res) => {
  const schema = z.object({
    title: z.string().min(1),
    author: z.string().min(1),
    catalogNumber: z.number().int().min(0).max(999),
    totalCopies: z.number().int().min(0).default(1),
    description: z.string().default(""),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid input", issues: parsed.error.issues });
  }

  const data = parsed.data;
  const result = await query(
    `INSERT INTO books(title, author, catalog_number, total_copies, description)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [data.title, data.author, data.catalogNumber, data.totalCopies, data.description]
  );

  const createdId = result.lastInsertId || result.rows?.[0]?.id;
  const book = (await query("SELECT * FROM books WHERE id = $1", [createdId])).rows[0];
  res.status(201).json(await toBookResponse(book));
});

app.put("/api/admin/books/:id", authenticate, authorizeRole("admin"), async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "Invalid id" });
  }

  const schema = z.object({
    title: z.string().min(1),
    author: z.string().min(1),
    catalogNumber: z.number().int().min(0).max(999),
    totalCopies: z.number().int().min(0),
    description: z.string().default(""),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid input", issues: parsed.error.issues });
  }

  const found = (await query("SELECT id FROM books WHERE id = $1", [id])).rows[0];
  if (!found) {
    return res.status(404).json({ message: "Book not found" });
  }

  const data = parsed.data;
  await query(
    `UPDATE books
     SET title = $1, author = $2, catalog_number = $3, total_copies = $4, description = $5, updated_at = CURRENT_TIMESTAMP
     WHERE id = $6`,
    [data.title, data.author, data.catalogNumber, data.totalCopies, data.description, id]
  );

  const updated = (await query("SELECT * FROM books WHERE id = $1", [id])).rows[0];
  res.json(await toBookResponse(updated));
});

app.delete("/api/admin/books/:id", authenticate, authorizeRole("admin"), async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "Invalid id" });
  }

  const found = (await query("SELECT id FROM books WHERE id = $1", [id])).rows[0];
  if (!found) {
    return res.status(404).json({ message: "Book not found" });
  }

  await query("DELETE FROM books WHERE id = $1", [id]);
  res.status(204).send();
});

app.get("/api/admin/books/export", authenticate, authorizeRole("admin"), async (_req, res) => {
  const rows = (await query("SELECT * FROM books ORDER BY catalog_number ASC, title ASC")).rows;
  res.json({ exportedAt: new Date().toISOString(), items: rows });
});

app.post("/api/admin/books/import", authenticate, authorizeRole("admin"), async (req, res) => {
  const schema = z.array(
    z.object({
      title: z.string().min(1),
      author: z.string().min(1),
      catalogNumber: z.number().int().min(0).max(999),
      totalCopies: z.number().int().min(0).default(1),
      description: z.string().default(""),
    })
  );

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid payload", issues: parsed.error.issues });
  }

  await transaction(async (tx) => {
    for (const item of parsed.data) {
      await tx.query(
        `INSERT INTO books(title, author, catalog_number, total_copies, description)
         VALUES ($1, $2, $3, $4, $5)`,
        [item.title, item.author, item.catalogNumber, item.totalCopies, item.description]
      );
    }
  });

  res.status(201).json({ message: "Import complete", inserted: parsed.data.length });
});

app.get("/api/admin/borrow-requests", authenticate, authorizeRole("admin"), async (req, res) => {
  const status = req.query.status ? String(req.query.status) : null;

  let rows;
  if (status && ["pending", "approved", "rejected"].includes(status)) {
    rows = (
      await query(
        `SELECT br.*, u.name AS user_name, b.title AS book_title
         FROM borrow_requests br
         JOIN users u ON u.id = br.user_id
         JOIN books b ON b.id = br.book_id
         WHERE br.status = $1
         ORDER BY br.requested_at DESC`,
        [status]
      )
    ).rows;
  } else {
    rows = (
      await query(
        `SELECT br.*, u.name AS user_name, b.title AS book_title
         FROM borrow_requests br
         JOIN users u ON u.id = br.user_id
         JOIN books b ON b.id = br.book_id
         ORDER BY br.requested_at DESC`
      )
    ).rows;
  }

  res.json(rows);
});

app.post("/api/admin/borrow-requests/:id/approve", authenticate, authorizeRole("admin"), async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "Invalid id" });
  }

  const request = (
    await query("SELECT * FROM borrow_requests WHERE id = $1 AND status = 'pending'", [id])
  ).rows[0];

  if (!request) {
    return res.status(404).json({ message: "Pending request not found" });
  }

  const availability = await getBookAvailability(request.book_id);
  if (!availability || availability.availableCopies <= 0) {
    return res.status(409).json({ message: "No available copies to approve" });
  }

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + BORROW_DAYS_DEFAULT);

  await transaction(async (tx) => {
    await tx.query(
      "UPDATE borrow_requests SET status = 'approved', admin_id = $1, decided_at = CURRENT_TIMESTAMP WHERE id = $2",
      [req.user.id, id]
    );

    await tx.query(
      "INSERT INTO loans(user_id, book_id, borrow_request_id, due_date) VALUES ($1, $2, $3, $4)",
      [request.user_id, request.book_id, id, dueDate.toISOString()]
    );

    await tx.query("INSERT INTO notifications(user_id, message) VALUES ($1, $2)", [
      request.user_id,
      `Your borrow request #${id} has been approved. Due date: ${dueDate.toDateString()}.`,
    ]);
  });

  res.json({ message: "Request approved", dueDate: dueDate.toISOString() });
});

app.post("/api/admin/borrow-requests/:id/reject", authenticate, authorizeRole("admin"), async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "Invalid id" });
  }

  const request = (
    await query("SELECT * FROM borrow_requests WHERE id = $1 AND status = 'pending'", [id])
  ).rows[0];

  if (!request) {
    return res.status(404).json({ message: "Pending request not found" });
  }

  await query(
    "UPDATE borrow_requests SET status = 'rejected', admin_id = $1, decided_at = CURRENT_TIMESTAMP WHERE id = $2",
    [req.user.id, id]
  );

  await query("INSERT INTO notifications(user_id, message) VALUES ($1, $2)", [
    request.user_id,
    `Your borrow request #${id} has been rejected.`,
  ]);

  res.json({ message: "Request rejected" });
});

app.get("/api/admin/loans", authenticate, authorizeRole("admin"), async (_req, res) => {
  const rows = (
    await query(
      `SELECT l.*, u.name AS user_name, b.title AS book_title
       FROM loans l
       JOIN users u ON u.id = l.user_id
       JOIN books b ON b.id = l.book_id
       ORDER BY l.created_at DESC`
    )
  ).rows;
  res.json(rows);
});

app.post("/api/admin/loans/:id/return", authenticate, authorizeRole("admin"), async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "Invalid id" });
  }

  const loan = (await query("SELECT * FROM loans WHERE id = $1", [id])).rows[0];
  if (!loan) {
    return res.status(404).json({ message: "Loan not found" });
  }

  if (loan.returned_at) {
    return res.status(409).json({ message: "Loan already returned" });
  }

  const now = new Date();
  const due = new Date(loan.due_date);
  const overdueMs = Math.max(now.getTime() - due.getTime(), 0);
  const overdueDays = Math.ceil(overdueMs / (1000 * 60 * 60 * 24));
  const fee = overdueDays > 0 ? overdueDays * DAILY_LATE_FEE : 0;

  await transaction(async (tx) => {
    await tx.query("UPDATE loans SET returned_at = CURRENT_TIMESTAMP, late_fee = $1 WHERE id = $2", [fee, id]);

    await tx.query("INSERT INTO notifications(user_id, message) VALUES ($1, $2)", [
      loan.user_id,
      fee > 0 ? `Book returned with overdue fee: ${fee}.` : "Book return recorded. No late fee.",
    ]);

    const reservation = (
      await tx.query(
        "SELECT * FROM reservations WHERE book_id = $1 AND status = 'active' ORDER BY created_at ASC LIMIT 1",
        [loan.book_id]
      )
    ).rows[0];

    if (reservation) {
      await tx.query("UPDATE reservations SET status = 'fulfilled' WHERE id = $1", [reservation.id]);
      await tx.query("INSERT INTO notifications(user_id, message) VALUES ($1, $2)", [
        reservation.user_id,
        "A reserved book is now available for you.",
      ]);
    }
  });

  res.json({
    message: "Return recorded",
    lateFee: fee,
    overdueDays,
  });
});

app.get("/api/admin/analytics", authenticate, authorizeRole("admin"), async (_req, res) => {
  const totals = {
    users: Number((await query("SELECT COUNT(*) AS count FROM users WHERE role = 'user'")).rows[0].count),
    books: Number((await query("SELECT COUNT(*) AS count FROM books")).rows[0].count),
    activeLoans: Number(
      (await query("SELECT COUNT(*) AS count FROM loans WHERE returned_at IS NULL")).rows[0].count
    ),
    overdueLoans: Number(
      (
        await query(
          "SELECT COUNT(*) AS count FROM loans WHERE returned_at IS NULL AND due_date < CURRENT_TIMESTAMP"
        )
      ).rows[0].count
    ),
    pendingRequests: Number(
      (await query("SELECT COUNT(*) AS count FROM borrow_requests WHERE status = 'pending'"))
        .rows[0].count
    ),
  };

  const mostBorrowed = (
    await query(
      `SELECT b.id, b.title, COUNT(*) AS borrow_count
       FROM loans l
       JOIN books b ON b.id = l.book_id
       GROUP BY b.id, b.title
       ORDER BY borrow_count DESC
       LIMIT 5`
    )
  ).rows;

  const fees = (await query("SELECT COALESCE(SUM(late_fee), 0) AS total FROM loans")).rows[0];

  res.json({
    totals,
    totalLateFees: Number(fees.total),
    mostBorrowed,
  });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: "Internal server error" });
});

if (require.main === module) {
  ready
    .then(() => {
      app.listen(PORT, () => {
        console.log(`API running on http://localhost:${PORT}`);
      });
    })
    .catch((error) => {
      console.error("Failed to initialize database:", error);
      process.exit(1);
    });
}

module.exports = app;
module.exports.default = app;
