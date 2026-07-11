import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const users = await prisma.user.findMany();
    console.log('Successfully queried users:', users);
  } catch (error) {
    console.error('Error querying users:', error);
  }
}

main().finally(() => prisma.$disconnect());
