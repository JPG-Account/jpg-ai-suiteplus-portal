// Domain allowlist: gates email-based identity to specific UST domains.
// Patterns live in the auth_allowed_domain table; seeded from env on first boot.
import { getSqlite } from "../db/client";

export function isEmailAllowed(emailRaw: string): boolean {
  const email = emailRaw.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
  const domainPart = "@" + email.split("@")[1];
  const rows = getSqlite().prepare(`SELECT pattern, is_glob FROM auth_allowed_domain`).all() as any[];
  return rows.some((r) => matchPattern(domainPart, r.pattern, !!r.is_glob));
}

function matchPattern(domainWithAt: string, pattern: string, isGlob: boolean): boolean {
  const p = pattern.toLowerCase();
  if (!isGlob) return domainWithAt === p || domainWithAt.endsWith(p);
  // Simple glob: '*' matches any chars
  const re = new RegExp("^" + p.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$");
  return re.test(domainWithAt);
}
