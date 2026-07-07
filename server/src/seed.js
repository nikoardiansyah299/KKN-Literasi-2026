const bcrypt = require("bcryptjs");
const { db } = require("./db");

function seedUsers() {
  const users = [
    { name: "Library Admin", email: "admin@library.local", password: "admin123", role: "admin" },
    { name: "Sample User", email: "user@library.local", password: "user123", role: "user" },
  ];

  const insertUser = db.prepare(
    "INSERT INTO users(name, email, password_hash, role) VALUES (?, ?, ?, ?)"
  );

  for (const user of users) {
    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(user.email);
    if (!existing) {
      const hash = bcrypt.hashSync(user.password, 10);
      insertUser.run(user.name, user.email, hash, user.role);
    }
  }
}

function seedBooks() {
  const books = [
    ["The Knowledge Atlas", "Mira Aditya", 12, 5, "General reference and knowledge map."],
    ["Digital Literacy Basics", "Raka Firmansyah", 35, 3, "Fundamentals of digital citizenship."],
    ["History of Nusantara", "Sinta Wibowo", 109, 4, "A concise regional history overview."],
    ["Practical JavaScript", "Ari Nugraha", 510, 6, "Hands-on web development techniques."],
    ["Modern Data Thinking", "Nadia Putri", 620, 2, "Data-driven decision-making for teams."],
    ["Creative Library Spaces", "Bima Santoso", 745, 2, "Designing engaging reading environments."],
    ["Local Culture Archive", "Dewi Mahendra", 921, 1, "Archival methods for community records."],
  ];

  const insertBook = db.prepare(
    "INSERT INTO books(title, author, catalog_number, total_copies, description) VALUES (?, ?, ?, ?, ?)"
  );

  for (const book of books) {
    const existing = db
      .prepare("SELECT id FROM books WHERE title = ? AND author = ?")
      .get(book[0], book[1]);
    if (!existing) {
      insertBook.run(...book);
    }
  }
}

seedUsers();
seedBooks();

console.log("Seed complete.");
