require("dotenv").config();

const bcrypt = require("bcryptjs");
const { ready, query } = require("./db");

async function seedUsers() {
  const users = [
    { name: "Library Admin", email: "admin@library.local", password: "admin123", role: "admin" },
    { name: "Sample User", email: "user@library.local", password: "user123", role: "user" },
  ];

  for (const user of users) {
    const existing = (await query("SELECT id FROM users WHERE email = $1", [user.email])).rows[0];
    if (!existing) {
      const hash = bcrypt.hashSync(user.password, 10);
      await query("INSERT INTO users(name, email, password_hash, role) VALUES ($1, $2, $3, $4)", [
        user.name,
        user.email,
        hash,
        user.role,
      ]);
    }
  }
}

async function seedBooks() {
  const books = [
    ["The Knowledge Atlas", "Mira Aditya", 12, 5, "General reference and knowledge map."],
    ["Digital Literacy Basics", "Raka Firmansyah", 35, 3, "Fundamentals of digital citizenship."],
    ["History of Nusantara", "Sinta Wibowo", 109, 4, "A concise regional history overview."],
    ["Practical JavaScript", "Ari Nugraha", 510, 6, "Hands-on web development techniques."],
    ["Modern Data Thinking", "Nadia Putri", 620, 2, "Data-driven decision-making for teams."],
    ["Creative Library Spaces", "Bima Santoso", 745, 2, "Designing engaging reading environments."],
    ["Local Culture Archive", "Dewi Mahendra", 921, 1, "Archival methods for community records."],
  ];

  for (const book of books) {
    const existing = (
      await query("SELECT id FROM books WHERE title = $1 AND author = $2", [book[0], book[1]])
    ).rows[0];

    if (!existing) {
      await query(
        "INSERT INTO books(title, author, catalog_number, total_copies, description) VALUES ($1, $2, $3, $4, $5)",
        book
      );
    }
  }
}

async function run() {
  await ready;
  await seedUsers();
  await seedBooks();
  console.log("Seed complete.");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
