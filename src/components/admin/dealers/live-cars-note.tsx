import { Link } from "@payloadcms/ui";
import type { PayloadRequest } from "payload";

import { adminListUrl } from "@/lib/admin-links";
import { formatCount } from "@/lib/admin-list";

/**
 * The dealership's live cars, in the sidebar of its edit screen.
 *
 * Mostly a count and a link. It becomes a warning when the dealership is not verified and still
 * has cars live, because suspending or archiving a dealership does NOT take its cars off the
 * site today: search, the home page and the sitemap filter on each car's own status. Changing
 * that is an access decision, so this only says so and links to the cars.
 *
 * Counted as the signed-in person (req, access control on), fresh on every visit. Shows nothing
 * while a new dealership is being created.
 */

type Props = {
  id?: number | string;
  data?: { verificationStatus?: unknown } | null;
  req: PayloadRequest;
};

export async function LiveCarsNote({ id, data, req }: Props) {
  if (id === undefined || id === null || id === "") return null;

  const { totalDocs } = await req.payload.count({
    collection: "vehicles",
    where: { and: [{ dealer: { equals: id } }, { status: { equals: "live" } }] },
    req,
    overrideAccess: false,
  });

  const href = adminListUrl(req.payload.config.routes.admin, "vehicles", [
    { field: "dealer", operator: "equals", value: id },
    { field: "status", operator: "equals", value: "live" },
  ]);
  const verified = data?.verificationStatus === "verified";
  const cars = totalDocs === 1 ? "car" : "cars";
  const warn = !verified && totalDocs > 0;

  return (
    <div className={`rn-admin-side-note${warn ? " rn-admin-side-note--warning" : ""}`}>
      <p className="rn-admin-side-note__title">Live cars</p>
      {warn ? (
        <p className="rn-admin-side-note__text">
          <strong>
            {formatCount(totalDocs)} {cars} still live.
          </strong>{" "}
          This dealership is not verified, but its cars stay on the site until each one is set to
          Archived.
        </p>
      ) : (
        <p className="rn-admin-side-note__text">
          {totalDocs === 0
            ? "No cars live on the site."
            : `${formatCount(totalDocs)} ${cars} live on the site.`}
        </p>
      )}
      {totalDocs > 0 ? (
        <Link className="rn-admin-side-note__link" href={href} prefetch={false}>
          See {totalDocs === 1 ? "the car" : "these cars"}
        </Link>
      ) : null}
    </div>
  );
}
