import { httpJson, type Network, SocialApiError } from "@/lib/social/http";
import { tokenKeyConfigured } from "@/lib/social/secrets";

/**
 * Facebook Pages and Instagram, through Meta's Graph API.
 *
 * One file for both because they are one connection to the person doing it: they log in to
 * Facebook once and get their Page and the Instagram account linked to it.
 *
 * Ported from Klippy (C:\CC\klippy-v2\api\src\lib\social\adapters\meta.ts), trimmed to what a
 * dealership posts: one picture and a caption. The rows it relies on are listed in
 * docs/SOCIAL-POSTING.md.
 *
 * WHERE THE APP'S IDENTITY COMES FROM
 *
 * The environment, like every other secret on Rynet: META_APP_ID, META_APP_SECRET and optionally
 * META_CONFIG_ID, set in cPanel's Node.js app screen. Until they are set, the portal says that
 * Facebook and Instagram are not switched on yet, and nothing tries to connect.
 */

const VERSION = process.env.META_API_VERSION || "v26.0";
const GRAPH = `https://graph.facebook.com/${VERSION}`;

/** Instagram fetches the picture itself, on its own time, so the publisher waits for it. */
const POLL_INTERVAL_MS = Number(process.env.META_POLL_INTERVAL_MS || 4000);
const POLL_MAX_MS = 3 * 60_000;

/**
 * What posting a picture to a Page and to its Instagram account needs, and nothing more. Asking for
 * more makes Meta's review slower and the dialog scarier for a dealer principal.
 */
export const META_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "instagram_basic",
  "instagram_content_publish",
  "business_management",
];

export type MetaApp = { appId: string; appSecret: string; configId: string | null };

export function metaApp(): MetaApp | null {
  const appId = process.env.META_APP_ID?.trim();
  const appSecret = process.env.META_APP_SECRET?.trim();
  if (!appId || !appSecret) return null;
  return { appId, appSecret, configId: process.env.META_CONFIG_ID?.trim() || null };
}

/** Whether a dealership can connect a Page on this host right now, and if not, why. */
export function socialSetup(): { ready: true } | { ready: false; missing: string[] } {
  const missing: string[] = [];
  if (!metaApp()) missing.push("META_APP_ID and META_APP_SECRET");
  if (!tokenKeyConfigured()) missing.push("SOCIAL_TOKEN_KEY (at least 32 characters)");
  return missing.length === 0 ? { ready: true } : { ready: false, missing };
}

/** Posts nothing and reports success; the publisher logs what would have gone out. */
export const dryRun = (): boolean => process.env.SOCIAL_DRY_RUN === "1";

export function metaAuthUrl(state: string, redirectUri: string, app: MetaApp): string {
  const query = new URLSearchParams({
    client_id: app.appId,
    redirect_uri: redirectUri,
    state,
    response_type: "code",
  });
  // Facebook Login for Business takes a configuration id instead of a scope list.
  if (app.configId) query.set("config_id", app.configId);
  else query.set("scope", META_SCOPES.join(","));
  return `https://www.facebook.com/${VERSION}/dialog/oauth?${query}`;
}

/** Code to a short-lived token, and straight on to a long-lived one. */
export async function metaExchangeCode(
  code: string,
  redirectUri: string,
  app: MetaApp,
): Promise<string> {
  const short = await httpJson<{ access_token: string }>(
    `${GRAPH}/oauth/access_token?${new URLSearchParams({
      client_id: app.appId,
      client_secret: app.appSecret,
      redirect_uri: redirectUri,
      code,
    })}`,
    { network: "facebook" },
  );
  const long = await httpJson<{ access_token: string }>(
    `${GRAPH}/oauth/access_token?${new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: app.appId,
      client_secret: app.appSecret,
      fb_exchange_token: short.access_token,
    })}`,
    { network: "facebook" },
  );
  return long.access_token;
}

export type MetaAccount = {
  network: Network;
  externalId: string;
  displayName: string;
  /** The Facebook Page this belongs to, so a Page and its Instagram are chosen together. */
  pageId: string;
  /**
   * The PAGE token. A Page token made from a long-lived user token does not expire, so posting
   * keeps working after the person's own login lapses. Instagram posts with its Page's token too.
   */
  pageToken: string;
};

