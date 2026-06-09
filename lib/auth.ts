/**
 * Tiny stateless session for the single-user password gate.
 *
 * On successful login we set an httpOnly cookie containing a value signed with
 * AUTH_SECRET (HMAC-SHA256). Uses the Web Crypto API so it runs in both the
 * Edge middleware and Node route handlers.
 */

export const SESSION_COOKIE = "cc_session";
const SESSION_PAYLOAD = "authenticated";
// 30 days
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

function getSecret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("Missing AUTH_SECRET environment variable.");
  return s;
}

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmac(message: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return toHex(sig);
}

/** Constant-time-ish string compare. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Create the cookie value for an authenticated session. */
export async function createSessionToken(): Promise<string> {
  const sig = await hmac(SESSION_PAYLOAD, getSecret());
  return `${SESSION_PAYLOAD}.${sig}`;
}

/** Validate a cookie value produced by createSessionToken. */
export async function verifySessionToken(
  token: string | undefined,
): Promise<boolean> {
  if (!token) return false;
  const idx = token.lastIndexOf(".");
  if (idx <= 0) return false;
  const payload = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  if (payload !== SESSION_PAYLOAD) return false;
  const expected = await hmac(SESSION_PAYLOAD, getSecret());
  return safeEqual(sig, expected);
}

/** Check a submitted password against APP_PASSWORD (constant-time). */
export function checkPassword(submitted: string): boolean {
  const expected = process.env.APP_PASSWORD;
  if (!expected) throw new Error("Missing APP_PASSWORD environment variable.");
  return safeEqual(submitted, expected);
}
