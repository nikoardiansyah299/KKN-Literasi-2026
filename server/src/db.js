const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

function getPrismaConnectionString() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required for Prisma");
  }

  const url = new URL(connectionString);
  const sslMode = url.searchParams.get("sslmode");

  if (sslMode === "prefer" || sslMode === "require") {
    url.searchParams.set("sslmode", "no-verify");
  }

  return url.toString();
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: getPrismaConnectionString(),
    max: 3,
  }),
});

function formatCatalogNumber(number) {
  return String(number).padStart(3, "0");
}

function isQuerySql(sql) {
  return /^\s*(SELECT|WITH)/i.test(sql) || /\bRETURNING\b/i.test(sql);
}

async function query(sql, params = []) {
  if (isQuerySql(sql)) {
    const rows = await prisma.$queryRawUnsafe(sql, ...params);
    return {
      rows,
      rowCount: rows.length,
      lastInsertId: rows[0] && rows[0].id ? Number(rows[0].id) : undefined,
    };
  }

  const rowCount = await prisma.$executeRawUnsafe(sql, ...params);
  return {
    rows: [],
    rowCount,
  };
}

async function transaction(work) {
  return prisma.$transaction(async (tx) => {
    const transactionalQuery = async (sql, params = []) => {
      if (isQuerySql(sql)) {
        const rows = await tx.$queryRawUnsafe(sql, ...params);
        return {
          rows,
          rowCount: rows.length,
          lastInsertId: rows[0] && rows[0].id ? Number(rows[0].id) : undefined,
        };
      }

      const rowCount = await tx.$executeRawUnsafe(sql, ...params);
      return {
        rows: [],
        rowCount,
      };
    };

    return work({ query: transactionalQuery });
  });
}

async function initializeDatabase() {
  const statements = [
    `CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS books (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      catalog_number INTEGER NOT NULL,
      total_copies INTEGER NOT NULL DEFAULT 1,
      description TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS borrow_requests (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      book_id INTEGER NOT NULL REFERENCES books(id),
      status TEXT NOT NULL DEFAULT 'pending',
      requested_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      decided_at TIMESTAMPTZ,
      admin_id INTEGER REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS loans (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      book_id INTEGER NOT NULL REFERENCES books(id),
      borrow_request_id INTEGER REFERENCES borrow_requests(id),
      due_date TIMESTAMPTZ NOT NULL,
      returned_at TIMESTAMPTZ,
      late_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS reservations (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      book_id INTEGER NOT NULL REFERENCES books(id),
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      message TEXT NOT NULL,
      read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    "CREATE INDEX IF NOT EXISTS idx_books_catalog_number ON books(catalog_number)",
    "CREATE INDEX IF NOT EXISTS idx_borrow_requests_status ON borrow_requests(status)",
    "CREATE INDEX IF NOT EXISTS idx_loans_due_date ON loans(due_date)",
  ];

  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement);
  }
}

const ready = prisma.$connect().then(initializeDatabase);

async function getBookAvailability(bookId) {
  try {
    const totalCopiesResult = await query(
      "SELECT total_copies FROM books WHERE id = $1",
      [bookId]
    );

    const totalCopiesRow = totalCopiesResult.rows[0];
    if (!totalCopiesRow) {
      return {
        totalCopies: 0,
        activeLoans: 0,
        activeReservations: 0,
        availableCopies: 0,
        status: "unavailable",
      };
    }

    const activeLoansResult = await query(
      "SELECT COUNT(*) AS count FROM loans WHERE book_id = $1 AND returned_at IS NULL",
      [bookId]
    );

    const activeReservationsResult = await query(
      "SELECT COUNT(*) AS count FROM reservations WHERE book_id = $1 AND status = 'active'",
      [bookId]
    );

    const activeLoans = Number(activeLoansResult.rows[0].count);
    const activeReservations = Number(activeReservationsResult.rows[0].count);
    const totalCopies = Number(totalCopiesRow.total_copies);
    const availableCopies = Math.max(totalCopies - activeLoans, 0);

    let status = "available";
    if (availableCopies === 0 && activeReservations > 0) {
      status = "reserved";
    } else if (availableCopies === 0) {
      status = "borrowed";
    }

    return {
      totalCopies,
      activeLoans,
      activeReservations,
      availableCopies,
      status,
    };
  } catch (error) {
    console.error(`Failed to load availability for book ${bookId}:`, error);
    return {
      totalCopies: 0,
      activeLoans: 0,
      activeReservations: 0,
      availableCopies: 0,
      status: "unknown",
    };
  }
}

async function toBookResponse(row) {
  const availability = await getBookAvailability(row.id);
  return {
    ...row,
    catalog_number_label: formatCatalogNumber(Number(row.catalog_number)),
    availability,
  };
}

module.exports = {
  prisma,
  ready,
  query,
  transaction,
  formatCatalogNumber,
  getBookAvailability,
  toBookResponse,
};
