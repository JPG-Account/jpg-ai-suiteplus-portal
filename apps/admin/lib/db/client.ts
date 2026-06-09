// SQLite client — singleton per process. WAL mode for concurrent reads.
// First call lazy-runs migrations + initial seed (idempotent), so BTP CF
// containers can boot without a separate migrate step.
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { ensureDbReady } from "./ensure-db";
import path from "node:path";
import fs from "node:fs";

const DB_DIR = path.resolve(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "suite-plus.sqlite");

let _sqlite: Database.Database | null = null;
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getSqlite() {
  if (_sqlite) return _sqlite;
  fs.mkdirSync(DB_DIR, { recursive: true });
  _sqlite = new Database(DB_PATH);
  _sqlite.pragma("journal_mode = WAL");
  _sqlite.pragma("synchronous = NORMAL");
  _sqlite.pragma("foreign_keys = ON");
  ensureDbReady(_sqlite);
  return _sqlite;
}

export function getDb() {
  if (_db) return _db;
  _db = drizzle(getSqlite(), { schema });
  return _db;
}

export { schema };
