// V0.9-Crawl-A · Local password auth (Postgres).
// scrypt + lockout + TOTP optional + domain allowlist enforcement.
import { randomUUID, createHash, randomBytes } from "node:crypto";
import type { PoolClient } from "pg";
import { getPool } from "../db/client";
import { isEmailAllowed } from "./domain-allowlist";
import {
  hashPassword,
  verifyPassword,
  passwordPolicyError,
  SCRYPT_PARAMS,
} from "./password";
import { totpVerify } from "./totp";
import type {
  AuthProvider,
  SessionUser,
  SignInResult,
  SignInInput,
} from "./provider";

const SESSION_TTL_HOURS = parseInt(process.env.SESSION_TTL_HOURS ?? "8", 10);
const LOCKOUT_THRESHOLD = parseInt(process.env.LOCKOUT_THRESHOLD ?? "5", 10);
const LOCKOUT_WINDOW_MIN = parseInt(process.env.LOCKOUT_WINDOW_MIN ?? "15", 10);
const LOCKOUT_DURATION_MIN = parseInt(process.env.LOCKOUT_DURATION_MIN ?? "30", 10);

function norm(s: string) {
  return s.trim().toLowerCase();
}

export function sha256Hex(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

export class LocalPasswordAuthProvider implements AuthProvider {
  readonly kind = "local-password" as const;

  async signIn(input: SignInInput): Promise<SignInResult> {
    if (input.kind !== "password") return { ok: false, reason: "wrong_password" };
    const email = norm(input.email);
    if (!(await isEmailAllowed(email))) return { ok: false, reason: "not_allowed" };

    const pool = await getPool();
    const userRes = await pool.query<{
      id: string;
      email: string;
      display_name: string;
      status: string | null;
    }>("SELECT * FROM user_account WHERE email = $1", [email]);
    const user = userRes.rows[0];
    if (!user || user.status === "disabled") return { ok: false, reason: "not_allowed" };

    const credRes = await pool.query<{
      salt: Buffer;
      hash: Buffer;
      params_json: string;
      failed_attempts: number;
      locked_until: number | null;
      last_changed_at: number;
    }>("SELECT * FROM password_credential WHERE user_id = $1", [user.id]);
    const cred = credRes.rows[0];
    if (!cred) return { ok: false, reason: "no_password" };

    // Lockout check
    if (cred.locked_until && Number(cred.locked_until) > Date.now()) {
      return { ok: false, reason: "locked" };
    }

    // Verify
    const saltBuf = Buffer.isBuffer(cred.salt) ? cred.salt : Buffer.from(cred.salt);
    const hashBuf = Buffer.isBuffer(cred.hash) ? cred.hash : Buffer.from(cred.hash);
    const params = cred.params_json ? JSON.parse(cred.params_json) : SCRYPT_PARAMS;
    const ok = verifyPassword(input.password, saltBuf, hashBuf, params);
    if (!ok) {
      const nextAttempts = (cred.failed_attempts ?? 0) + 1;
      const lock =
        nextAttempts >= LOCKOUT_THRESHOLD
          ? Date.now() + LOCKOUT_DURATION_MIN * 60_000
          : null;
      await pool.query(
        "UPDATE password_credential SET failed_attempts = $1, locked_until = $2 WHERE user_id = $3",
        [nextAttempts, lock, user.id],
      );
      return { ok: false, reason: lock ? "locked" : "wrong_password" };
    }

    // TOTP check (only if user has a verified TOTP secret)
    const totpRes = await pool.query<{ secret_base32: string }>(
      "SELECT secret_base32 FROM totp_secret WHERE user_id = $1 AND verified = TRUE",
      [user.id],
    );
    const totp = totpRes.rows[0];
    if (totp) {
      if (!input.totpCode) return { ok: false, reason: "totp_required" };
      if (!totpVerify(totp.secret_base32, input.totpCode)) {
        return { ok: false, reason: "totp_invalid" };
      }
    }

    // Reset lockout counters
    await pool.query(
      "UPDATE password_credential SET failed_attempts = 0, locked_until = NULL WHERE user_id = $1",
      [user.id],
    );

    // Issue session
    const roleRes = await pool.query<{ role: string }>(
      "SELECT role FROM role_mapping WHERE user_id = $1 ORDER BY granted_at DESC LIMIT 1",
      [user.id],
    );
    const role = roleRes.rows[0]?.role ?? "viewer";
    const token = randomUUID();
    const now = Date.now();
    await pool.query(
      "INSERT INTO session (id, user_id, expires_at, created_at, last_seen_at) VALUES ($1, $2, $3, $4, $5)",
      [token, user.id, now + SESSION_TTL_HOURS * 60 * 60 * 1000, now, now],
    );

    return {
      ok: true,
      sessionToken: token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: role as SessionUser["role"],
      },
    };
  }

  async resolveSession(token: string | undefined): Promise<SessionUser | null> {
    if (!token) return null;
    const pool = await getPool();
    const res = await pool.query<{
      user_id: string;
      expires_at: number;
      email: string;
      display_name: string;
      role: string | null;
    }>(
      `SELECT s.user_id, s.expires_at, u.email, u.display_name, rm.role
       FROM session s
       INNER JOIN user_account u ON u.id = s.user_id
       LEFT JOIN role_mapping rm ON rm.user_id = u.id
       WHERE s.id = $1
       ORDER BY rm.granted_at DESC NULLS LAST
       LIMIT 1`,
      [token],
    );
    const row = res.rows[0];
    if (!row) return null;
    if (Number(row.expires_at) < Date.now()) {
      await pool.query("DELETE FROM session WHERE id = $1", [token]);
      return null;
    }
    await pool.query("UPDATE session SET last_seen_at = $1 WHERE id = $2", [
      Date.now(),
      token,
    ]);
    return {
      id: row.user_id,
      email: row.email,
      displayName: row.display_name,
      role: (row.role ?? "viewer") as SessionUser["role"],
    };
  }

  async signOut(token: string | undefined): Promise<void> {
    if (!token) return;
    const pool = await getPool();
    await pool.query("DELETE FROM session WHERE id = $1", [token]);
  }

  async setPasswordFromToken(
    rawToken: string,
    newPassword: string,
  ): Promise<{ ok: true; userId: string } | { ok: false; reason: string }> {
    const policy = passwordPolicyError(newPassword);
    if (policy) return { ok: false, reason: policy };
    const tokenHash = sha256Hex(rawToken);
    const pool = await getPool();

    const tokenRes = await pool.query<{
      user_id: string;
      expires_at: number;
      consumed_at: number | null;
    }>("SELECT user_id, expires_at, consumed_at FROM password_reset_token WHERE token_hash = $1", [
      tokenHash,
    ]);
    const row = tokenRes.rows[0];
    if (!row) return { ok: false, reason: "invalid_token" };
    if (row.consumed_at) return { ok: false, reason: "token_consumed" };
    if (Number(row.expires_at) < Date.now()) return { ok: false, reason: "token_expired" };

    const { salt, hash, algo, params } = hashPassword(newPassword);
    const now = Date.now();

    // Transaction: consume token + upsert credential + activate user
    const client: PoolClient = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "UPDATE password_reset_token SET consumed_at = $1 WHERE token_hash = $2",
        [now, tokenHash],
      );
      const existingRes = await client.query(
        "SELECT user_id FROM password_credential WHERE user_id = $1",
        [row.user_id],
      );
      if ((existingRes.rowCount ?? 0) > 0) {
        await client.query(
          `UPDATE password_credential
           SET algo=$1, salt=$2, hash=$3, params_json=$4, must_rotate=FALSE,
               failed_attempts=0, locked_until=NULL, last_changed_at=$5
           WHERE user_id=$6`,
          [algo, salt, hash, JSON.stringify(params), now, row.user_id],
        );
      } else {
        await client.query(
          `INSERT INTO password_credential
            (user_id, algo, salt, hash, params_json, must_rotate, failed_attempts, last_changed_at, created_at)
           VALUES ($1, $2, $3, $4, $5, FALSE, 0, $6, $7)`,
          [row.user_id, algo, salt, hash, JSON.stringify(params), now, now],
        );
      }
      await client.query("UPDATE user_account SET status = 'active' WHERE id = $1", [
        row.user_id,
      ]);
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }

    return { ok: true, userId: row.user_id };
  }

  async changePassword(
    userId: string,
    current: string,
    next: string,
  ): Promise<{ ok: true } | { ok: false; reason: string }> {
    const policy = passwordPolicyError(next);
    if (policy) return { ok: false, reason: policy };
    const pool = await getPool();
    const credRes = await pool.query<{
      salt: Buffer;
      hash: Buffer;
      params_json: string;
    }>("SELECT salt, hash, params_json FROM password_credential WHERE user_id = $1", [userId]);
    const cred = credRes.rows[0];
    if (!cred) return { ok: false, reason: "no_password" };
    const saltBuf = Buffer.isBuffer(cred.salt) ? cred.salt : Buffer.from(cred.salt);
    const hashBuf = Buffer.isBuffer(cred.hash) ? cred.hash : Buffer.from(cred.hash);
    const params = cred.params_json ? JSON.parse(cred.params_json) : SCRYPT_PARAMS;
    if (!verifyPassword(current, saltBuf, hashBuf, params)) {
      return { ok: false, reason: "wrong_current" };
    }
    const { salt, hash, algo, params: newParams } = hashPassword(next);
    await pool.query(
      `UPDATE password_credential
       SET algo=$1, salt=$2, hash=$3, params_json=$4, failed_attempts=0, locked_until=NULL, last_changed_at=$5
       WHERE user_id=$6`,
      [algo, salt, hash, JSON.stringify(newParams), Date.now(), userId],
    );
    return { ok: true };
  }
}

// ─── Invite helpers (used by /api/admin/users/invite + /api/admin/users/[id]/reset) ──
export async function createInviteToken(
  userId: string,
  ttlHours = 72,
): Promise<{ rawToken: string; expiresAt: number }> {
  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = sha256Hex(rawToken);
  const now = Date.now();
  const expiresAt = now + ttlHours * 60 * 60 * 1000;
  const pool = await getPool();
  await pool.query(
    "INSERT INTO password_reset_token (token_hash, user_id, expires_at, created_at) VALUES ($1, $2, $3, $4)",
    [tokenHash, userId, expiresAt, now],
  );
  return { rawToken, expiresAt };
}

let _provider: LocalPasswordAuthProvider | null = null;
export function getLocalPasswordProvider(): LocalPasswordAuthProvider {
  if (!_provider) _provider = new LocalPasswordAuthProvider();
  return _provider;
}
