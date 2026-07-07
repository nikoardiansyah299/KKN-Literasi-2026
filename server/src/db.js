const path = require("path");
const Database = require("better-sqlite3");

const dbPath = path.join(__dirname, "..", "data", "library.db");
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'user')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS books (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  catalog_number INTEGER NOT NULL CHECK(catalog_number BETWEEN 0 AND 999),
  total_copies INTEGER NOT NULL DEFAULT 1 CHECK(total_copies >= 0),
  description TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS borrow_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  book_id INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  requested_at TEXT NOT NULL DEFAULT (datetime('now')),
  decided_at TEXT,
  admin_id INTEGER,
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(book_id) REFERENCES books(id),
  FOREIGN KEY(admin_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS loans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  book_id INTEGER NOT NULL,
  borrow_request_id INTEGER,
  due_date TEXT NOT NULL,
  returned_at TEXT,
  late_fee REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(book_id) REFERENCES books(id),
  FOREIGN KEY(borrow_request_id) REFERENCES borrow_requests(id)
);

CREATE TABLE IF NOT EXISTS reservations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  book_id INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('active', 'fulfilled', 'cancelled')) DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(book_id) REFERENCES books(id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  message TEXT NOT NULL,
  read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_books_catalog_number ON books(catalog_number);
CREATE INDEX IF NOT EXISTS idx_borrow_requests_status ON borrow_requests(status);
CREATE INDEX IF NOT EXISTS idx_loans_due_date ON loans(due_date);
`);

function formatCatalogNumber(number) {
  return String(number).padStart(3, "0");
}

function getBookAvailability(bookId) {
  const totalCopiesRow = db
    .prepare("SELECT total_copies FROM books WHERE id = ?")
    .get(bookId);

  if (!totalCopiesRow) {
    return null;
  }

  const activeLoans = db
    .prepare("SELECT COUNT(*) AS count FROM loans WHERE book_id = ? AND returned_at IS NULL")
    .get(bookId).count;

  const activeReservations = db
    .prepare("SELECT COUNT(*) AS count FROM reservations WHERE book_id = ? AND status = 'active'")
    .get(bookId).count;

  const availableCopies = Math.max(totalCopiesRow.total_copies - activeLoans, 0);

  let status = "available";
  if (availableCopies === 0 && activeReservations > 0) {
    status = "reserved";
  } else if (availableCopies === 0) {
    status = "borrowed";
  }

  return {
    totalCopies: totalCopiesRow.total_copies,
    activeLoans,
    activeReservations,
    availableCopies,
    status,
  };
}

function toBookResponse(row) {
  const availability = getBookAvailability(row.id);
  return {
    ...row,
    catalog_number_label: formatCatalogNumber(row.catalog_number),
    availability,
  };
}

module.exports = {
  db,
  formatCatalogNumber,
  getBookAvailability,
  toBookResponse,
};
