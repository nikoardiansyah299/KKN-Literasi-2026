import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Load server/.env first (contains DATABASE_URL with sslrootcert), then root .env.
dotenv.config({ path: 'server/.env' });
dotenv.config();

const rawConnectionString = process.env.DATABASE_URL;

if (!rawConnectionString) {
  console.warn('DATABASE_URL is not set; Prisma will be initialized with the raw value if available.');
}

const connectionString = (() => {
  try {
    const url = new URL(rawConnectionString || 'postgres://localhost:5432/postgres');
    if (process.env.VERCEL === '1') {
      url.searchParams.set('sslmode', 'no-verify');
    }
    // Limit connection pool size to avoid exceeding DB connections on serverless
    url.searchParams.set('connection_limit', '5');
    return url.toString();
  } catch {
    return rawConnectionString || 'postgres://localhost:5432/postgres';
  }
})();

// In development only: allow self-signed certificates from the DB host
// (useful for hosted dev DBs with self-signed chains). Do NOT enable in production.
// NOTE: Do not disable TLS verification globally here. If you need to
// accept self-signed certs for one-off local commands (e.g. `prisma db push`),
// set `NODE_TLS_REJECT_UNAUTHORIZED=0` only for that command in your shell.

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const prismaClient = globalForPrisma.prisma ?? new PrismaClient({
  adapter: new PrismaPg({ connectionString, max: 3 }),
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prismaClient;
}

export const prisma = prismaClient;
