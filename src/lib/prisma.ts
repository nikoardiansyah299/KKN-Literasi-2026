import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Load server/.env first (contains DATABASE_URL with sslrootcert), then root .env.
dotenv.config({ path: 'server/.env' });
dotenv.config();

const caEnv = process.env.AIVEN_CA_PEM || process.env.CA_PEM;
const caPath = path.join(process.cwd(), 'server', 'ca.pem');
if (!fs.existsSync(caPath) && caEnv) {
  fs.mkdirSync(path.dirname(caPath), { recursive: true });
  fs.writeFileSync(caPath, caEnv);
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required');
}
// For local development, prefer trusting the Aiven CA via
// `NODE_EXTRA_CA_CERTS=server/ca.pem` when starting Node. Do NOT disable
// TLS verification globally in code (e.g. `NODE_TLS_REJECT_UNAUTHORIZED=0`).

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
