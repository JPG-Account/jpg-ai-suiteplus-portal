// RFC 6238 TOTP · 30-second window · 6-digit code · SHA-1.
// Zero new dependencies — node:crypto.createHmac.
import { createHmac, randomBytes } from "node:crypto";

const STEP_SECONDS = 30;
const DIGITS = 6;
const WINDOW = 1; // accept ±1 step (90s window)

// ─── Base32 (RFC 4648) ────────────────────────────────────────────────
const B32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (let i = 0; i < buf.length; i++) {
    value = (value << 8) | buf[i];
    bits += 8;
    while (bits >= 5) {
      out += B32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(s: string): Buffer {
  const clean = s.replace(/=+$/g, "").toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = B32_ALPHABET.indexOf(ch);
    if (idx < 0) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

// ─── TOTP code generation ─────────────────────────────────────────────
function hotp(secret: Buffer, counter: number, digits = DIGITS): string {
  const ctr = Buffer.alloc(8);
  // Write 64-bit big-endian counter
  ctr.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  ctr.writeUInt32BE(counter & 0xffffffff, 4);
  const hmac = createHmac("sha1", secret).update(ctr).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binCode =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  const code = binCode % 10 ** digits;
  return code.toString().padStart(digits, "0");
}

export function totpGenerate(secretBase32: string, nowMs = Date.now()): string {
  const counter = Math.floor(nowMs / 1000 / STEP_SECONDS);
  return hotp(base32Decode(secretBase32), counter);
}

export function totpVerify(secretBase32: string, code: string, nowMs = Date.now()): boolean {
  const clean = code.trim().replace(/\s+/g, "");
  if (!/^\d{6}$/.test(clean)) return false;
  const counter = Math.floor(nowMs / 1000 / STEP_SECONDS);
  const secret = base32Decode(secretBase32);
  for (let i = -WINDOW; i <= WINDOW; i++) {
    if (hotp(secret, counter + i) === clean) return true;
  }
  return false;
}

export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20)); // 160 bits
}

export function otpauthUri(account: string, secretBase32: string, issuer = "Suite+ Admin"): string {
  const enc = (s: string) => encodeURIComponent(s);
  return `otpauth://totp/${enc(issuer)}:${enc(account)}?secret=${secretBase32}&issuer=${enc(issuer)}&algorithm=SHA1&digits=6&period=30`;
}
