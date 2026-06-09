#!/usr/bin/env node
// One-shot identity fix:
//   1) Rename existing super-admin user (id='u_super_admin') to PRIMARY_EMAIL
//   2) If SECOND_EMAIL set, create a second super-admin user + mint a fresh
//      password_reset_token for it and print the set-password URL.
//
// Idempotent: safe to re-run. Uses ON CONFLICT to avoid duplicate inserts.
//
// Run via cf run-task:
//   cf run-task ust-ai-suiteplus-portal-admin \
//     --name fix-super-admin-identities \
//     --command 'cd /app && PRIMARY_EMAIL=johnpatrick.galido@ust.com SECOND_EMAIL=johnpatrick.galido@ust-global.com node apps/admin/scripts/fix-super-admin-identities.js'

const { Pool } = require("pg");
const { randomBytes, randomUUID, createHash } = require("crypto");

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

const PRIMARY_EMAIL = (process.env.PRIMARY_EMAIL || "").trim().toLowerCase();
const SECOND_EMAIL = (process.env.SECOND_EMAIL || "").trim().toLowerCase();
const ADMIN_BASE_URL =
  process.env.ADMIN_BASE_URL ||
  "https://ust-ai-suiteplus-portal-admin.cfapps.us10-001.hana.ondemand.com";

if (!PRIMARY_EMAIL) {
  console.error("[FIX] PRIMARY_EMAIL env var is required");
  process.exit(2);
}

(async () => {
  const url = resolveDatabaseUrl();
  const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });
  const now = Date.now();

  // ─── 1) Rename existing super admin ────────────────────────────────
  const r1 = await pool.query(
    `UPDATE user_account
     SET email = $1, display_name = COALESCE(display_name, 'Super Admin')
     WHERE id = 'u_super_admin'
     RETURNING id, email`,
    [PRIMARY_EMAIL],
  );
  if (r1.rowCount === 0) {
    console.error("[FIX] No user_account row with id='u_super_admin' — was seedFreshDb skipped?");
    await pool.end();
    process.exit(3);
  }
  console.log(`[FIX] Renamed u_super_admin → email=${r1.rows[0].email}`);

  // ─── 2) Ensure second super admin if requested ─────────────────────
  // Idempotent: handles both "this email is new" AND "user already exists
  // (e.g. created via admin UI's New user button)" cases.
  if (SECOND_EMAIL && SECOND_EMAIL !== PRIMARY_EMAIL) {
    // Lookup by email first — user may have been created via UI with a different id
    const existingRes = await pool.query(
      "SELECT id, display_name FROM user_account WHERE email = $1",
      [SECOND_EMAIL],
    );

    let userId;
    if (existingRes.rowCount > 0) {
      userId = existingRes.rows[0].id;
      console.log(`[FIX] User with email=${SECOND_EMAIL} already exists (id=${userId}, display='${existingRes.rows[0].display_name}') — adopting that row`);
    } else {
      userId = "u_super_admin_2";
      await pool.query(
        `INSERT INTO user_account (id, email, display_name, created_at)
         VALUES ($1, $2, $3, $4)`,
        [userId, SECOND_EMAIL, "Super Admin (ust-global)", now],
      );
      console.log(`[FIX] Created new user id=${userId} email=${SECOND_EMAIL}`);
    }

    // Ensure super_admin role exists for this user (idempotent)
    const roleRes = await pool.query(
      "SELECT 1 FROM role_mapping WHERE user_id = $1 AND role = 'super_admin'",
      [userId],
    );
    if (roleRes.rowCount === 0) {
      await pool.query(
        "INSERT INTO role_mapping (id, user_id, role, granted_at) VALUES ($1, $2, 'super_admin', $3)",
        [randomUUID(), userId, now],
      );
      console.log(`[FIX] Granted super_admin role to user_id=${userId}`);
    } else {
      console.log(`[FIX] User id=${userId} already has super_admin role`);
    }

    // Check password state — only mint a new token if neither a password nor
    // a live unconsumed token exists. Avoids invalidating a link the user is
    // about to click from the UI's "Reset password" flow.
    const credRes = await pool.query("SELECT 1 FROM password_credential WHERE user_id = $1", [userId]);
    const liveTokenRes = await pool.query(
      "SELECT 1 FROM password_reset_token WHERE user_id = $1 AND consumed_at IS NULL AND expires_at > $2",
      [userId, now],
    );

    if (credRes.rowCount > 0) {
      console.log(`[FIX] User id=${userId} already has a password — done`);
    } else if (liveTokenRes.rowCount > 0) {
      console.log(`[FIX] User id=${userId} has a LIVE unconsumed set-password token — not minting a new one`);
      console.log(`[FIX] If you've lost that link, re-run with FORCE_MINT_TOKEN=true`);
    } else if (process.env.FORCE_MINT_TOKEN === "true" || liveTokenRes.rowCount === 0) {
      // Wipe any expired/consumed tokens (clean slate) then mint fresh
      if (process.env.FORCE_MINT_TOKEN === "true") {
        await pool.query(
          "DELETE FROM password_reset_token WHERE user_id = $1 AND consumed_at IS NULL",
          [userId],
        );
      }
      const rawToken = randomBytes(32).toString("base64url");
      const tokenHash = createHash("sha256").update(rawToken).digest("hex");
      const expiresAt = now + 72 * 60 * 60 * 1000;
      await pool.query(
        `INSERT INTO password_reset_token (token_hash, user_id, expires_at, created_at)
         VALUES ($1, $2, $3, $4)`,
        [tokenHash, userId, expiresAt, now],
      );
      console.warn("");
      console.warn("\x1b[33m═══════════════════════════════════════════════════════════════");
      console.warn(`  SECOND SUPER ADMIN PASSWORD SETUP`);
      console.warn(`  Email: ${SECOND_EMAIL}`);
      console.warn(`  Open this URL within 72h to set the password:`);
      console.warn(`  ${ADMIN_BASE_URL}/set-password?token=${rawToken}`);
      console.warn("═══════════════════════════════════════════════════════════════\x1b[0m");
      console.warn("");
    }
  } else {
    console.log("[FIX] SECOND_EMAIL not set (or same as primary) — skipping second user");
  }

  await pool.end();
  console.log("[FIX] Done.");
  process.exit(0);
})().catch((err) => {
  console.error(`[FIX] FAILED: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});
