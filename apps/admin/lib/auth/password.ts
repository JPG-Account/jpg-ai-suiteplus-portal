// scrypt password hashing via node:crypto · zero new deps · Alpine-safe.
// Params chosen for ~50–100ms per verify on a small CF dyno (admin-only RPS).
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SCRYPT_N = 1 << 15; // 32768
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LEN = 64;
const SALT_LEN = 16;

export const SCRYPT_PARAMS = { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, keylen: KEY_LEN };

const PEPPER = process.env.AUTH_PASSWORD_PEPPER ?? "";

export function hashPassword(password: string): { salt: Buffer; hash: Buffer; algo: "scrypt"; params: typeof SCRYPT_PARAMS } {
  if (password.length === 0) throw new Error("password_empty");
  if (password.length > 128) throw new Error("password_too_long");
  const salt = randomBytes(SALT_LEN);
  const hash = scryptSync(password + PEPPER, salt, KEY_LEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: 64 * 1024 * 1024 });
  return { salt, hash, algo: "scrypt", params: SCRYPT_PARAMS };
}

export function verifyPassword(password: string, salt: Buffer, expected: Buffer, params?: typeof SCRYPT_PARAMS | null): boolean {
  if (password.length === 0 || password.length > 128) return false;
  const p = params ?? SCRYPT_PARAMS;
  let candidate: Buffer;
  try {
    candidate = scryptSync(password + PEPPER, salt, p.keylen ?? KEY_LEN, { N: p.N, r: p.r, p: p.p, maxmem: 64 * 1024 * 1024 });
  } catch {
    return false;
  }
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

// Lightweight common-password block.
const COMMON_PASSWORDS = new Set([
  "password", "password1", "password123", "12345678", "123456789", "1234567890",
  "qwerty", "qwerty123", "letmein", "welcome", "admin", "admin123", "iloveyou",
  "abc12345", "passw0rd", "p@ssword", "p@ssw0rd", "monkey", "dragon",
]);

export function passwordPolicyError(password: string): string | null {
  if (password.length < 12) return "Password must be at least 12 characters.";
  if (password.length > 128) return "Password too long (max 128).";
  if (COMMON_PASSWORDS.has(password.toLowerCase())) return "That password is too common.";
  return null;
}
