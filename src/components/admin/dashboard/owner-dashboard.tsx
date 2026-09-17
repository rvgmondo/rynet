import type { DashboardViewServerProps } from "@payloadcms/next/views";
import { Gutter, Link } from "@payloadcms/ui";
import {
  ArrowRight,
  BadgeCheck,
  ImagePlus,
  Inbox,
  Info,
  type LucideIcon,
  Plus,
} from "lucide-react";

import { buildAdminNavGroups } from "@/components/admin/nav/nav-groups";
import { adminDocUrl, adminListUrl } from "@/lib/admin-links";
import { ADMIN_GROUP, ADMIN_GROUP_DESCRIPTIONS } from "@/lib/admin-nav";
import { firstName, greeting, longDate, whenLabel } from "@/lib/admin-time";

import { CLICK_TYPES, type DashboardData, loadDashboardData } from "./dashboard-data";

/**
 * The admin home screen (`admin.components.views.dashboard`), replacing Payload's grid of grey
 * boxes.
 *
 * Top to bottom: a greeting, four live numbers, the four things the owner does most, the latest
 * enquiries and the cars changed most recently, and a small index of everything else. Every
 * number is counted fresh on each visit, a zero is shown as 0, and every number links to the
 * list it counted, filtered the same way.
 *
 * Rendered inside Payload's own page template, so it sits behind the same sign-in check as every
 * other admin screen.
 */

function count(n: number): string {
  return Math.round(n)
    .toLocaleString("en-ZA")
    .replace(/[,\s\u202f]/g, "\u00a0");
}

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

const CAR_TONES: Record<string, "success" | "info" | "warning" | "neutral"> = {
  live: "success",
  sold: "info",
  pending_review: "warning",
  reserved: "warning",
};

function Badge({
  tone,
  children,
}: {
  tone: "success" | "info" | "warning" | "neutral";
  children: string;
}) {
  return <span className={`rn-admin-badge rn-admin-badge--${tone}`}>{children}</span>;
}

function Stat({
  href,
  value,
  label,
  hint,
}: {
  href: string;
  value: number;
  label: string;
  hint: string;
}) {
  return (
    <li className="rn-admin-stat">
      <Link className="rn-admin-stat__link" href={href} prefetch={false}>
        <span className="rn-admin-stat__value">{count(value)}</span>
        <span className="rn-admin-stat__label">{label}</span>
        <span className="rn-admin-stat__hint">{hint}</span>
      </Link>
    </li>
  );
}

function Action({
  href,
  label,
  hint,
  Icon,
  primary = false,
}: {
  href: string;
  label: string;
  hint: string;
  Icon: LucideIcon;
  primary?: boolean;
}) {
  return (
    <li className="rn-admin-action-item">
      <Link
        className={`rn-admin-action${primary ? " rn-admin-action--primary" : ""}`}
        href={href}
        prefetch={false}
      >
        <span className="rn-admin-action__icon">
          <Icon aria-hidden="true" focusable="false" />
        </span>
        <span className="rn-admin-action__text">
          <span className="rn-admin-action__label">{label}</span>
          <span className="rn-admin-action__hint">{hint}</span>
        </span>
      </Link>
    </li>
  );
}

function Numbers({ data, adminRoute }: { data: DashboardData; adminRoute: string }) {
  const stats = [];
  if (data.liveCars !== null) {
    stats.push(
      <Stat
        key="live"
        href={adminListUrl(adminRoute, "vehicles", [
          { field: "status", operator: "equals", value: "live" },
        ])}
        value={data.liveCars}
        label={plural(data.liveCars, "Car live on the site", "Cars live on the site")}
        hint="Buyers can see these now."
      />,
    );
  }
  if (data.draftCars !== null) {
    stats.push(
      <Stat
        key="drafts"
        href={adminListUrl(adminRoute, "vehicles", [
          { field: "status", operator: "equals", value: "draft" },
        ])}
        value={data.draftCars}
        label={plural(data.draftCars, "Car in draft", "Cars in draft")}
        hint="Hidden from the site until they go live."
      />,
    );
  }
  if (data.enquiriesThisWeek !== null) {
    const clicks = data.clicksThisWeek ?? 0;
    stats.push(
      <Stat
        key="enquiries"
        href={adminListUrl(
          adminRoute,
          "leads",
          [
            { field: "type", operator: "not_in", value: CLICK_TYPES },
            {
              field: "createdAt",
              operator: "greater_than_equal",
              value: data.weekAgo.toISOString(),
            },
          ],
          "-createdAt",
        )}
        value={data.enquiriesThisWeek}
        label={`${plural(data.enquiriesThisWeek, "Enquiry", "Enquiries")} in the last 7 days`}
        hint={
          clicks > 0
            ? `Not counting ${count(clicks)} ${plural(clicks, "tap", "taps")} on WhatsApp or a phone number.`
            : "People who left their details."
        }
      />,
    );
  }
  if (data.dealershipsWaiting !== null) {
    stats.push(
      <Stat
        key="waiting"
        href={adminListUrl(adminRoute, "dealers", [
          { field: "verificationStatus", operator: "equals", value: "pending" },
        ])}
        value={data.dealershipsWaiting}
        label={plural(
          data.dealershipsWaiting,
          "Dealership waiting for checks",
          "Dealerships waiting for checks",
        )}
        hint="They cannot put cars live until they are verified."
      />,
    );
  }
  if (stats.length === 0) return null;

  return (
    <section className="rn-admin-home__section" aria-labelledby="rn-admin-home-numbers">
      <h2 id="rn-admin-home-numbers" className="rn-admin-home__h2">
        On the site today
      </h2>
      <ul className="rn-admin-stats">{stats}</ul>
    </section>
  );
}

