#!/usr/bin/env node
// Diagnostic: list every user_account row + its roles. Read-only.
const { Pool } = require("pg");

function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const raw = process.env.VCAP_SERVICES;
  if (!raw) throw new Error("Neither DATABASE_URL nor VCAP_SERVICES is set");
  const vcap = JSON.parse(raw);
  for (const label of Object.keys(vcap)) {
    for (const svc of vcap[label] || []) {
      const c = svc.credentials || {};
      const uri = c.uri || c.url || c.write_url || c.connection_string;
      if (typeof uri === "string" && (uri.startsWith("postgres://") || uri.startsWith("postgresql://"))) return uri;
    }
  }
  throw new Error("No postgres URI in VCAP_SERVICES");
}

(async () => {
  const pool = new Pool({ connectionString: resolveDatabaseUrl(), ssl: { rejectUnauthorized: false } });
  const r = await pool.query(
    `SELECT u.id, u.email, u.display_name,
            COALESCE(array_agg(rm.role) FILTER (WHERE rm.role IS NOT NULL), '{}') AS roles,
            EXISTS(SELECT 1 FROM password_credential pc WHERE pc.user_id = u.id) AS has_password
     FROM user_account u
     LEFT JOIN role_mapping rm ON rm.user_id = u.id
     GROUP BY u.id, u.email, u.display_name
     ORDER BY u.created_at`,
  );
  console.log("[USERS]");
  for (const row of r.rows) {
    console.log(
      `  id=${row.id} email=${row.email} name='${row.display_name}' roles=[${row.roles.join(",")}] has_password=${row.has_password}`,
    );
  }
  console.log(`[USERS] total=${r.rowCount}`);
  await pool.end();
  process.exit(0);
})().catch((e) => { console.error("[USERS] FAILED:", e.message); process.exit(1); });
