import { Link } from "@payloadcms/ui";
import type { PayloadRequest } from "payload";
import { carVisibility } from "@/lib/admin-car-state";
import { adminListUrl } from "@/lib/admin-links";
import { formatCount } from "@/lib/admin-list";
import { vehicleUrl } from "@/lib/urls";

/**
 * In a car's sidebar: a link to the car on the site when the public can see it, and how many
 * enquiries it has had, linking to them.
 *
 * Replaces the stored enquiry count, which nothing ever wrote. Both are read from the SAVED car,
 * as the signed-in person (req, access control on), fresh each time the screen opens. Nothing
 * shows while a new car is being created.
 */

type Named = { slug?: unknown; name?: unknown } | number | string | null | undefined;

function text(value: Named, key: "slug" | "name"): string | null {
  if (value && typeof value === "object" && typeof value[key] === "string") {
    return value[key] as string;
  }
  return null;
}

type Props = { id?: number | string; req: PayloadRequest };

export async function VehicleLinks({ id, req }: Props) {
  if (id === undefined || id === null || id === "") return null;

  const [car, enquiries] = await Promise.all([
    req.payload
      .findByID({
        collection: "vehicles",
        id,
        depth: 1,
        draft: false,
        disableErrors: true,
        select: {
          status: true,
          soldAt: true,
          modelYear: true,
          publicRef: true,
          make: true,
          model: true,
          variant: true,
        },
        populate: { makes: { slug: true }, models: { slug: true }, variants: { name: true } },
        req,
        overrideAccess: false,
      })
      .catch(() => null),
    req.payload
      .count({
        collection: "leads",
        where: { vehicle: { equals: id } },
        req,
        overrideAccess: false,
      })
      .then((result) => result.totalDocs)
      .catch(() => null),
  ]);

  const visible = car ? carVisibility(car.status, car.soldAt).onSite : false;
  const makeSlug = text(car?.make as Named, "slug");
  const modelSlug = text(car?.model as Named, "slug");
  const publicHref =
    visible && car && makeSlug && modelSlug && typeof car.publicRef === "string"
      ? vehicleUrl({
          makeSlug,
          modelSlug,
          modelYear: car.modelYear,
          variantName: text(car.variant as Named, "name"),
          publicRef: car.publicRef,
        })
      : null;

  const enquiriesHref = adminListUrl(req.payload.config.routes.admin, "leads", [
    { field: "vehicle", operator: "equals", value: id },
  ]);

  return (
    <div className="rn-admin-side-note">
      <p className="rn-admin-side-note__title">On the site</p>
      {publicHref ? (
        <a
          className="rn-admin-side-note__link"
          href={publicHref}
          rel="noopener noreferrer"
          target="_blank"
        >
          See this car on the site
          <span className="rn-admin-side-note__hint"> (opens in a new tab)</span>
        </a>
      ) : (
        <p className="rn-admin-side-note__text">
          Not shown on the site while it is saved like this.
        </p>
      )}
      {enquiries !== null ? (
        <p className="rn-admin-side-note__text rn-admin-side-note__text--spaced">
          {enquiries === 0 ? (
            "No enquiries about this car yet."
          ) : (
            <Link className="rn-admin-side-note__link" href={enquiriesHref} prefetch={false}>
              {formatCount(enquiries)} {enquiries === 1 ? "enquiry" : "enquiries"} about this car
            </Link>
          )}
        </p>
      ) : null}
    </div>
  );
}
