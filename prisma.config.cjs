// Load environment variables from server/.env first (contains DATABASE_URL
// with sslrootcert path), then fall back to root .env.
require('dotenv').config({ path: 'server/.env' });
require('dotenv').config();

// Prisma Studio's introspection engine runs its own TLS stack and does not
// honour sslmode=no-verify in the connection string. Setting this env var
// here makes the Node.js process (including the Studio engine) accept
// Aiven's self-signed certificate chain without erroring.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Export a plain config object so the Prisma CLI can read the datasource URL
// from the environment.
module.exports = {
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL || '',
  },
};
