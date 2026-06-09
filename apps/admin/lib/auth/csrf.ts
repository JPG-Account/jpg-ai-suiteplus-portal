// Double-submit CSRF token.
// Cookie `suite_plus_csrf` is set on every authenticated GET; clients echo it
// in `x-csrf-token` for POST/PATCH/PUT/DELETE. Equality check only — no signing.
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";

export const CSRF_COOKIE = "suite_plus_csrf";
export const CSRF_HEADER = "x-csrf-token";

export function getOrCreateCsrfToken(): string {
  const store = cookies();
  const existing = store.get(CSRF_COOKIE)?.value;
  if (existing && /^[a-f0-9]{32,128}$/i.test(existing)) return existing;
  const token = randomBytes(32).toString("hex");
  store.set(CSRF_COOKIE, token, {
    httpOnly: false, // double-submit needs JS-readable
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return token;
}

export function readCsrfFromCookies(): string | null {
  return cookies().get(CSRF_COOKIE)?.value ?? null;
}

// Compare-as-strings. Both sides come from same client; timing-safe not required for double-submit.
export function csrfMatches(headerVal: string | null | undefined, cookieVal: string | null | undefined): boolean {
  if (!headerVal || !cookieVal) return false;
  if (headerVal.length !== cookieVal.length) return false;
  return headerVal === cookieVal;
}
