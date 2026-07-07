const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const { z } = require("zod");
const { db, toBookResponse, getBookAvailability } = require("./db");
const { signToken, authenticate, authorizeRole } = require("./auth");

const app = express();
const PORT = process.env.PORT || 4000;
const DAILY_LATE_FEE = Number(process.env.DAILY_LATE_FEE || 2000);
const BORROW_DAYS_DEFAULT = Number(process.env.BORROW_DAYS_DEFAULT || 14);

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/auth/register", (req, res) => {
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
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) {
    return res.status(409).json({ message: "Email already registered" });
  }

  const hash = bcrypt.hashSync(password, 10);
  const result = db
    .prepare("INSERT INTO users(name, email, password_hash, role) VALUES (?, ?, ?, 'user')")
    .run(name, email, hash);

  const user = db.prepare("SELECT id, name, email, role FROM users WHERE id = ?").get(result.lastInsertRowid);
  const token = signToken(user);
  return res.status(201).json({ token, user });
});

app.post("/api/auth/login", (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid input", issues: parsed.error.issues });
  }

  const user = db
    .prepare("SELECT id, name, email, role, password_hash FROM users WHERE email = ?")
    .get(parsed.data.email);

  if (!user || !bcrypt.compareSync(parsed.data.password, user.password_hash)) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = signToken(user);
  return res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

app.get("/api/catalog", (req, res) => {
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
    rows = db
      .prepare(
        `SELECT * FROM books
         WHERE catalog_number BETWEEN ? AND ?
         AND (title LIKE ? OR author LIKE ?)
         ORDER BY catalog_number ASC, title ASC
         LIMIT ? OFFSET ?`
      )
      .all(start, end, search, search, pageSize, offset);

    totalRow = db
      .prepare(
        `SELECT COUNT(*) AS total FROM books
         WHERE catalog_number BETWEEN ? AND ?
         AND (title LIKE ? OR author LIKE ?)`
      )
      .get(start, end, search, search);
  } else {
    rows = db
      .prepare(
        `SELECT * FROM books
         WHERE catalog_number BETWEEN ? AND ?
         ORDER BY catalog_number ASC, title ASC
         LIMIT ? OFFSET ?`
      )
      .all(start, end, pageSize, offset);

    totalRow = db
      .prepare("SELECT COUNT(*) AS total FROM books WHERE catalog_number BETWEEN ? AND ?")
      .get(start, end);
  }

  return res.json({
    page,
    pageSize,
    total: totalRow.total,
    items: rows.map(toBookResponse),
  });
});

app.get("/api/books/:id", (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "Invalid id" });
  }

  const row = db.prepare("SELECT * FROM books WHERE id = ?").get(id);
  if (!row) {
    return res.status(404).json({ message: "Book not found" });
  }
  return res.json(toBookResponse(row));
});

