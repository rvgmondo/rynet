import type { Payload } from "payload";

import { SocialApiError } from "@/lib/social/http";
import { isPubliclyFetchable, isSocialFileName, socialMediaUrl } from "@/lib/social/media";
import { dryRun, publishToFacebook, publishToInstagram } from "@/lib/social/meta";
import { decryptToken } from "@/lib/social/secrets";
import { retryDelayMs } from "@/lib/social/slots";

/**
 * Works the social-posts queue: sends what is due, records how it went, tries again when Meta says
 * it is worth it, and stops when it is not.
 *
 * It runs every minute in the live app (startSocialPublisher, from onInit), and straight away when
 * somebody presses Post in the portal. One run at a time per process, which on a single cPanel
 * Node process means one at a time, full stop. A post claimed by a run that died is picked up
 * again after fifteen minutes.
 *
 * Nothing here decides WHAT gets posted. The portal asks, the auto-post hook on cars asks, and
 * this only carries it out.
 */

const BATCH = 5;
const STUCK_MS = 15 * 60_000;
const PENDING_TTL_MS = 60 * 60_000;

type PostRow = {
  id: number;
  account?: number | { id: number } | null;
  network: "facebook" | "instagram";
  caption: string;
  imageFile: string;
  attempts?: number | null;
};

type AccountRow = {
  id: number;
  externalId: string;
  state: string;
  token?: string | null;
};

const idOf = (value: number | { id: number } | null | undefined): number | null =>
  value && typeof value === "object" ? value.id : (value ?? null);

let running = false;

export async function runSocialQueue(payload: Payload): Promise<{ sent: number; failed: number }> {
  if (running) return { sent: 0, failed: 0 };
  running = true;
  let sent = 0;
  let failed = 0;
  try {
    const now = new Date();

    // A post left "posting now" by a run that never finished goes back in the queue.
    await payload.db
      .updateMany({
        collection: "social-posts",
        where: {
          and: [
            { status: { equals: "publishing" } },
            { startedAt: { less_than: new Date(now.getTime() - STUCK_MS).toISOString() } },
          ],
        },
        data: { status: "queued" },
      })
      .catch(() => undefined);

    // Pages offered at connect time and never chosen hold tokens nobody needs. Gone after an hour.
    await payload.db
      .deleteMany({
        collection: "social-accounts",
        where: {
          and: [
            { state: { equals: "pending" } },
            { createdAt: { less_than: new Date(now.getTime() - PENDING_TTL_MS).toISOString() } },
          ],
        },
      })
      .catch(() => undefined);

    const due = await payload.find({
      collection: "social-posts",
      where: {
        and: [
          { status: { equals: "queued" } },
          {
            or: [
              { runAfter: { less_than_equal: now.toISOString() } },
              { runAfter: { exists: false } },
            ],
          },
        ],
      },
      sort: "runAfter",
      limit: BATCH,
      depth: 0,
      overrideAccess: true,
    });

    for (const post of due.docs as unknown as PostRow[]) {
      const ok = await publishOne(payload, post);
      if (ok) sent += 1;
      else failed += 1;
    }
  } finally {
    running = false;
  }
  return { sent, failed };
}

async function publishOne(payload: Payload, post: PostRow): Promise<boolean> {
  const attempts = (post.attempts ?? 0) + 1;
  await payload.db.updateOne({
    collection: "social-posts",
    id: post.id,
    data: { status: "publishing", startedAt: new Date().toISOString(), attempts },
  });

  const fail = async (message: string, retryable: boolean) => {
    const delay = retryable ? retryDelayMs(attempts) : null;
    await payload.db.updateOne({
      collection: "social-posts",
      id: post.id,
      data:
        delay === null
          ? { status: "failed", error: message }
          : {
              status: "queued",
              error: message,
              runAfter: new Date(Date.now() + delay).toISOString(),
            },
    });
    return false;
  };

  const accountId = idOf(post.account);
  const account = (await (accountId === null
    ? Promise.resolve(null)
    : payload.findByID({
        collection: "social-accounts",
        id: accountId,
        depth: 0,
        overrideAccess: true,
        showHiddenFields: true,
      })
  ).catch(() => null)) as AccountRow | null;

  if (account?.state !== "connected" || !account.token) {
    return fail("That page is no longer connected. Connect it again from the portal.", false);
  }

  const imageUrl = isSocialFileName(post.imageFile) ? socialMediaUrl(post.imageFile) : null;
  if (!dryRun() && !isPubliclyFetchable(imageUrl)) {
    return fail(
      "The picture is not at a public https address Facebook can reach. Check NEXT_PUBLIC_SERVER_URL or PUBLIC_MEDIA_BASE on the host.",
      false,
    );
  }

  try {
    const token = decryptToken(account.token);
    const result =
      post.network === "instagram"
        ? await publishToInstagram(account.externalId, token, imageUrl ?? "", post.caption)
        : await publishToFacebook(account.externalId, token, imageUrl ?? "", post.caption);

    if (dryRun()) {
      payload.logger.info({
        msg: "[SOCIAL_DRY_RUN] would have posted",
        post: post.id,
        network: post.network,
        to: account.externalId,
        imageUrl,
        captionChars: post.caption.length,
      });
    }

    const postedAt = new Date().toISOString();
    await payload.db.updateOne({
      collection: "social-posts",
      id: post.id,
      data: {
        status: "posted",
        postedAt,
        externalPostId: result.externalPostId,
        permalink: result.permalink,
        error: null,
      },
    });
    await payload.db.updateOne({
      collection: "social-accounts",
      id: account.id,
      data: { lastPostedAt: postedAt, lastError: null },
    });
    return true;
  } catch (error) {
    const known = error instanceof SocialApiError;
    const message = error instanceof Error ? error.message : "Something went wrong.";
    if (known && error.reconnect) {
      await payload.db.updateOne({
        collection: "social-accounts",
        id: account.id,
        data: { state: "reconnect", lastError: message },
      });
    } else {
      await payload.db
        .updateOne({ collection: "social-accounts", id: account.id, data: { lastError: message } })
        .catch(() => undefined);
    }
    payload.logger.warn({ msg: "social post failed", post: post.id, message });
    return fail(message, known ? error.retryable : true);
  }
}

let timer: NodeJS.Timeout | null = null;

/** Every minute, in the live app only, and never during a build. RYNET_SOCIAL=off turns it off. */
export function startSocialPublisher(payload: Payload): void {
  if (timer) return;
  if (process.env.NODE_ENV !== "production") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  if (process.env.RYNET_SOCIAL === "off") return;
  timer = setInterval(() => {
    void runSocialQueue(payload).catch((error: unknown) =>
      payload.logger.error({ err: error, msg: "social queue run failed" }),
    );
  }, 60_000);
  timer.unref?.();
}
