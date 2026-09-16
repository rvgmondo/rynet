"use client";

import { Link, useConfig, useDocumentInfo } from "@payloadcms/ui";
import { useEffect, useState } from "react";

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
 * Counted over the REST API as the signed-in person, so access rules apply, and read again after
 * every save. It used to be drawn once on the server when the screen opened, so suspending a
 * dealership and saving showed no warning until the page was reloaded. The verification it
 * judges by is the SAVED one, not what the form holds before Save is pressed. Shows nothing while
 * a new dealership is being created.
 */

export function LiveCarsNote() {
  const { id, data } = useDocumentInfo();
  const { config } = useConfig();
  const [total, setTotal] = useState<number | null>(null);

  const api = config.routes.api;
  const admin = config.routes.admin;

  // biome-ignore lint/correctness/useExhaustiveDependencies: counted again after each save, which replaces `data`
  useEffect(() => {
    if (id === undefined || id === null || id === "") return;
    let cancelled = false;
    const key = encodeURIComponent(String(id));
    fetch(
      `${api}/vehicles/count?where[and][0][dealer][equals]=${key}&where[and][1][status][equals]=live`,
      { credentials: "include" },
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { totalDocs?: unknown } | null) => {
        if (!cancelled) setTotal(typeof json?.totalDocs === "number" ? json.totalDocs : null);
      })
      .catch(() => {
        if (!cancelled) setTotal(null);
      });
    return () => {
      cancelled = true;
    };
  }, [api, id, data]);

  if (id === undefined || id === null || id === "") return null;

  const href = adminListUrl(admin, "vehicles", [
    { field: "dealer", operator: "equals", value: id },
    { field: "status", operator: "equals", value: "live" },
  ]);
  const verified = (data as { verificationStatus?: unknown } | undefined)?.verificationStatus;
  const count = total ?? 0;
  const cars = count === 1 ? "car" : "cars";
  const warn = total !== null && verified !== "verified" && count > 0;

  return (
    <div className={`rn-admin-side-note${warn ? " rn-admin-side-note--warning" : ""}`}>
      <p className="rn-admin-side-note__title">Live cars</p>
      {total === null ? (
        <p className="rn-admin-side-note__text">Counting</p>
      ) : warn ? (
        <p className="rn-admin-side-note__text">
          <strong>
            {formatCount(count)} {cars} still live.
          </strong>{" "}
          This dealership is not verified, but its cars stay on the site until each one is set to
          Archived.
        </p>
      ) : (
        <p className="rn-admin-side-note__text">
          {count === 0
            ? "No cars live on the site."
            : `${formatCount(count)} ${cars} live on the site.`}
        </p>
      )}
      {count > 0 ? (
        <Link className="rn-admin-side-note__link" href={href} prefetch={false}>
          See {count === 1 ? "the car" : "these cars"}
        </Link>
      ) : null}
    </div>
  );
}
