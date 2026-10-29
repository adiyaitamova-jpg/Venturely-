import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __teamiPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __teamiSchema: Promise<void> | undefined;
}

function connectionString() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return url;
}

// Created lazily so `next build` works without a database.
function pool(): Pool {
  return (globalThis.__teamiPool ??= new Pool({
    connectionString: connectionString(),
    max: 5,
    ssl: /localhost|127\.0\.0\.1/.test(connectionString()) ? undefined : { rejectUnauthorized: false },
  }));
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
CREATE TABLE IF NOT EXISTS docs (
  path TEXT PRIMARY KEY,
  data JSONB,
  version INTEGER NOT NULL DEFAULT 1,
  deleted BOOLEAN NOT NULL DEFAULT FALSE,
  updated_by TEXT,
  updated_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS docs_updated_idx ON docs(updated_at);
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  reset_at BIGINT NOT NULL
);
`;

/** Creates tables on first use in each server instance (idempotent). */
export function ensureSchema() {
  return (globalThis.__teamiSchema ??= pool().query(SCHEMA).then(() => undefined).catch((err) => {
    globalThis.__teamiSchema = undefined;
    throw err;
  }));
}

export async function query<T extends Record<string, unknown> = Record<string, unknown>>(text: string, params: unknown[] = []) {
  await ensureSchema();
  return pool().query<T>(text, params);
}
