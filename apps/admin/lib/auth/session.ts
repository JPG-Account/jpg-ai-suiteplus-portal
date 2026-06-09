// Session helpers — read cookie, resolve user, write/clear cookie.
import { cookies } from "next/headers";
import { getAuthProvider } from "./factory";
import { SESSION_COOKIE } from "./cookie-name";
import type { SessionUser } from "./provider";

export { SESSION_COOKIE };
const SESSION_MAX_AGE_S = 8 * 60 * 60; // 8h

export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  return getAuthProvider().resolveSession(token);
}

export function setSessionCookie(token: string) {
  cookies().set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_S,
    secure: process.env.NODE_ENV === "production",
  });
}

export function clearSessionCookie() {
  cookies().delete(SESSION_COOKIE);
}
