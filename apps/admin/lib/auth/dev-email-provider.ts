// V0.7 dev-grade auth: email allow-list against SUPER_ADMIN_EMAIL (Postgres).
// Session token = random UUID stored in the `session` table.
// V1 will swap this out for IASOidcAuthProvider; route handlers won't change.

import { getPool } from "../db/client";
import type {
  AuthProvider,
  SessionUser,
  SignInResult,
  SignInInput,
} from "./provider";
import { randomUUID } from "node:crypto";

const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8h

function normalise(email: string) {
  return email.trim().toLowerCase();
}

export class DevEmailAuthProvider implements AuthProvider {
  readonly kind = "dev-email" as const;

  async signIn(input: SignInInput): Promise<SignInResult> {
    const email = normalise(input.email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { ok: false, reason: "invalid_email" };
    }
    const superAdminEmail = normalise(process.env.SUPER_ADMIN_EMAIL ?? "");
    if (email !== superAdminEmail) {
      return { ok: false, reason: "not_allowed" };
    }

    const pool = await getPool();
    const userRes = await pool.query<{ id: string; email: string; display_name: string }>(
      "SELECT id, email, display_name FROM user_account WHERE email = $1",
      [email],
    );
    const user = userRes.rows[0];
    if (!user) return { ok: false, reason: "not_allowed" };

    const roleRes = await pool.query<{ role: string }>(
      "SELECT role FROM role_mapping WHERE user_id = $1 ORDER BY granted_at DESC LIMIT 1",
      [user.id],
    );
    const role = roleRes.rows[0]?.role ?? "viewer";
    if (role !== "super_admin") return { ok: false, reason: "not_allowed" };

    const token = randomUUID();
    const now = Date.now();
    await pool.query(
      "INSERT INTO session (id, user_id, expires_at, created_at, last_seen_at) VALUES ($1, $2, $3, $4, $5)",
      [token, user.id, now + SESSION_TTL_MS, now, now],
    );

    return {
      ok: true,
      sessionToken: token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role,
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
}

let _provider: DevEmailAuthProvider | null = null;
export function getAuthProvider(): DevEmailAuthProvider {
  if (!_provider) _provider = new DevEmailAuthProvider();
  return _provider;
}