function LatestEnquiries({
  data,
  adminRoute,
  now,
}: {
  data: DashboardData;
  adminRoute: string;
  now: Date;
}) {
  if (data.latestEnquiries === null) return null;
  const all = adminListUrl(
    adminRoute,
    "leads",
    [{ field: "type", operator: "not_in", value: CLICK_TYPES }],
    "-createdAt",
  );
  return (
    <section className="rn-admin-panel" aria-labelledby="rn-admin-home-enquiries">
      <div className="rn-admin-panel__head">
        <h2 id="rn-admin-home-enquiries" className="rn-admin-home__h2">
          Latest enquiries
        </h2>
        <Link className="rn-admin-more" href={all} prefetch={false}>
          See all enquiries
          <ArrowRight aria-hidden="true" focusable="false" />
        </Link>
      </div>
      {data.latestEnquiries.length === 0 ? (
        <p className="rn-admin-panel__empty">No enquiries yet.</p>
      ) : (
        <ul className="rn-admin-rows">
          {data.latestEnquiries.map((lead) => (
            <li key={lead.id} className="rn-admin-row">
              <Link
                className="rn-admin-row__link"
                href={adminDocUrl(adminRoute, "leads", lead.id)}
                prefetch={false}
              >
                <span className="rn-admin-row__main">
                  <span className="rn-admin-row__title">{lead.name}</span>
                  <span className="rn-admin-row__meta">
                    {lead.dealership ? `${lead.kind}, ${lead.dealership}` : lead.kind}
                  </span>
                </span>
                <span className="rn-admin-row__aside">
                  {lead.isNew ? <Badge tone="warning">New</Badge> : null}
                  <time className="rn-admin-row__time" dateTime={lead.createdAt}>
                    {whenLabel(lead.createdAt, now)}
                  </time>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function RecentCars({
  data,
  adminRoute,
  now,
}: {
  data: DashboardData;
  adminRoute: string;
  now: Date;
}) {
  if (data.recentCars === null) return null;
  return (
    <section className="rn-admin-panel" aria-labelledby="rn-admin-home-cars">
      <div className="rn-admin-panel__head">
        <h2 id="rn-admin-home-cars" className="rn-admin-home__h2">
          Recently changed cars
        </h2>
        <Link
          className="rn-admin-more"
          href={adminListUrl(adminRoute, "vehicles", [], "-updatedAt")}
          prefetch={false}
        >
          See all cars
          <ArrowRight aria-hidden="true" focusable="false" />
        </Link>
      </div>
      {data.recentCars.length === 0 ? (
        <p className="rn-admin-panel__empty">No cars yet.</p>
      ) : (
        <ul className="rn-admin-rows">
          {data.recentCars.map((car) => (
            <li key={car.id} className="rn-admin-row">
              <Link
                className="rn-admin-row__link"
                href={adminDocUrl(adminRoute, "vehicles", car.id)}
                prefetch={false}
              >
                <span className="rn-admin-row__main">
                  <span className="rn-admin-row__title">{car.name}</span>
                  {car.dealership ? (
                    <span className="rn-admin-row__meta">{car.dealership}</span>
                  ) : null}
                </span>
                <span className="rn-admin-row__aside">
                  <Badge tone={(car.status && CAR_TONES[car.status]) || "neutral"}>
                    {car.statusLabel}
                  </Badge>
                  <time className="rn-admin-row__time" dateTime={car.updatedAt}>
                    {whenLabel(car.updatedAt, now)}
                  </time>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export async function OwnerDashboard(props: DashboardViewServerProps) {
  const { initPageResult, payload, i18n, user } = props;
  const { req, permissions, visibleEntities } = initPageResult;
  const adminRoute = payload.config.routes.admin;
  const now = new Date();

  const data = await loadDashboardData({ req, permissions, now });
  const name = firstName((user as { name?: unknown } | null | undefined)?.name);

  const can = (slug: string, op: "create" | "read") =>
    Boolean(permissions?.collections?.[slug]?.[op]);

  const groups = buildAdminNavGroups({
    payload,
    permissions,
    i18n,
    visibleCollections: visibleEntities?.collections ?? [],
    visibleGlobals: visibleEntities?.globals ?? [],
  }).filter((g) => g.label !== ADMIN_GROUP.daily);

  const waiting = data.dealershipsWaiting ?? 0;
  const exampleCars = data.exampleCars ?? 0;
  const exampleDealerships = data.exampleDealerships ?? 0;

  return (
    <Gutter className="rn-admin-home">
      <header className="rn-admin-home__head">
        <p className="rn-admin-home__date">{longDate(now)}</p>
        <h1 className="rn-admin-home__title">
          {greeting(now)}
          {name ? `, ${name}` : ""}
        </h1>
        <p className="rn-admin-home__lead">Here is what is happening on Rynet.</p>
      </header>

      {exampleCars > 0 ? (
        <p className="rn-admin-note" role="note">
          <Info aria-hidden="true" focusable="false" />
          <span>
            The site is showing {count(exampleCars)} example {plural(exampleCars, "car", "cars")}
            {exampleDealerships > 0
              ? ` from ${count(exampleDealerships)} example ${plural(exampleDealerships, "dealership", "dealerships")}`
              : ""}
            . They are labelled as examples wherever they appear.
          </span>
        </p>
      ) : null}

      <Numbers data={data} adminRoute={adminRoute} />

      <section className="rn-admin-home__section" aria-labelledby="rn-admin-home-actions">
        <h2 id="rn-admin-home-actions" className="rn-admin-home__h2">
          Quick actions
        </h2>
        <ul className="rn-admin-actions">
          {can("vehicles", "create") ? (
            <Action
              primary
              href={`${adminRoute}/collections/vehicles/create`}
              label="Add a car"
              hint="Put a new car on the site."
              Icon={Plus}
            />
          ) : null}
          {can("leads", "read") ? (
            <Action
              href={adminListUrl(adminRoute, "leads", [], "-createdAt")}
              label="See enquiries"
              hint="Newest first."
              Icon={Inbox}
            />
          ) : null}
          {can("dealers", "read") ? (
            <Action
              href={
                waiting > 0
                  ? adminListUrl(adminRoute, "dealers", [
                      { field: "verificationStatus", operator: "equals", value: "pending" },
                    ])
                  : adminListUrl(adminRoute, "dealers")
              }
              label="Review dealerships"
              hint={
                waiting > 0 ? `${count(waiting)} waiting for checks.` : "None waiting for checks."
              }
              Icon={BadgeCheck}
            />
          ) : null}
          {can("media", "create") ? (
            <Action
              href={`${adminRoute}/collections/media/create`}
              label="Upload photos"
              hint="Add photos and files to the library."
              Icon={ImagePlus}
            />
          ) : null}
        </ul>
      </section>

      <div className="rn-admin-home__columns">
        <LatestEnquiries data={data} adminRoute={adminRoute} now={now} />
        <RecentCars data={data} adminRoute={adminRoute} now={now} />
      </div>

      {groups.length > 0 ? (
        <section className="rn-admin-home__section" aria-labelledby="rn-admin-home-else">
          <h2 id="rn-admin-home-else" className="rn-admin-home__h2">
            Everything else
          </h2>
          <div className="rn-admin-index">
            {groups.map((group) => (
              <div
                key={group.label}
                className={`rn-admin-index__group${group.label === ADMIN_GROUP.lists ? " rn-admin-index__group--wide" : ""}`}
              >
                <h3 className="rn-admin-index__title">{group.label}</h3>
                {ADMIN_GROUP_DESCRIPTIONS[group.label] ? (
                  <p className="rn-admin-index__description">
                    {ADMIN_GROUP_DESCRIPTIONS[group.label]}
                  </p>
                ) : null}
                <ul className="rn-admin-index__links">
                  {group.entities.map((entity) => (
                    <li key={entity.href}>
                      <Link className="rn-admin-index__link" href={entity.href} prefetch={false}>
                        {entity.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </Gutter>
  );
}
