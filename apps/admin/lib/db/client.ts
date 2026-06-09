// Postgres client — singleton Pool per process.
// Resolves DATABASE_URL from env var (local dev) or VCAP_SERVICES (BTP CF binding).
// Lazy-runs ensureDbReady on first call so BTP containers boot without a separate migrate step.
//
// On BTP free-plan Hyperscaler Postgres: ~4 connection cap.
// SSL self-signed cert tolerated via { rejectUnauthorized: false }.

import { Pool, type PoolConfig } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { ensureDbReady } from "./ensure-db";

let _pool: Pool | null = null;
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _ensured = false;

/**
 * Resolve a Postgres connection URL from env.
 * Priority:
 *   1. DATABASE_URL (local dev or explicit override)
 *   2. VCAP_SERVICES (BTP CF service binding) — scans every label/service
 *      for a credentials object with a `postgres://` or `postgresql://` URI.
 */
function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const vcapRaw = process.env.VCAP_SERVICES;
  if (vcapRaw) {
    try {
      const vcap = JSON.parse(vcapRaw) as Record<string, Array<Record<string, unknown>>>;
      for (const [label, services] of Object.entries(vcap)) {
        for (const svc of services ?? []) {
          const creds = (svc as { credentials?: Record<string, unknown> }).credentials ?? {};
          const candidate =
            (creds.uri as string | undefined) ??
            (creds.url as string | undefined) ??
            (creds.write_url as string | undefined) ??
            (creds.connection_string as string | undefined);
          if (
            typeof candidate === "string" &&
            (candidate.startsWith("postgres://") || candidate.startsWith("postgresql://"))
          ) {
            // Log resolution path for ops debuggability — non-secret.
            // eslint-disable-next-line no-console
            console.log(`[db] resolved DATABASE_URL from VCAP_SERVICES label=${label}`);
            return candidate;
          }
        }
      }
    } catch (err) {
      throw new Error(`Failed to parse VCAP_SERVICES: ${(err as Error).message}`);
    }
  }

  throw new Error(
    "No DATABASE_URL env var and no Postgres binding found in VCAP_SERVICES.",
  );
}

/**
 * Return the singleton Pool. Async-safe: subsequent calls reuse the same Pool.
 * The first caller triggers ensureDbReady (CREATE TABLE IF NOT EXISTS + bootstrap).
 */
export async function getPool(): Promise<Pool> {
  if (_pool) {
    if (!_ensured) {
      await ensureDbReady(_pool);
      _ensured = true;
    }
    return _pool;
  }

  const isProd = process.env.NODE_ENV === "production";
  const config: PoolConfig = {
    connectionString: getDatabaseUrl(),
    // BTP Postgres uses self-signed certs in trust chain; accept for now.
    // For HA production, configure a CA bundle and set rejectUnauthorized: true.
    ssl: isProd ? { rejectUnauthorized: false } : false,
    // Free-plan Hyperscaler caps at ~4 connections. Stay safely under.
    max: 4,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  };

  _pool = new Pool(config);

  // Soft error hook — log but don't crash on transient lost-connection.
  _pool.on("error", (err) => {
    // eslint-disable-next-line no-console
    console.error("[db] pool error (non-fatal):", err.message);
  });

  if (!_ensured) {
    await ensureDbReady(_pool);
    _ensured = true;
  }
  return _pool;
}

/**
 * Return the Drizzle ORM instance bound to the singleton Pool.
 * Most app code should prefer this over raw pool.query() for type safety.
 */
export async function getDb() {
  if (_db) return _db;
  const pool = await getPool();
  _db = drizzle(pool, { schema });
  return _db;
}

export { schema };
