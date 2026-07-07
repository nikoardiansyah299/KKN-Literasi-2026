// Load environment variables from server/.env first (contains DATABASE_URL
// with sslrootcert path), then fall back to root .env.
require('dotenv').config({ path: 'server/.env' });
require('dotenv').config();

// Export a plain config object so the Prisma CLI can read the datasource URL
// from the environment.
module.exports = {
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL || '',
  },
};
