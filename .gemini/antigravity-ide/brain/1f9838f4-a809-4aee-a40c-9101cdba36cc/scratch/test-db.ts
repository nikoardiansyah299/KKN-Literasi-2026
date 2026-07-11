import { prisma } from '../../../src/lib/prisma';

async function main() {
  try {
    const users = await prisma.user.findMany();
    console.log('Successfully queried users:', users);
  } catch (error) {
    console.error('Error querying users:', error);
  }
}

main().finally(() => prisma.$disconnect());
