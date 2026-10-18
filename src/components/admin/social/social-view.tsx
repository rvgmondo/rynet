import { DefaultTemplate } from "@payloadcms/next/templates";
import { Gutter } from "@payloadcms/ui";
import { redirect } from "next/navigation";
import type { AdminViewServerProps } from "payload";

import { isPlatformStaff } from "@/access/roles";
import { chooseRynetPage, disconnectRynet, setRynetAutoPost } from "@/app/actions/admin-social";
import { whenLabel } from "@/lib/admin-time";
import { groupOffers } from "@/lib/social/accounts";
import { socialSetup } from "@/lib/social/meta";
import { AUTO_PER_DAY } from "@/lib/social/slots";

/**
 * Admin > Social (`/admin/social`): Rynet's own Facebook Page and Instagram.
 *
 * The marketplace has followers too. Connect Rynet's Page here, post any ad from the Ad studio
 * with Post it, or let every new car from a verified dealership go out on its own, spaced the
 * same way a dealership's are. Below, every social post Rynet has sent, for Rynet and for the
 * dealerships, so staff can see at a glance what went and what did not.
 */

const NOTICES: Record<string, { text: string; good?: boolean }> = {
  connected: { text: "Connected. Ads can go straight to Rynet's Page now.", good: true },
  disconnected: { text: "Disconnected. Nothing more will be posted to Rynet's Page.", good: true },
  declined: { text: "Facebook was not given permission, so nothing was connected." },
  expired: { text: "That took too long or was opened somewhere else. Try connecting again." },
  "no-pages": { text: "That Facebook login is not an admin or editor of any Page." },
  failed: { text: "Facebook did not finish connecting. Try again in a minute." },
  "not-ready": {
    text: "Posting is not switched on yet: set META_APP_ID, META_APP_SECRET and SOCIAL_TOKEN_KEY in cPanel (docs/SOCIAL-POSTING.md).",
  },
};

const STATUS: Record<string, string> = {
  queued: "Waiting",
  publishing: "Posting now",
  posted: "Posted",
  failed: "Did not post",
};

type Account = {
  id: number;
  network: string;
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
  status: string;
  runAfter?: string | null;
  postedAt?: string | null;
  permalink?: string | null;
  error?: string | null;
  dealer?: { tradingName?: string } | number | null;
  vehicle?: { title?: string } | number | null;
};

