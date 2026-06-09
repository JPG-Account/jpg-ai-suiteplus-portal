#!/usr/bin/env node
// One-shot recovery script — deletes the password_credential row + any
// unconsumed reset tokens for SUPER_ADMIN_EMAIL, so the next admin restart's
// ensure-db.ts bootstrap mints a fresh set-password URL.
//
// Run via cf run-task (NOT cf ssh — this is a real script in the image, runs
// with the same module resolution as the running server):
//
//   cf run-task ust-ai-suiteplus-portal-admin \
//     --name reset-superadmin-pw \
//     --command 'node apps/admin/scripts/reset-super-admin-password.js'
//
//   cf tasks ust-ai-suiteplus-portal-admin | head -3       # wait for SUCCEEDED
//   cf logs  ust-ai-suiteplus-portal-admin --recent | grep RESET
//
// Then `cf restart ust-ai-suiteplus-portal-admin` and watch logs for the new URL.
//
// Why this exists: AUTH_PASSWORD_PEPPER is mixed into every password hash
// (apps/admin/lib/auth/password.ts). If pepper is rotated (e.g. an old deploy
// script ran `openssl rand -hex 32` on every push), all existing hashes become
// unverifiable. Deleting the row triggers the bootstrap path that mints a new
// one-shot reset token.

const { Pool } = require("pg");

function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const raw = process.env.VCAP_SERVICES;
  if (!raw) throw new Error("Neither DATABASE_URL nor VCAP_SERVICES is set");
  const vcap = JSON.parse(raw);
  for (const label of Object.keys(vcap)) {
    for (const svc of vcap[label] || []) {
      const creds = svc.credentials || {};
      const uri = creds.uri || creds.url || creds.write_url || creds.connection_string;
      if (typeof uri === "string" && (uri.startsWith("postgres://") || uri.startsWith("postgresql://"))) {
        return uri;
      }
    }
  }
  throw new Error("No postgres URI found in VCAP_SERVICES");
}

const EMAIL = (process.env.SUPER_ADMIN_EMAIL || "").trim().toLowerCase();
if (!EMAIL) {
  console.error("[RESET] SUPER_ADMIN_EMAIL is not set — refusing to run");
  process.exit(2);
}

(async () => {
  const url = resolveDatabaseUrl();
  const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });

  // Find the user
  const userRes = await pool.query("SELECT id FROM user_account WHERE email = $1", [EMAIL]);
  if (userRes.rowCount === 0) {
    console.error(`[RESET] No user_account row for email=${EMAIL}`);
    await pool.end();
    process.exit(3);
  }
  const userId = userRes.rows[0].id;

  // Delete credential + any unconsumed reset tokens
  const credRes = await pool.query(
    "DELETE FROM password_credential WHERE user_id = $1 RETURNING user_id",
    [userId],
  );
  const tokenRes = await pool.query(
    "DELETE FROM password_reset_token WHERE user_id = $1 AND consumed_at IS NULL RETURNING token_hash",
    [userId],
  );

  console.log(
    `[RESET] email=${EMAIL} user_id=${userId} ` +
      `deleted password_credential=${credRes.rowCount} ` +
      `unconsumed_reset_tokens=${tokenRes.rowCount}`,
  );
  console.log(
    `[RESET] Next: cf restart ust-ai-suiteplus-portal-admin → curl /api/config/current → cf logs --recent | grep set-password`,
  );

  await pool.end();
  process.exit(0);
})().catch((err) => {
  console.error(`[RESET] FAILED: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});
