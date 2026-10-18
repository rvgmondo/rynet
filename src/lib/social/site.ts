/** Rynet's own public address, which Facebook sends people back to and fetches pictures from. */
export function siteOrigin(): string {
  return (process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000").replace(/\/+$/, "");
}

export const callbackUrl = (): string => `${siteOrigin()}/api/portal/social/callback`;

/**
 * A redirect within Rynet, as a path. Relative, so it stays on whatever address the person is on
 * (the live site, staging, a laptop), where the session cookie is. Only the address Facebook is
 * given has to be the one public origin.
 */
export const seeOther = (path: string): Response =>
  new Response(null, { status: 303, headers: { location: path } });