app.post("/api/borrow-requests", authenticate, authorizeRole("user"), (req, res) => {
  const schema = z.object({
    bookId: z.number().int().positive(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid input", issues: parsed.error.issues });
  }

  const book = db.prepare("SELECT id FROM books WHERE id = ?").get(parsed.data.bookId);
  if (!book) {
    return res.status(404).json({ message: "Book not found" });
  }

  const existingPending = db
    .prepare(
      "SELECT id FROM borrow_requests WHERE user_id = ? AND book_id = ? AND status = 'pending'"
    )
    .get(req.user.id, parsed.data.bookId);

  if (existingPending) {
    return res.status(409).json({ message: "Request already pending" });
  }

  const result = db
    .prepare("INSERT INTO borrow_requests(user_id, book_id) VALUES (?, ?)")
    .run(req.user.id, parsed.data.bookId);

  return res.status(201).json({ id: result.lastInsertRowid, message: "Borrow request submitted" });
});

app.post("/api/reservations", authenticate, authorizeRole("user"), (req, res) => {
  const schema = z.object({
    bookId: z.number().int().positive(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid input", issues: parsed.error.issues });
  }

  const availability = getBookAvailability(parsed.data.bookId);
  if (!availability) {
    return res.status(404).json({ message: "Book not found" });
  }

  if (availability.availableCopies > 0) {
    return res.status(409).json({ message: "Book is currently available; borrow directly" });
  }

  const existing = db
    .prepare("SELECT id FROM reservations WHERE user_id = ? AND book_id = ? AND status = 'active'")
    .get(req.user.id, parsed.data.bookId);

  if (existing) {
    return res.status(409).json({ message: "Reservation already active" });
  }

  const result = db
    .prepare("INSERT INTO reservations(user_id, book_id) VALUES (?, ?)")
    .run(req.user.id, parsed.data.bookId);

  return res.status(201).json({ id: result.lastInsertRowid, message: "Reservation created" });
});

app.get("/api/me/loans", authenticate, (req, res) => {
  const rows = db
    .prepare(
      `SELECT l.*, b.title, b.author, b.catalog_number
       FROM loans l
       JOIN books b ON b.id = l.book_id
       WHERE l.user_id = ?
       ORDER BY l.created_at DESC`
    )
    .all(req.user.id);
  res.json(rows);
});

app.get("/api/me/notifications", authenticate, (req, res) => {
  const rows = db
    .prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC")
    .all(req.user.id);
  res.json(rows);
});

app.get("/api/admin/books", authenticate, authorizeRole("admin"), (_req, res) => {
  const rows = db.prepare("SELECT * FROM books ORDER BY catalog_number ASC, title ASC").all();
  res.json(rows.map(toBookResponse));
});

app.post("/api/admin/books", authenticate, authorizeRole("admin"), (req, res) => {
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
  const result = db
    .prepare(
      `INSERT INTO books(title, author, catalog_number, total_copies, description)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(data.title, data.author, data.catalogNumber, data.totalCopies, data.description);

  const book = db.prepare("SELECT * FROM books WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json(toBookResponse(book));
});

app.put("/api/admin/books/:id", authenticate, authorizeRole("admin"), (req, res) => {
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

  const found = db.prepare("SELECT id FROM books WHERE id = ?").get(id);
  if (!found) {
    return res.status(404).json({ message: "Book not found" });
  }

  const data = parsed.data;
  db.prepare(
    `UPDATE books
     SET title = ?, author = ?, catalog_number = ?, total_copies = ?, description = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(data.title, data.author, data.catalogNumber, data.totalCopies, data.description, id);

  const updated = db.prepare("SELECT * FROM books WHERE id = ?").get(id);
  res.json(toBookResponse(updated));
});

app.delete("/api/admin/books/:id", authenticate, authorizeRole("admin"), (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "Invalid id" });
  }

  const found = db.prepare("SELECT id FROM books WHERE id = ?").get(id);
  if (!found) {
    return res.status(404).json({ message: "Book not found" });
  }

  db.prepare("DELETE FROM books WHERE id = ?").run(id);
  res.status(204).send();
});

app.get("/api/admin/books/export", authenticate, authorizeRole("admin"), (_req, res) => {
  const rows = db.prepare("SELECT * FROM books ORDER BY catalog_number ASC, title ASC").all();
  res.json({ exportedAt: new Date().toISOString(), items: rows });
});

app.post("/api/admin/books/import", authenticate, authorizeRole("admin"), (req, res) => {
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

  const insertStmt = db.prepare(
    `INSERT INTO books(title, author, catalog_number, total_copies, description)
     VALUES (?, ?, ?, ?, ?)`
  );

  const tx = db.transaction((items) => {
    for (const item of items) {
      insertStmt.run(item.title, item.author, item.catalogNumber, item.totalCopies, item.description);
    }
  });

  tx(parsed.data);
  res.status(201).json({ message: "Import complete", inserted: parsed.data.length });
});

app.get("/api/admin/borrow-requests", authenticate, authorizeRole("admin"), (req, res) => {
  const status = req.query.status ? String(req.query.status) : null;

  let rows;
  if (status && ["pending", "approved", "rejected"].includes(status)) {
    rows = db
      .prepare(
        `SELECT br.*, u.name AS user_name, b.title AS book_title
         FROM borrow_requests br
         JOIN users u ON u.id = br.user_id
         JOIN books b ON b.id = br.book_id
         WHERE br.status = ?
         ORDER BY br.requested_at DESC`
      )
      .all(status);
  } else {
    rows = db
      .prepare(
        `SELECT br.*, u.name AS user_name, b.title AS book_title
         FROM borrow_requests br
         JOIN users u ON u.id = br.user_id
         JOIN books b ON b.id = br.book_id
         ORDER BY br.requested_at DESC`
      )
      .all();
  }

  res.json(rows);
});

app.post("/api/admin/borrow-requests/:id/approve", authenticate, authorizeRole("admin"), (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "Invalid id" });
  }

  const request = db
    .prepare("SELECT * FROM borrow_requests WHERE id = ? AND status = 'pending'")
    .get(id);

  if (!request) {
    return res.status(404).json({ message: "Pending request not found" });
  }

  const availability = getBookAvailability(request.book_id);
  if (!availability || availability.availableCopies <= 0) {
    return res.status(409).json({ message: "No available copies to approve" });
  }

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + BORROW_DAYS_DEFAULT);

  const tx = db.transaction(() => {
    db.prepare(
      "UPDATE borrow_requests SET status = 'approved', admin_id = ?, decided_at = datetime('now') WHERE id = ?"
    ).run(req.user.id, id);

    db.prepare(
      "INSERT INTO loans(user_id, book_id, borrow_request_id, due_date) VALUES (?, ?, ?, ?)"
    ).run(request.user_id, request.book_id, id, dueDate.toISOString());

    db.prepare("INSERT INTO notifications(user_id, message) VALUES (?, ?)").run(
      request.user_id,
      `Your borrow request #${id} has been approved. Due date: ${dueDate.toDateString()}.`
    );
  });

  tx();
  res.json({ message: "Request approved", dueDate: dueDate.toISOString() });
});

