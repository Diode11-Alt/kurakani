import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import * as dotenv from 'dotenv';
import path from 'path';

// Load the root .env file if it exists (mostly for local development)
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is missing');
}

const client = postgres(connectionString, { 
  ssl: connectionString.includes('supabase') || process.env.DATABASE_SSL === 'true' ? 'require' : undefined 
});
export const db = drizzle(client, { schema });
export * as schema from './schema';
