// Run `pnpm db:migrate` to create the SQLite schema.
import Database from "better-sqlite3";
import { CREATE_TABLES_SQL } from "../lib/db/migrate-sql";
import path from "node:path";
import fs from "node:fs";

const DB_DIR = path.resolve(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "suite-plus.sqlite");

fs.mkdirSync(DB_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("synchronous = NORMAL");
db.pragma("foreign_keys = ON");

db.exec(CREATE_TABLES_SQL);
console.log(`✓ Schema applied at ${DB_PATH}`);

const tables = db
  .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`)
  .all();
console.log(`  Tables: ${tables.map((r: any) => r.name).join(", ")}`);

db.close();
