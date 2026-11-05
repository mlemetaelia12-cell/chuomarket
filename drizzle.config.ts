import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

const databaseUrl = process.env.MIGRATION_DATABASE_URL;

if (!databaseUrl) {
  throw new Error('MIGRATION_DATABASE_URL is required for Drizzle commands. Set it to a non-production database unless a reviewed production release is intended.');
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
  strict: true,
  verbose: true,
});