export async function SocialView({ initPageResult, params, searchParams }: AdminViewServerProps) {
  const { req, permissions, visibleEntities, locale } = initPageResult;
  const { payload, user } = req;
  const adminRoute = payload.config.routes.admin;
  if (!user) redirect(`${adminRoute}/login?redirect=${encodeURIComponent(`${adminRoute}/social`)}`);

  const template = (children: React.ReactNode) => (
    <DefaultTemplate
      i18n={req.i18n}
      locale={locale}
      params={params}
      payload={payload}
      permissions={permissions}
      searchParams={searchParams}
      user={user ?? undefined}
      visibleEntities={visibleEntities}
    >
      <Gutter className="rn-admin-home rn-onboard rn-social">{children}</Gutter>
    </DefaultTemplate>
  );
  const head = (lead: string) => (
    <header className="rn-admin-home__head">
      <h1 className="rn-admin-home__title">Social</h1>
      <p className="rn-admin-home__lead">{lead}</p>
    </header>
  );
  if (!isPlatformStaff(user)) return template(head("Only Rynet staff can post for Rynet."));

  const query = (searchParams ?? {}) as Record<string, string | undefined>;
  const key = query.problem ?? Object.keys(NOTICES).find((name) => query[name] === "1");
  const notice = key ? NOTICES[key] : undefined;
  const setup = socialSetup();
  const now = new Date();

  const accounts = (
    await payload.find({
      collection: "social-accounts",
      where: { dealer: { exists: false } },
      depth: 0,
      limit: 50,
      overrideAccess: true,
    })
  ).docs as unknown as Account[];
  const connected = accounts.filter((account) => account.state !== "pending");
  const offers = groupOffers(accounts.filter((account) => account.state === "pending"));

  const posts = (
    await payload.find({
      collection: "social-posts",
      sort: "-createdAt",
      depth: 1,
      limit: 40,
      overrideAccess: true,
    })
  ).docs as unknown as Post[];

  return template(
    <>
      {head(
        "Rynet's own Facebook Page and Instagram. Post any ad from the Ad studio, or let each new car from a verified dealership go out on its own.",
      )}
      <div className="rn-onboard__steps">
        {notice ? (
          <p
            className={`rn-onboard__result${notice.good ? "" : " rn-onboard__result--bad"}`}
            role={notice.good ? "status" : "alert"}
          >
            {notice.text}
          </p>
        ) : null}

        {offers.length > 0 ? (
          <section className="rn-admin-panel rn-onboard__step" aria-labelledby="social-choose">
            <h2 id="social-choose" className="rn-admin-home__h2">
              Which Page is Rynet's?
            </h2>
            <ul className="rn-social__list">
              {offers.map((offer) => (
                <li key={offer.pageId} className="rn-social__row">
                  <div>
                    <p className="rn-social__name">{offer.facebook?.displayName ?? "A Page"}</p>
                    <p className="rn-onboard__hint">
                      {offer.instagram
                        ? `With Instagram ${offer.instagram.displayName}`
                        : "No Instagram account linked to this Page"}
                    </p>
                  </div>
                  <form action={chooseRynetPage}>
                    <input type="hidden" name="pageId" value={offer.pageId} />
                    <button
                      type="submit"
                      className="rn-onboard__button rn-onboard__button--primary"
                    >
                      Use this Page
                      <span className="rn-onboard__sr">: {offer.facebook?.displayName}</span>
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="rn-admin-panel rn-onboard__step" aria-labelledby="social-rynet">
          <h2 id="social-rynet" className="rn-admin-home__h2">
            Rynet's accounts
          </h2>
          {connected.length > 0 ? (
            <ul className="rn-social__list">
              {connected.map((account) => (
                <li key={account.id} className="rn-social__row">
                  <div>
                    <p className="rn-social__name">
                      <span className="rn-social__net">
                        {account.network === "instagram" ? "Instagram" : "Facebook"}
                      </span>{" "}
                      {account.displayName}
                    </p>
                    <p className="rn-onboard__hint">
                      {account.state === "reconnect"
                        ? "Facebook stopped accepting this connection. Connect again."
                        : account.lastPostedAt
                          ? `Last post ${whenLabel(account.lastPostedAt, now)}`
                          : "Nothing posted yet"}
                      {account.lastError && account.state !== "reconnect"
                        ? `. Last problem: ${account.lastError}`
                        : ""}
                    </p>
                  </div>
                  <form action={setRynetAutoPost}>
                    <input type="hidden" name="id" value={account.id} />
                    <input type="hidden" name="on" value={account.autoPost ? "0" : "1"} />
                    <button
                      type="submit"
                      className={`rn-onboard__button${account.autoPost ? " rn-onboard__button--primary" : ""}`}
                      aria-pressed={account.autoPost === true}
                    >
                      {account.autoPost
                        ? "New cars post automatically"
                        : "Post new cars automatically"}
                      <span className="rn-onboard__sr"> on {account.displayName}</span>
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rn-onboard__hint">Nothing connected yet.</p>
          )}
          <div className="rn-onboard__actions rn-social__actions">
            {setup.ready ? (
              <>
                <a
                  className="rn-onboard__button rn-onboard__button--primary"
                  href="/api/admin/social/connect"
                >
                  {connected.length > 0
                    ? "Connect a different Page"
                    : "Connect Rynet's Facebook Page"}
                </a>
                {connected.length > 0 ? (
                  <form action={disconnectRynet}>
                    <button type="submit" className="rn-onboard__button">
                      Disconnect
                    </button>
                  </form>
                ) : null}
                <a className="rn-onboard__button" href={`${adminRoute}/ad-studio`}>
                  Make an ad to post
                </a>
              </>
            ) : (
              <p className="rn-onboard__hint">
                Posting is not switched on yet. It needs a Meta app and three settings in cPanel:
                META_APP_ID, META_APP_SECRET and SOCIAL_TOKEN_KEY. The steps are in
                docs/SOCIAL-POSTING.md.
              </p>
            )}
          </div>
          <p className="rn-onboard__hint">
            Automatic posts take each new car from a verified dealership, with its photograph and
            price, at most {AUTO_PER_DAY} a day, three hours apart, between 08:00 and 18:00.
          </p>
        </section>

        <section className="rn-admin-panel rn-onboard__step" aria-labelledby="social-posts">
          <h2 id="social-posts" className="rn-admin-home__h2">
            Every post, Rynet's and the dealerships'
          </h2>
          {posts.length === 0 ? (
            <p className="rn-onboard__hint">No posts yet.</p>
          ) : (
            <table className="rn-mailer__history">
              <thead>
                <tr>
                  <th scope="col">For</th>
                  <th scope="col">Where</th>
                  <th scope="col">Car</th>
                  <th scope="col">How</th>
                  <th scope="col">State</th>
                  <th scope="col">When</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => {
                  const dealer =
                    post.dealer && typeof post.dealer === "object" ? post.dealer : null;
                  const car =
                    post.vehicle && typeof post.vehicle === "object" ? post.vehicle : null;
                  const when = post.postedAt ?? post.runAfter;
                  return (
                    <tr key={post.id}>
                      <td>{dealer?.tradingName ?? "Rynet"}</td>
                      <td>{post.network === "instagram" ? "Instagram" : "Facebook"}</td>
                      <td>{car?.title ?? "Showroom"}</td>
                      <td>{post.kind === "auto" ? "Automatic" : "Asked for"}</td>
                      <td>
                        {post.permalink ? (
                          <a href={post.permalink} target="_blank" rel="noreferrer">
                            {STATUS[post.status] ?? post.status}
                          </a>
                        ) : (
                          (STATUS[post.status] ?? post.status)
                        )}
                        {post.status === "failed" && post.error ? `: ${post.error}` : ""}
                      </td>
                      <td>{when ? whenLabel(when, now) : ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </>,
  );
}
