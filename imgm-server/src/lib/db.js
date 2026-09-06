/**
 * Database Client Singleton
 *
 * Single source of truth for the Prisma client instance.
 * Uses Prisma 7's driver adapter pattern with libsql for SQLite locally.
 * Swap the adapter to PrismaPg for production PostgreSQL — one line change.
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import 'dotenv/config';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });
