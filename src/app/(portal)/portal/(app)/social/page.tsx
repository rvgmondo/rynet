import { ExternalLink, Link2, Unplug } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { canManageDealer } from "@/access/roles";
import { chooseSocialPage, disconnectSocial, setAutoPost } from "@/app/actions/portal";
import { whenLabel } from "@/lib/admin-time";
import { requirePortalSession } from "@/lib/portal/session";
import { groupOffers } from "@/lib/social/accounts";
import { socialSetup } from "@/lib/social/meta";
import { AUTO_PER_DAY } from "@/lib/social/slots";

export const metadata: Metadata = { title: "Social" };

const NOTICES: Record<string, { text: string; good?: boolean }> = {
  connected: { text: "Connected. Your ads can go straight to your Page now.", good: true },
  disconnected: { text: "Disconnected. Rynet will not post anything more for you.", good: true },
  declined: { text: "Facebook was not given permission, so nothing was connected." },
  expired: { text: "That took too long or was opened somewhere else. Try connecting again." },
  "no-pages": {
    text: "Facebook found no Page you can post to with that login. You need to be an admin or editor of your dealership's Page.",
  },
  failed: { text: "Facebook did not finish connecting. Try again in a minute." },
  "not-ready": { text: "Posting to Facebook and Instagram is not switched on yet." },
  "not-manager": { text: "Only the dealer principal or a manager can change this." },
};

const STATUS_LABELS: Record<string, string> = {
  queued: "Waiting",
  publishing: "Posting now",
  posted: "Posted",
  failed: "Did not post",
};

type Account = {
  id: number;
  network: "facebook" | "instagram";
  displayName: string;
  pageId?: string | null;
  state: string;
  autoPost?: boolean | null;
  lastPostedAt?: string | null;
  lastError?: string | null;
};

type Post = {
  id: number;
  network: string;
  kind: string;
  caption: string;
  status: string;
  runAfter?: string | null;
  postedAt?: string | null;
  permalink?: string | null;
  error?: string | null;
  vehicle?: { title?: string | null } | number | null;
};

/** Which network, as a plain label chip. No guessed brand logos. */
const NetworkIcon = ({ network }: { network: string }) => (
  <span className="rn-portal-net">{network === "instagram" ? "Instagram" : "Facebook"}</span>
);

export default async function PortalSocial({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { payload, user, dealerId } = await requirePortalSession();
  const query = await searchParams;
  const key = query.problem ?? Object.keys(NOTICES).find((name) => query[name] === "1");
  const notice = key ? NOTICES[key] : undefined;
  const manager = canManageDealer(user);
  const setup = socialSetup();
  const now = new Date();

  const accounts = (
    await payload.find({
      collection: "social-accounts",
      where: { dealer: { equals: dealerId } },
      depth: 0,
      limit: 50,
      user,
      overrideAccess: false,
    })
  ).docs as unknown as Account[];
  const connected = accounts.filter((account) => account.state !== "pending");
  const offers = groupOffers(accounts.filter((account) => account.state === "pending"));

  const posts = (
    await payload.find({
      collection: "social-posts",
      where: { dealer: { equals: dealerId } },
      sort: "-createdAt",
      depth: 1,
      limit: 30,
      user,
      overrideAccess: false,
    })
  ).docs as unknown as Post[];

  return (
    <>
      <header className="rn-portal-head">
        <div>
          <p className="rn-portal-head__eyebrow">Social</p>
          <h1 className="rn-portal-head__title">Your Facebook and Instagram</h1>
          <p className="rn-portal-head__lead">
            Connect your dealership&apos;s Page once. Then post any ad from the Ad studio with one
            press, or let Rynet post each new car for you as it arrives.
          </p>
        </div>
      </header>

      {notice ? (
        <p
          className={notice.good ? "rn-notice mb-6" : "rn-portal-problem mb-6"}
          role={notice.good ? "status" : "alert"}
        >
          {notice.text}
        </p>
      ) : null}

      {offers.length > 0 && manager ? (
        <section className="rn-portal-card mb-6" aria-labelledby="social-choose">
          <div className="rn-portal-card__head">
            <h2 id="social-choose" className="rn-portal-card__title">
              Which Page is your dealership?
            </h2>
          </div>
          <ul className="rn-portal-list">
            {offers.map((offer) => (
              <li key={offer.pageId} className="rn-portal-car !grid-cols-[minmax(0,1fr)_auto]">
                <div>
                  <p className="rn-portal-car__title">
                    {offer.facebook?.displayName ?? "A Facebook Page"}
                  </p>
                  <p className="rn-portal-car__meta">
                    {offer.instagram
                      ? `With Instagram ${offer.instagram.displayName}`
                      : "No Instagram account linked to this Page"}
                  </p>
                </div>
                <form action={chooseSocialPage}>
                  <input type="hidden" name="pageId" value={offer.pageId} />
                  <button type="submit" className="rn-btn rn-btn--primary rn-btn--sm">
                    Use this Page
                    <span className="sr-only">: {offer.facebook?.displayName}</span>
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="rn-portal-grid2">
        <section className="rn-portal-card" aria-labelledby="social-accounts">
          <div className="rn-portal-card__head">
            <h2 id="social-accounts" className="rn-portal-card__title">
              Connected
            </h2>
          </div>
          {connected.length > 0 ? (
            <ul className="rn-portal-list">
              {connected.map((account) => (
                <li key={account.id} className="rn-portal-lead">
                  <div className="min-w-0">
                    <p className="rn-portal-lead__who inline-flex items-center gap-2">
                      <NetworkIcon network={account.network} /> {account.displayName}
                    </p>
                    <p className="rn-portal-lead__about">
                      {account.state === "reconnect"
                        ? "Facebook stopped accepting this connection. Connect again to keep posting."
                        : account.lastPostedAt
                          ? `Last post ${whenLabel(account.lastPostedAt, now)}`
                          : "Nothing posted yet"}
                    </p>
                    {account.lastError && account.state !== "reconnect" ? (
                      <p className="rn-portal-lead__message">{account.lastError}</p>
                    ) : null}
                  </div>
                  <div className="rn-portal-lead__side">
                    {manager ? (
                      <form action={setAutoPost}>
                        <input type="hidden" name="id" value={account.id} />
                        <input type="hidden" name="on" value={account.autoPost ? "0" : "1"} />
                        <button
                          type="submit"
                          className={`rn-btn rn-btn--sm ${account.autoPost ? "rn-btn--secondary" : "rn-btn--outline"}`}
                          aria-pressed={account.autoPost === true}
                        >
                          {account.autoPost
                            ? "New cars post automatically"
                            : "Post new cars automatically"}
                          <span className="sr-only"> on {account.displayName}</span>
                        </button>
                      </form>
                    ) : (
                      <span className="rn-portal-state">
                        {account.autoPost
                          ? "Posts new cars automatically"
                          : "Posts only when asked"}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rn-portal-empty">Nothing connected yet.</p>
          )}
          <div className="rn-portal-card__body flex flex-wrap gap-3 border-t border-line">
            {!setup.ready ? (
              <p className="text-sm text-muted">
                Posting to Facebook and Instagram is being switched on by Rynet. Your ads are ready
                to download in the meantime.
              </p>
            ) : manager ? (
              <>
                <a className="rn-btn rn-btn--primary" href="/api/portal/social/connect">
                  <Link2 aria-hidden="true" />
                  {connected.length > 0 ? "Connect a different Page" : "Connect your Facebook Page"}
                </a>
                {connected.length > 0 ? (
                  <form action={disconnectSocial}>
                    <button type="submit" className="rn-btn rn-btn--outline">
                      <Unplug aria-hidden="true" /> Disconnect
                    </button>
                  </form>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-muted">
                Your dealer principal or a manager can connect your Page.
              </p>
            )}
          </div>
        </section>

        <section className="rn-portal-card" aria-labelledby="social-how">
          <div className="rn-portal-card__head">
            <h2 id="social-how" className="rn-portal-card__title">
              How it works
            </h2>
          </div>
          <div className="rn-portal-card__body grid gap-3 text-sm">
            <p>
              <strong className="text-heading">When you ask.</strong> Pick a car in{" "}
              <Link className="rn-link" href="/portal/ads">
                Ads
              </Link>
              , check the words, press Post. It is on your Page within a minute.
            </p>
            <p>
              <strong className="text-heading">Automatically.</strong> Each new car that goes live
              is posted with its photograph and price, spaced out so your followers are not flooded:
              at most {AUTO_PER_DAY} a day, three hours apart, between 08:00 and 18:00. Cars already
              live when you switch it on are not posted.
            </p>
            <p>
              Rynet only ever posts. It never reads your messages, and you can disconnect at any
              time here or in your Facebook settings.
            </p>
          </div>
        </section>
      </div>

      <section className="rn-portal-card mt-6" aria-labelledby="social-posts">
        <div className="rn-portal-card__head">
          <h2 id="social-posts" className="rn-portal-card__title">
            Posts
          </h2>
        </div>
        {posts.length > 0 ? (
          <ul className="rn-portal-list">
            {posts.map((post) => {
              const car =
                post.vehicle && typeof post.vehicle === "object" ? post.vehicle.title : null;
              const when =
                post.status === "posted" && post.postedAt
                  ? whenLabel(post.postedAt, now)
                  : post.status === "queued" && post.runAfter
                    ? `Goes out ${whenLabel(post.runAfter, now)}`
                    : null;
              return (
                <li key={post.id} className="rn-portal-lead">
                  <div className="min-w-0">
                    <p className="rn-portal-lead__who inline-flex items-center gap-2">
                      <NetworkIcon network={post.network} />
                      {car ?? "Your showroom"}
                    </p>
                    <p className="rn-portal-lead__about">
                      {post.kind === "auto" ? "New car, posted automatically" : "Posted from Ads"}
                      {when ? `. ${when}` : ""}
                    </p>
                    {post.status === "failed" && post.error ? (
                      <p className="rn-portal-lead__message">{post.error}</p>
                    ) : null}
                  </div>
                  <div className="rn-portal-lead__side">
                    <span
                      className={`rn-portal-state${post.status === "posted" ? " rn-portal-state--live" : post.status === "failed" ? " rn-portal-state--sold" : ""}`}
                    >
                      {STATUS_LABELS[post.status] ?? post.status}
                    </span>
                    {post.permalink ? (
                      <a
                        className="rn-portal-card__link inline-flex items-center gap-1"
                        href={post.permalink}
                        target="_blank"
                        rel="noreferrer"
                      >
                        See the post <ExternalLink aria-hidden="true" className="size-3.5" />
                      </a>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="rn-portal-empty">No posts yet.</p>
        )}
      </section>
    </>
  );
}
