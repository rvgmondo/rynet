import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * Only public web addresses, ever.
 *
 * The stock reader fetches whatever address staff paste on the onboarding screen, and whatever
 * that site redirects to, and whatever photograph links a spreadsheet carries. Any of those could
 * name this server itself, the host's internal network or a cloud metadata address, and a
 * fetcher that follows them is a way of reading things from inside the host. So every address is
 * resolved and refused unless every address it resolves to is a public one, and that is checked
 * again on every redirect rather than once at the start.
 */

function ipv4Private(ip: string): boolean {
  const parts = ip.split(".").map((part) => Number.parseInt(part, 10));
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) return true;
  const [a, b] = parts as [number, number, number, number];
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

/** True for any address that is not on the public internet, including every form of loopback. */
export function isPrivateAddress(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return ipv4Private(ip);
  if (version !== 6) return true;

  const lower = ip.toLowerCase();
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped?.[1]) return ipv4Private(mapped[1]);
  return (
    lower === "::" ||
    lower === "::1" ||
    lower.startsWith("fe8") ||
    lower.startsWith("fe9") ||
    lower.startsWith("fea") ||
    lower.startsWith("feb") ||
    lower.startsWith("fc") ||
    lower.startsWith("fd") ||
    lower.startsWith("ff") ||
    lower.startsWith("64:ff9b:")
  );
}

/** Throws unless the address is http or https and every address its host resolves to is public. */
export async function assertPublicUrl(
  address: string,
  resolve: (host: string) => Promise<string[]> = async (host) =>
    (await lookup(host, { all: true })).map((entry) => entry.address),
): Promise<URL> {
  let url: URL;
  try {
    url = new URL(address);
  } catch {
    throw new Error(`${address} is not a web address`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`${address} is not a web address`);
  }
  if (url.username || url.password) throw new Error(`${address} carries a login, which is refused`);

  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (/^localhost$/i.test(host) || /\.(?:local|internal|localhost)$/i.test(host)) {
    throw new Error(`${address} is not on the public internet`);
  }

  const addresses = isIP(host) ? [host] : await resolve(host);
  if (addresses.length === 0 || addresses.some(isPrivateAddress)) {
    throw new Error(`${address} is not on the public internet`);
  }
  return url;
}
