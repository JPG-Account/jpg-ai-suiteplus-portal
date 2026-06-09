// V0.7 dev-grade auth: email allow-list against SUPER_ADMIN_EMAIL.
// Session token = random UUID stored in the `session` table.
// V1 will swap this out for IASOidcAuthProvider; route handlers won't change.

import { getSqlite } from "../db/client";
import type { AuthProvider, SessionUser, SignInResult, SignInInput } from "./provider";
import { randomUUID } from "node:crypto";

const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8h

function normalise(email: string) {
  return email.trim().toLowerCase();
}

export class DevEmailAuthProvider implements AuthProvider {
  readonly kind = "dev-email" as const;
  async signIn(input: { kind: "email-only"; email: string } | { kind: "password"; email: string; password: string; totpCode?: string }): Promise<SignInResult> {
    const email = normalise(input.email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { ok: false, reason: "invalid_email" };
    }
    const superAdminEmail = normalise(process.env.SUPER_ADMIN_EMAIL ?? "");
    if (email !== superAdminEmail) {
      return { ok: false, reason: "not_allowed" };
    }

    const db = getSqlite();
    const user = db.prepare(`SELECT * FROM user_account WHERE email = ?`).get(email) as any;
    if (!user) return { ok: false, reason: "not_allowed" };

    const role = (db.prepare(`SELECT role FROM role_mapping WHERE user_id = ? ORDER BY granted_at DESC LIMIT 1`).get(user.id) as any)?.role ?? "viewer";
    if (role !== "super_admin") return { ok: false, reason: "not_allowed" };

    const token = randomUUID();
    const now = Date.now();
    db.prepare(`INSERT INTO session (id, user_id, expires_at, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?)`)
      .run(token, user.id, now + SESSION_TTL_MS, now, now);

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
    return {
      id: row.user_id,
      email: row.email,
      displayName: row.display_name,
      role: row.role ?? "viewer",
    };
  }

  async signOut(token: string | undefined): Promise<void> {
    if (!token) return;
    getSqlite().prepare(`DELETE FROM session WHERE id = ?`).run(token);
  }
}

let _provider: DevEmailAuthProvider | null = null;
export function getAuthProvider(): DevEmailAuthProvider {
  if (!_provider) _provider = new DevEmailAuthProvider();
  return _provider;
}
