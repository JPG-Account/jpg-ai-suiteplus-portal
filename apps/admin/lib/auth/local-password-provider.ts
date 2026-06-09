// V0.9-Crawl-A · Local password auth.
// scrypt + lockout + TOTP optional + domain allowlist enforcement.
import { randomUUID, createHash, randomBytes } from "node:crypto";
import { getSqlite } from "../db/client";
import { isEmailAllowed } from "./domain-allowlist";
import { hashPassword, verifyPassword, passwordPolicyError, SCRYPT_PARAMS } from "./password";
import { totpVerify } from "./totp";
import type { AuthProvider, SessionUser, SignInResult, SignInInput } from "./provider";

const SESSION_TTL_HOURS = parseInt(process.env.SESSION_TTL_HOURS ?? "8", 10);
const LOCKOUT_THRESHOLD = parseInt(process.env.LOCKOUT_THRESHOLD ?? "5", 10);
const LOCKOUT_WINDOW_MIN = parseInt(process.env.LOCKOUT_WINDOW_MIN ?? "15", 10);
const LOCKOUT_DURATION_MIN = parseInt(process.env.LOCKOUT_DURATION_MIN ?? "30", 10);

function norm(s: string) { return s.trim().toLowerCase(); }

export function sha256Hex(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

export class LocalPasswordAuthProvider implements AuthProvider {
  readonly kind = "local-password" as const;

  async signIn(input: SignInInput): Promise<SignInResult> {
    if (input.kind !== "password") return { ok: false, reason: "wrong_password" };
    const email = norm(input.email);
    if (!isEmailAllowed(email)) return { ok: false, reason: "not_allowed" };

    const db = getSqlite();
    const user = db.prepare(`SELECT * FROM user_account WHERE email = ?`).get(email) as any;
    if (!user || user.status === "disabled") return { ok: false, reason: "not_allowed" };

    const cred = db.prepare(`SELECT * FROM password_credential WHERE user_id = ?`).get(user.id) as any;
    if (!cred) return { ok: false, reason: "no_password" };

    // Lockout check
    if (cred.locked_until && cred.locked_until > Date.now()) {
      return { ok: false, reason: "locked" };
    }

    // Verify
    const saltBuf = Buffer.isBuffer(cred.salt) ? cred.salt : Buffer.from(cred.salt);
    const hashBuf = Buffer.isBuffer(cred.hash) ? cred.hash : Buffer.from(cred.hash);
    const params = cred.params_json ? JSON.parse(cred.params_json) : SCRYPT_PARAMS;
    const ok = verifyPassword(input.password, saltBuf, hashBuf, params);
    if (!ok) {
      const nextAttempts = (cred.failed_attempts ?? 0) + 1;
      const within = (cred.last_changed_at ?? 0) + LOCKOUT_WINDOW_MIN * 60_000; // simplified window
      const lock = nextAttempts >= LOCKOUT_THRESHOLD ? Date.now() + LOCKOUT_DURATION_MIN * 60_000 : null;
      db.prepare(`UPDATE password_credential SET failed_attempts = ?, locked_until = ? WHERE user_id = ?`)
        .run(nextAttempts, lock, user.id);
      return { ok: false, reason: lock ? "locked" : "wrong_password" };
    }

    // TOTP check (only if user has a verified TOTP secret)
    const totp = db.prepare(`SELECT * FROM totp_secret WHERE user_id = ? AND verified = 1`).get(user.id) as any;
    if (totp) {
      if (!input.totpCode) {
        return { ok: false, reason: "totp_required" };
      }
      if (!totpVerify(totp.secret_base32, input.totpCode)) {
        return { ok: false, reason: "totp_invalid" };
      }
    }

    // Reset lockout counters
    db.prepare(`UPDATE password_credential SET failed_attempts = 0, locked_until = NULL WHERE user_id = ?`).run(user.id);

    // Issue session
    const role = (db.prepare(`SELECT role FROM role_mapping WHERE user_id = ? ORDER BY granted_at DESC LIMIT 1`).get(user.id) as any)?.role ?? "viewer";
    const token = randomUUID();
    const now = Date.now();
    db.prepare(`INSERT INTO session (id, user_id, expires_at, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?)`)
      .run(token, user.id, now + SESSION_TTL_HOURS * 60 * 60 * 1000, now, now);

    return {
      ok: true,
      sessionToken: token,
      user: { id: user.id, email: user.email, displayName: user.display_name, role },
    };
  }

  async resolveSession(token: string | undefined): Promise<SessionUser | null> {
    if (!token) return null;
    const db = getSqlite();
    const row = db.prepare(`
      SELECT s.user_id, s.expires_at, u.email, u.display_name, rm.role
      FROM session s
      INNER JOIN user_account u ON u.id = s.user_id
      LEFT JOIN role_mapping rm ON rm.user_id = u.id
      WHERE s.id = ?
      ORDER BY rm.granted_at DESC
      LIMIT 1
    `).get(token) as any;
    if (!row) return null;
    if (row.expires_at < Date.now()) {
      db.prepare(`DELETE FROM session WHERE id = ?`).run(token);
      return null;
    }
    db.prepare(`UPDATE session SET last_seen_at = ? WHERE id = ?`).run(Date.now(), token);
    return { id: row.user_id, email: row.email, displayName: row.display_name, role: row.role ?? "viewer" };
  }

  async signOut(token: string | undefined): Promise<void> {
    if (!token) return;
    getSqlite().prepare(`DELETE FROM session WHERE id = ?`).run(token);
  }

  async setPasswordFromToken(rawToken: string, newPassword: string): Promise<{ ok: true; userId: string } | { ok: false; reason: string }> {
    const policy = passwordPolicyError(newPassword);
    if (policy) return { ok: false, reason: policy };
    const tokenHash = sha256Hex(rawToken);
    const db = getSqlite();
    const row = db.prepare(`SELECT * FROM password_reset_token WHERE token_hash = ?`).get(tokenHash) as any;
    if (!row) return { ok: false, reason: "invalid_token" };
    if (row.consumed_at) return { ok: false, reason: "token_consumed" };
    if (row.expires_at < Date.now()) return { ok: false, reason: "token_expired" };

    const { salt, hash, algo, params } = hashPassword(newPassword);
    const now = Date.now();
    const txn = db.transaction(() => {
      db.prepare(`UPDATE password_reset_token SET consumed_at = ? WHERE token_hash = ?`).run(now, tokenHash);
      const existing = db.prepare(`SELECT user_id FROM password_credential WHERE user_id = ?`).get(row.user_id);
      if (existing) {
        db.prepare(`UPDATE password_credential SET algo=?, salt=?, hash=?, params_json=?, must_rotate=0, failed_attempts=0, locked_until=NULL, last_changed_at=? WHERE user_id=?`)
          .run(algo, salt, hash, JSON.stringify(params), now, row.user_id);
      } else {
        db.prepare(`INSERT INTO password_credential (user_id, algo, salt, hash, params_json, must_rotate, failed_attempts, last_changed_at, created_at) VALUES (?, ?, ?, ?, ?, 0, 0, ?, ?)`)
          .run(row.user_id, algo, salt, hash, JSON.stringify(params), now, now);
      }
      db.prepare(`UPDATE user_account SET status = 'active' WHERE id = ?`).run(row.user_id);
    });
    txn();
    return { ok: true, userId: row.user_id };
  }

  async changePassword(userId: string, current: string, next: string): Promise<{ ok: true } | { ok: false; reason: string }> {
    const policy = passwordPolicyError(next);
    if (policy) return { ok: false, reason: policy };
    const db = getSqlite();
    const cred = db.prepare(`SELECT * FROM password_credential WHERE user_id = ?`).get(userId) as any;
    if (!cred) return { ok: false, reason: "no_password" };
    const saltBuf = Buffer.isBuffer(cred.salt) ? cred.salt : Buffer.from(cred.salt);
    const hashBuf = Buffer.isBuffer(cred.hash) ? cred.hash : Buffer.from(cred.hash);
    const params = cred.params_json ? JSON.parse(cred.params_json) : SCRYPT_PARAMS;
    if (!verifyPassword(current, saltBuf, hashBuf, params)) {
      return { ok: false, reason: "wrong_current" };
    }
    const { salt, hash, algo, params: newParams } = hashPassword(next);
    db.prepare(`UPDATE password_credential SET algo=?, salt=?, hash=?, params_json=?, failed_attempts=0, locked_until=NULL, last_changed_at=? WHERE user_id=?`)
      .run(algo, salt, hash, JSON.stringify(newParams), Date.now(), userId);
    // Invalidate other sessions
    return { ok: true };
  }
}

// ─── Invite helpers (used by /api/admin/users/invite + /api/admin/users/[id]/reset) ──
export function createInviteToken(db: ReturnType<typeof getSqlite>, userId: string, ttlHours = 72): { rawToken: string; expiresAt: number } {
  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = sha256Hex(rawToken);
  const now = Date.now();
  const expiresAt = now + ttlHours * 60 * 60 * 1000;
  db.prepare(`INSERT INTO password_reset_token (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)`)
    .run(tokenHash, userId, expiresAt, now);
  return { rawToken, expiresAt };
}

let _provider: LocalPasswordAuthProvider | null = null;
export function getLocalPasswordProvider(): LocalPasswordAuthProvider {
  if (!_provider) _provider = new LocalPasswordAuthProvider();
  return _provider;
}
