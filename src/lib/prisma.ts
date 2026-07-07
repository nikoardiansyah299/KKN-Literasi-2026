import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Load server/.env first (contains DATABASE_URL with sslrootcert), then root .env.
dotenv.config({ path: 'server/.env' });
dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required');
}

// Development convenience: allow self-signed certs locally only.
if (process.env.NODE_ENV !== 'production') {
  // eslint-disable-next-line no-process-env
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = process.env.NODE_TLS_REJECT_UNAUTHORIZED ?? '0';
  console.warn('Warning: NODE_TLS_REJECT_UNAUTHORIZED=0 set for development (insecure)');
}

// In development only: allow self-signed certificates from the DB host
// (useful for hosted dev DBs with self-signed chains). Do NOT enable in production.
// NOTE: Do not disable TLS verification globally here. If you need to
// accept self-signed certs for one-off local commands (e.g. `prisma db push`),
// set `NODE_TLS_REJECT_UNAUTHORIZED=0` only for that command in your shell.

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
