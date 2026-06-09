// Domain allowlist: gates email-based identity to specific UST domains (Postgres).
// Patterns live in the auth_allowed_domain table; seeded from env on first boot.
import { getPool } from "../db/client";

export async function isEmailAllowed(emailRaw: string): Promise<boolean> {
  const email = emailRaw.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
  const domainPart = "@" + email.split("@")[1];
  const pool = await getPool();
  const res = await pool.query<{ pattern: string; is_glob: boolean }>(
    "SELECT pattern, is_glob FROM auth_allowed_domain",
  );
  return res.rows.some((r) => matchPattern(domainPart, r.pattern, !!r.is_glob));
}

function matchPattern(domainWithAt: string, pattern: string, isGlob: boolean): boolean {
  const p = pattern.toLowerCase();
  if (!isGlob) return domainWithAt === p || domainWithAt.endsWith(p);
  // Simple glob: '*' matches any chars
  const re = new RegExp(
    "^" + p.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$",
  );
  return re.test(domainWithAt);
}
