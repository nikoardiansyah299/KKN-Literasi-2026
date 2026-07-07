import { prisma } from './prisma';
import { hashPassword } from './auth';

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: 'admin@library.local' },
    update: {},
    create: {
      name: 'Library Admin',
      email: 'admin@library.local',
      passwordHash: hashPassword('admin123'),
      role: 'admin',
    },
  });

  const user = await prisma.user.upsert({
    where: { email: 'user@library.local' },
    update: {},
    create: {
      name: 'Sample User',
      email: 'user@library.local',
      passwordHash: hashPassword('user123'),
      role: 'user',
    },
  });

  const books = [
    ['The Knowledge Atlas', 'Mira Aditya', 12, 5, 'General reference and knowledge map.'],
    ['Digital Literacy Basics', 'Raka Firmansyah', 35, 3, 'Fundamentals of digital citizenship.'],
    ['History of Nusantara', 'Sinta Wibowo', 109, 4, 'A concise regional history overview.'],
    ['Practical JavaScript', 'Ari Nugraha', 510, 6, 'Hands-on web development techniques.'],
    ['Modern Data Thinking', 'Nadia Putri', 620, 2, 'Data-driven decision-making for teams.'],
    ['Creative Library Spaces', 'Bima Santoso', 745, 2, 'Designing engaging reading environments.'],
    ['Local Culture Archive', 'Dewi Mahendra', 921, 1, 'Archival methods for community records.'],
  ];

  for (const [title, author, catalogNumber, totalCopies, description] of books) {
    const existing = await prisma.book.findFirst({ where: { title: String(title), author: String(author) } });
    if (!existing) {
      await prisma.book.create({ data: { title: String(title), author: String(author), catalogNumber: Number(catalogNumber), totalCopies: Number(totalCopies), description: String(description) } });
    }
  }

  console.log('Seed complete.', { admin: admin.email, user: user.email });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
