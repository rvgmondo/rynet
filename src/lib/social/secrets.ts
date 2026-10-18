import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

/**
 * The secrets behind social posting: page tokens encrypted at rest, and the signed `state` that
 * carries a connection through Facebook and back.
 *
 * A page token can post as a dealership to its own customers, which makes it worth more than
 * almost anything else in the database. So it is encrypted with AES-256-GCM under
 * SOCIAL_TOKEN_KEY, a key that lives only in the host's environment; it is never returned by any
 * API (its field's read access is false for everybody); and with no key configured nothing is
 * stored at all, rather than quietly keeping it in plain text.
 */

const keyOf = (): Buffer | null => {
  const raw = process.env.SOCIAL_TOKEN_KEY;
  if (!raw || raw.length < 32) return null;
  return createHash("sha256").update(raw).digest();
};

export const tokenKeyConfigured = (): boolean => keyOf() !== null;

export function encryptToken(plain: string): string {
  const key = keyOf();
  if (!key) throw new Error("SOCIAL_TOKEN_KEY is not set, so a page cannot be connected.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return `${iv.toString("hex")}:${cipher.getAuthTag().toString("hex")}:${data.toString("hex")}`;
}

export function decryptToken(stored: string): string {
  const key = keyOf();
  if (!key) throw new Error("SOCIAL_TOKEN_KEY is not set.");
  const [iv, tag, data] = stored.split(":");
  if (!iv || !tag || !data) throw new Error("That token is not in the stored shape.");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "hex"));
  decipher.setAuthTag(Buffer.from(tag, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(data, "hex")), decipher.final()]).toString(
    "utf8",
  );
}

/* --------------------------------------------------------------------------- the OAuth state */

/**
 * The state names the dealership and the person who pressed Connect, and is signed, because the
 * callback is a redirect from facebook.com and anything in a URL can be edited. Ten minutes is
 * plenty for a person to finish Facebook's dialog; anything older is a stale tab or a replay.
 */
const STATE_TTL_MS = 10 * 60_000;

/** The dealership connecting, or RYNET_OWNER when staff connect Rynet's own Page. */
export type ConnectState = { dealerId: number; userId: number };

export const RYNET_OWNER = 0;

export function signState(state: ConnectState, now = Date.now()): string {
  const raw = process.env.SOCIAL_TOKEN_KEY;
  if (!raw || raw.length < 32) throw new Error("SOCIAL_TOKEN_KEY is not set.");
  const body = Buffer.from(
    JSON.stringify({ ...state, exp: now + STATE_TTL_MS, n: randomBytes(8).toString("hex") }),
  ).toString("base64url");
  const sig = createHmac("sha256", raw).update(body).digest("base64url");
  return `${body}.${sig}`;
}

/** The state, or null for any failure at all: which check failed is nobody's business. */
export function verifyState(value: string, now = Date.now()): ConnectState | null {
  const raw = process.env.SOCIAL_TOKEN_KEY;
  if (!raw || raw.length < 32 || !value) return null;
  const [body, sig] = value.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", raw).update(body).digest("base64url");
  if (sig.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
      dealerId?: unknown;
      userId?: unknown;
      exp?: unknown;
    };
    if (typeof parsed.exp !== "number" || parsed.exp < now) return null;
    const dealerId = Number(parsed.dealerId);
    const userId = Number(parsed.userId);
    if (!Number.isInteger(dealerId) || !Number.isInteger(userId)) return null;
    return { dealerId, userId };
  } catch {
    return null;
  }
}
