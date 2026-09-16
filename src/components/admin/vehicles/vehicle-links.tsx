"use client";

import { Link, useConfig, useDocumentInfo } from "@payloadcms/ui";
import { useEffect, useState } from "react";

import { carVisibility } from "@/lib/admin-car-state";
import { adminListUrl } from "@/lib/admin-links";
import { formatCount } from "@/lib/admin-list";
import { vehicleUrl } from "@/lib/urls";

/**
 * In a car's sidebar: a link to the car on the site when the public can see it, and how many
 * enquiries it has had, linking to them.
 *
 * Replaces the stored enquiry count, which nothing ever wrote. Both are read from the SAVED car
 * over the REST API as the signed-in person, so access rules apply. They are read again after
 * every save: this used to be drawn once on the server when the screen opened, so a car saved as
 * Live still said it was not on the site, and a car taken off the site still offered its link,
 * until the page was reloaded. Nothing shows while a new car is being created.
 */

type Named = { slug?: unknown; name?: unknown } | number | string | null | undefined;

type SavedCar = {
  status?: unknown;
  soldAt?: unknown;
  modelYear?: unknown;
  publicRef?: unknown;
  make?: Named;
  model?: Named;
  variant?: Named;
};

function text(value: Named, key: "slug" | "name"): string | null {
  if (value && typeof value === "object" && typeof value[key] === "string") {
    return value[key] as string;
  }
  return null;
}

function publicHrefOf(car: SavedCar | null): string | null {
  if (!car || !carVisibility(car.status, car.soldAt).onSite) return null;
  const makeSlug = text(car.make, "slug");
  const modelSlug = text(car.model, "slug");
  if (!makeSlug || !modelSlug || typeof car.publicRef !== "string") return null;
  return vehicleUrl({
    makeSlug,
    modelSlug,
    modelYear: typeof car.modelYear === "number" ? car.modelYear : Number(car.modelYear),
    variantName: text(car.variant, "name"),
    publicRef: car.publicRef,
  });
}

const CAR_QUERY = [
  "depth=1",
  "draft=false",
  ...["status", "soldAt", "modelYear", "publicRef", "make", "model", "variant"].map(
    (field) => `select[${field}]=true`,
  ),
  "populate[makes][slug]=true",
  "populate[models][slug]=true",
  "populate[variants][name]=true",
].join("&");

export function VehicleLinks() {
  const { id, data, versionCount } = useDocumentInfo();
  const { config } = useConfig();
  const [car, setCar] = useState<SavedCar | null>(null);
  const [enquiries, setEnquiries] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  const api = config.routes.api;
  const admin = config.routes.admin;

  // biome-ignore lint/correctness/useExhaustiveDependencies: read again after each save, which replaces `data` and moves the version count
  useEffect(() => {
    if (id === undefined || id === null || id === "") return;
    let cancelled = false;
    const key = encodeURIComponent(String(id));
    const read = (url: string) =>
      fetch(url, { credentials: "include" })
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null);

    Promise.all([
      read(`${api}/vehicles/${key}?${CAR_QUERY}`),
      read(`${api}/leads/count?where[vehicle][equals]=${key}`),
    ]).then(([savedCar, count]) => {
      if (cancelled) return;
      setCar((savedCar as SavedCar | null) ?? null);
      const total = (count as { totalDocs?: unknown } | null)?.totalDocs;
      setEnquiries(typeof total === "number" ? total : null);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [api, id, data, versionCount]);

  if (id === undefined || id === null || id === "") return null;

  const publicHref = publicHrefOf(car);
  const enquiriesHref = adminListUrl(admin, "leads", [
    { field: "vehicle", operator: "equals", value: id },
  ]);

  return (
    <div className="rn-admin-side-note">
      <p className="rn-admin-side-note__title">On the site</p>
      {!loaded ? (
        <p className="rn-admin-side-note__text">Checking</p>
      ) : publicHref ? (
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
          Buyers cannot see this car. To put it on the site, set the listing status to Live on the
          site and save.
        </p>
      )}
      {loaded && enquiries !== null ? (
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
