import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Time-based one time passwords, RFC 6238.
 *
 * Written here rather than pulled from a dependency, because the whole thing is about eighty
 * lines of arithmetic over `node:crypto`, and the RFC publishes test vectors that prove an
 * implementation correct. A dependency for this is a supply chain risk in the authentication
 * path in exchange for saving eighty lines.
 *
 * The tests in totp.test.ts run every published RFC 6238 vector plus the RFC 4648 base32
 * vectors. If those pass, this is right. If they fail, nothing else about the auth flow is
 * worth reading.
 *
 * Two decisions that are not obvious:
 *
 * **SHA-1, not SHA-256.** RFC 6238 permits both, and SHA-1's weaknesses are collision
 * weaknesses that do not apply to HMAC. SHA-1 is what Google Authenticator, Authy, 1Password
 * and every other authenticator actually implement when scanning a QR code, and an algorithm
 * nothing can read is not a security improvement.
 *
 * **A one-step window either side.** Thirty seconds forward and back, so a phone whose clock
 * has drifted slightly still works. Wider than that starts to matter: each extra step is
 * another valid code at any moment.
 */

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** RFC 4648 base32, uppercase, unpadded. Authenticator apps do not use the padding. */
export function base32Encode(input: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of input) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

/**
 * Decodes base32. Padding and lower case are accepted because people retype these by hand,
 * and spaces are stripped because authenticator apps display the secret in groups of four.
 */
export function base32Decode(input: string): Buffer {
  const cleaned = input.toUpperCase().replace(/=+$/, "").replace(/\s+/g, "");

  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (const character of cleaned) {
    const index = BASE32_ALPHABET.indexOf(character);
    if (index === -1) throw new Error(`Not valid base32: ${character}`);

    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(output);
}

export const TOTP_STEP_SECONDS = 30;
export const TOTP_DIGITS = 6;

/**
 * HOTP, RFC 4226. The counter is a 64-bit big-endian integer, and the dynamic truncation at
 * the end is the part everyone gets wrong: the low four bits of the last byte pick an offset,
 * and the high bit of the four bytes read from there is masked off.
 */
export function hotp(secret: Buffer, counter: number, digits = TOTP_DIGITS): string {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));

  const digest = createHmac("sha1", secret).update(buffer).digest();
  const byte = (index: number) => digest[index] ?? 0;

  const offset = byte(digest.length - 1) & 0x0f;

  const binary =
    ((byte(offset) & 0x7f) << 24) |
    ((byte(offset + 1) & 0xff) << 16) |
    ((byte(offset + 2) & 0xff) << 8) |
    (byte(offset + 3) & 0xff);

  return String(binary % 10 ** digits).padStart(digits, "0");
}

/** The code an authenticator would be showing at `atMs`. */
export function totp(
  secret: Buffer | string,
  atMs: number = Date.now(),
  { digits = TOTP_DIGITS, step = TOTP_STEP_SECONDS } = {},
): string {
  const key = typeof secret === "string" ? base32Decode(secret) : secret;
  return hotp(key, Math.floor(atMs / 1000 / step), digits);
}

/**
 * Checks a code, allowing `window` steps either side for clock drift.
 *
 * Compares in constant time. The timing of a rejected six digit code is not much of an oracle,
 * but the cost of doing it properly is one function call and the habit is worth more than the
 * argument.
 */
export function verifyTotp(
  secret: Buffer | string,
  token: string,
  atMs: number = Date.now(),
  { digits = TOTP_DIGITS, step = TOTP_STEP_SECONDS, window = 1 } = {},
): boolean {
  const cleaned = token.replace(/\s+/g, "");
  if (!new RegExp(`^\\d{${digits}}$`).test(cleaned)) return false;

  const key = typeof secret === "string" ? base32Decode(secret) : secret;
  const counter = Math.floor(atMs / 1000 / step);
  const supplied = Buffer.from(cleaned);

  let matched = false;
  for (let drift = -window; drift <= window; drift += 1) {
    const candidate = Buffer.from(hotp(key, counter + drift, digits));
    // No early return: every candidate is compared whether or not one already matched, so the
    // number of comparisons does not depend on which step was correct.
    if (candidate.length === supplied.length && timingSafeEqual(candidate, supplied)) {
      matched = true;
    }
  }

  return matched;
}

/**
 * A new shared secret.
 *
 * Twenty bytes, which is the RFC 4226 recommendation and the SHA-1 block size. Longer secrets
 * are hashed down to that anyway, so the extra length buys nothing.
 */
export function generateSecret(bytes = 20): string {
  return base32Encode(randomBytes(bytes));
}

/**
 * The `otpauth://` URI an authenticator app reads from a QR code.
 *
 * The label carries the issuer as well as the account, and `issuer` is repeated as a
 * parameter, because older apps read one and newer apps read the other. Getting this wrong
 * shows the user an entry called "rynetco" with no idea which site it belongs to.
 */
export function otpauthUrl({
  secret,
  account,
  issuer = "Rynet",
}: {
  secret: string;
  account: string;
  issuer?: string;
}): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: String(TOTP_DIGITS),
    period: String(TOTP_STEP_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

// --------------------------------------------------------------------- recovery codes

export const RECOVERY_CODE_COUNT = 10;

/**
 * Codes for when the phone is lost, which is the failure this whole feature creates.
 *
 * Ten of them, each forty bits of entropy from a Crockford-style alphabet with the letters
 * that get misread removed, because these get written on paper and typed back in months
 * later. Formatted in two groups so a person can read one out.
 */
export function generateRecoveryCodes(count = RECOVERY_CODE_COUNT): string[] {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const codes: string[] = [];

  for (let i = 0; i < count; i += 1) {
    let code = "";
    // charAt rather than an index, because it is typed to return a string rather than
    // string | undefined, and a `!` in a credential generator is a bad place to be casual.
    for (const value of randomBytes(10)) code += alphabet.charAt(value % alphabet.length);
    codes.push(`${code.slice(0, 5)}-${code.slice(5)}`);
  }

  return codes;
}

/** Normalises what somebody typed: case, spaces and the dash are all forgiven. */
export function normaliseRecoveryCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/**
 * Hashes a recovery code for storage.
 *
 * SHA-256 rather than a password hash, deliberately. These are fifty random characters of our
 * own choosing, not something a person picked, so there is no dictionary to run and the slow
 * hashing that protects a weak password buys nothing here. Peppered with the Payload secret so
 * a stolen database alone does not let an attacker confirm a guess offline.
 */
export function hashRecoveryCode(code: string, pepper: string): string {
  return createHmac("sha256", pepper).update(normaliseRecoveryCode(code)).digest("hex");
}

/** Constant-time membership test against the stored hashes. */
export function matchRecoveryCode(
  code: string,
  hashes: readonly string[],
  pepper: string,
): string | null {
  const candidate = Buffer.from(hashRecoveryCode(code, pepper));

  let found: string | null = null;
  for (const hash of hashes) {
    const stored = Buffer.from(hash);
    if (stored.length === candidate.length && timingSafeEqual(stored, candidate)) {
      found = hash;
    }
  }

  return found;
}
