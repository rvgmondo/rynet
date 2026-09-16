import { Link } from "@payloadcms/ui";
import type { DefaultServerCellComponentProps } from "payload";

import { adminListUrl } from "@/lib/admin-links";
import { formatCount } from "@/lib/admin-list";

/**
 * How many of a dealership's cars are live on the site, counted fresh, linking to those cars.
 *
 * Replaces the stored listing count, which nothing ever wrote (it read 0 for every dealership).
 * Server cells are not handed the signed-in person, so the count runs with access control ON and
 * no user: the public's view. Live cars are exactly what the public can see, so the number is
 * the same for everyone and reveals nothing.
 */
export async function DealerLiveCarsCell({ rowData, payload }: DefaultServerCellComponentProps) {
  const id = rowData?.id;
  if (typeof id !== "number" && typeof id !== "string") return null;

  const { totalDocs } = await payload.count({
    collection: "vehicles",
    where: { and: [{ dealer: { equals: id } }, { status: { equals: "live" } }] },
    overrideAccess: false,
  });

  const href = adminListUrl(payload.config.routes.admin, "vehicles", [
    { field: "dealer", operator: "equals", value: id },
    { field: "status", operator: "equals", value: "live" },
  ]);

  return (
    <Link className="rn-admin-cell rn-admin-cell--figure" href={href} prefetch={false}>
      {formatCount(totalDocs)}
      <span className="rn-admin-visually-hidden">
        {totalDocs === 1 ? " car live, show it" : " cars live, show them"}
      </span>
    </Link>
  );
}