app.post("/api/admin/borrow-requests/:id/reject", authenticate, authorizeRole("admin"), (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "Invalid id" });
  }

  const request = db
    .prepare("SELECT * FROM borrow_requests WHERE id = ? AND status = 'pending'")
    .get(id);

  if (!request) {
    return res.status(404).json({ message: "Pending request not found" });
  }

  db.prepare(
    "UPDATE borrow_requests SET status = 'rejected', admin_id = ?, decided_at = datetime('now') WHERE id = ?"
  ).run(req.user.id, id);

  db.prepare("INSERT INTO notifications(user_id, message) VALUES (?, ?)").run(
    request.user_id,
    `Your borrow request #${id} has been rejected.`
  );

  res.json({ message: "Request rejected" });
});

app.get("/api/admin/loans", authenticate, authorizeRole("admin"), (_req, res) => {
  const rows = db
    .prepare(
      `SELECT l.*, u.name AS user_name, b.title AS book_title
       FROM loans l
       JOIN users u ON u.id = l.user_id
       JOIN books b ON b.id = l.book_id
       ORDER BY l.created_at DESC`
    )
    .all();
  res.json(rows);
});

app.post("/api/admin/loans/:id/return", authenticate, authorizeRole("admin"), (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "Invalid id" });
  }

  const loan = db.prepare("SELECT * FROM loans WHERE id = ?").get(id);
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

  const tx = db.transaction(() => {
    db.prepare("UPDATE loans SET returned_at = datetime('now'), late_fee = ? WHERE id = ?").run(fee, id);
    db.prepare("INSERT INTO notifications(user_id, message) VALUES (?, ?)").run(
      loan.user_id,
      fee > 0
        ? `Book returned with overdue fee: ${fee}.`
        : "Book return recorded. No late fee."
    );

    const reservation = db
      .prepare(
        "SELECT * FROM reservations WHERE book_id = ? AND status = 'active' ORDER BY created_at ASC LIMIT 1"
      )
      .get(loan.book_id);

    if (reservation) {
      db.prepare("UPDATE reservations SET status = 'fulfilled' WHERE id = ?").run(reservation.id);
      db.prepare("INSERT INTO notifications(user_id, message) VALUES (?, ?)").run(
        reservation.user_id,
        "A reserved book is now available for you."
      );
    }
  });

  tx();

  res.json({
    message: "Return recorded",
    lateFee: fee,
    overdueDays,
  });
});

app.get("/api/admin/analytics", authenticate, authorizeRole("admin"), (_req, res) => {
  const totals = {
    users: db.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'user'").get().count,
    books: db.prepare("SELECT COUNT(*) AS count FROM books").get().count,
    activeLoans: db
      .prepare("SELECT COUNT(*) AS count FROM loans WHERE returned_at IS NULL")
      .get().count,
    overdueLoans: db
      .prepare("SELECT COUNT(*) AS count FROM loans WHERE returned_at IS NULL AND due_date < datetime('now')")
      .get().count,
    pendingRequests: db
      .prepare("SELECT COUNT(*) AS count FROM borrow_requests WHERE status = 'pending'")
      .get().count,
  };

  const mostBorrowed = db
    .prepare(
      `SELECT b.id, b.title, COUNT(*) AS borrow_count
       FROM loans l
       JOIN books b ON b.id = l.book_id
       GROUP BY b.id, b.title
       ORDER BY borrow_count DESC
       LIMIT 5`
    )
    .all();

  const fees = db.prepare("SELECT COALESCE(SUM(late_fee), 0) AS total FROM loans").get();

  res.json({
    totals,
    totalLateFees: fees.total,
    mostBorrowed,
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`API running on http://localhost:${PORT}`);
  });
}

module.exports = app;