/** Every Page this person can post to, with the Instagram account linked to each. */
export async function metaListAccounts(userToken: string): Promise<MetaAccount[]> {
  const pages = await httpJson<{
    data?: {
      id: string;
      name: string;
      access_token?: string;
      tasks?: string[];
      instagram_business_account?: { id?: string; username?: string };
    }[];
  }>(
    `${GRAPH}/me/accounts?${new URLSearchParams({
      access_token: userToken,
      fields: "id,name,access_token,tasks,instagram_business_account{id,username}",
      limit: "100",
    })}`,
    { network: "facebook" },
  );

  const out: MetaAccount[] = [];
  for (const page of pages.data ?? []) {
    // CREATE_CONTENT is what posting needs. A Page somebody can only read is not offered.
    if (page.tasks && !page.tasks.includes("CREATE_CONTENT")) continue;
    if (!page.access_token) continue;
    out.push({
      network: "facebook",
      externalId: page.id,
      displayName: page.name,
      pageId: page.id,
      pageToken: page.access_token,
    });
    const ig = page.instagram_business_account;
    if (ig?.id) {
      out.push({
        network: "instagram",
        externalId: ig.id,
        displayName: ig.username ? `@${ig.username}` : `${page.name} on Instagram`,
        pageId: page.id,
        pageToken: page.access_token,
      });
    }
  }
  return out;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type PublishResult = { externalPostId: string; permalink: string | null };

/** A picture and its words, to a Page. */
export async function publishToFacebook(
  pageId: string,
  token: string,
  imageUrl: string,
  caption: string,
): Promise<PublishResult> {
  if (dryRun()) {
    return { externalPostId: `dryrun-facebook-${Date.now()}`, permalink: null };
  }
  const result = await httpJson<{ id: string; post_id?: string }>(`${GRAPH}/${pageId}/photos`, {
    method: "POST",
    form: { url: imageUrl, caption, access_token: token },
    network: "facebook",
    // Facebook downloads the picture during this call.
    timeoutMs: 90_000,
  });
  const id = result.post_id ?? result.id;
  return { externalPostId: id, permalink: `https://www.facebook.com/${id}` };
}

/**
 * A picture and its words, to Instagram: a container first, a wait while Instagram fetches the
 * picture, then the publish. The container's id proves nothing until its status reads FINISHED.
 */
export async function publishToInstagram(
  igUserId: string,
  token: string,
  imageUrl: string,
  caption: string,
): Promise<PublishResult> {
  if (dryRun()) {
    return { externalPostId: `dryrun-instagram-${Date.now()}`, permalink: null };
  }
  const container = await httpJson<{ id?: string }>(`${GRAPH}/${igUserId}/media`, {
    method: "POST",
    form: { image_url: imageUrl, caption, access_token: token },
    network: "instagram",
    timeoutMs: 60_000,
  });
  if (!container.id) {
    throw new SocialApiError("instagram", "Instagram took the picture but gave nothing back.", {
      retryable: true,
      code: "no-container",
    });
  }

  const deadline = Date.now() + POLL_MAX_MS;
  for (;;) {
    const status = await httpJson<{ status_code?: string; status?: string }>(
      `${GRAPH}/${container.id}?${new URLSearchParams({
        fields: "status_code,status",
        access_token: token,
      })}`,
      { network: "instagram" },
    );
    if (status.status_code === "FINISHED") break;
    if (status.status_code === "ERROR") {
      throw new SocialApiError(
        "instagram",
        `Instagram could not use the picture: ${status.status ?? "it gave no reason"}.`,
        { retryable: false, code: "container-error" },
      );
    }
    if (status.status_code === "EXPIRED" || Date.now() > deadline) {
      throw new SocialApiError("instagram", "Instagram took too long with the picture.", {
        retryable: true,
        code: "container-timeout",
      });
    }
    await sleep(POLL_INTERVAL_MS);
  }

  const published = await httpJson<{ id?: string }>(`${GRAPH}/${igUserId}/media_publish`, {
    method: "POST",
    form: { creation_id: container.id, access_token: token },
    network: "instagram",
  });
  if (!published.id) {
    throw new SocialApiError("instagram", "Instagram published nothing back.", {
      retryable: true,
      code: "no-media-id",
    });
  }

  // Asked for, not built: Instagram's link scheme is not documented.
  let permalink: string | null = null;
  try {
    const info = await httpJson<{ permalink?: string }>(
      `${GRAPH}/${published.id}?${new URLSearchParams({ fields: "permalink", access_token: token })}`,
      { network: "instagram" },
    );
    permalink = info.permalink ?? null;
  } catch {
    // The post is out. A missing link is not worth failing over.
  }
  return { externalPostId: published.id, permalink };
}
