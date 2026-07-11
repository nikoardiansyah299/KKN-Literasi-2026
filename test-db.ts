import { prisma } from './src/lib/prisma';

async function main() {
  try {
    const version = await prisma.$queryRawUnsafe('SELECT version()');
    console.log('PostgreSQL Version:', version);

    // Check if we are in pg_bouncer or have prepared statements issues
    const settings = await prisma.$queryRawUnsafe("SELECT name, setting FROM pg_settings WHERE name = 'max_connections'");
    console.log('Settings:', settings);

    // Let's run a query on pg_catalog to see if pg_catalog is readable
    const catalogTest = await prisma.$queryRawUnsafe('SELECT nspname FROM pg_catalog.pg_namespace LIMIT 5');
    console.log('Catalog namespaces:', catalogTest);
  } catch (error) {
    console.error('Error running test queries:', error);
  }
}

main().finally(() => prisma.$disconnect());
