"use client";

import {
  Button,
  ConfirmationModal,
  toast,
  useConfig,
  useDocumentInfo,
  useForm,
  useFormFields,
  useFormModified,
  useModal,
} from "@payloadcms/ui";
import { useCallback, useEffect, useState } from "react";

import { type CarVisibility, carVisibility } from "@/lib/admin-car-state";
import { optionLabel } from "@/lib/admin-list";

/**
 * The line under a car's name that says whether the car is on the site.
 *
 * Replaces Payload's "Status: Draft / Published", which described Payload's own save state and
 * read "Draft" on cars that were live. A car has one status that matters, its Listing status, and
 * the site shows only what has been saved. So this says two things:
 *
 * 1. What the site shows now, read from the SAVED car (not from the form, which may hold changes
 *    that are not saved yet). Refetched after every save.
 * 2. When there are changes that are not saved yet, that they are not on the site, and what the
 *    listing status will become when they are. The draft copy autosave keeps can be thrown away.
 *
 * Presentation only. The saved car is read over the REST API as the signed-in person, so access
 * rules apply, and throwing changes away saves the site's current version again, exactly as
 * Payload's own "Revert to published" does.
 */

type Saved = { status?: unknown; soldAt?: unknown } | null;

export function ListingState() {
  const {
    id,
    collectionSlug,
    docConfig,
    hasPublishedDoc,
    incrementVersionCount,
    setMostRecentVersionIsAutosaved,
    setUnpublishedVersionCount,
    unpublishedVersionCount,
    versionCount,
  } = useDocumentInfo();
  const { config } = useConfig();
  const modified = useFormModified();
  const { reset } = useForm();
  const { toggleModal } = useModal();
  const formStatus = useFormFields(([fields]) => fields?.status?.value);
  const statusOptions = docConfig?.fields?.find(
    (field) => "name" in field && field.name === "status",
  ) as { options?: unknown } | undefined;
  const [saved, setSaved] = useState<Saved>(null);
  const [loaded, setLoaded] = useState(false);

  const api = config.routes.api;
  const slug = collectionSlug ?? "vehicles";

  // biome-ignore lint/correctness/useExhaustiveDependencies: refetch after each save, which moves these counts
  useEffect(() => {
    if (id === undefined || id === null) return;
    let cancelled = false;
    fetch(`${api}/${slug}/${encodeURIComponent(String(id))}?depth=0&draft=false`, {
      credentials: "include",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((doc: Saved) => {
        if (cancelled) return;
        setSaved(doc ? { status: doc.status, soldAt: doc.soldAt } : null);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [api, slug, id, versionCount, unpublishedVersionCount, hasPublishedDoc]);

  const discard = useCallback(async () => {
    if (id === undefined || id === null) return;
    const url = `${api}/${slug}/${encodeURIComponent(String(id))}?depth=0&fallback-locale=null`;
    const current = await fetch(url, { credentials: "include" });
    if (!current.ok) {
      toast.error("The saved version of this car could not be read.");
      return;
    }
    const body = await current.json();
    const res = await fetch(url, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      toast.error("The changes could not be thrown away. Try again.");
      return;
    }
    const json = (await res.json()) as { doc?: Record<string, unknown> };
    await reset(json.doc ?? body);
    incrementVersionCount();
    setMostRecentVersionIsAutosaved(false);
    setUnpublishedVersionCount(0);
    toast.success("Unsaved changes thrown away.");
  }, [
    api,
    slug,
    id,
    reset,
    incrementVersionCount,
    setMostRecentVersionIsAutosaved,
    setUnpublishedVersionCount,
  ]);

  if (id === undefined || id === null) return null;

  const onSite: CarVisibility | null = loaded ? carVisibility(saved?.status, saved?.soldAt) : null;
  const pending = modified || unpublishedVersionCount > 0;
  const statusChanges =
    pending && loaded && typeof formStatus === "string" && formStatus !== saved?.status;
  const modalSlug = `rn-admin-discard-${id}`;

  return (
    <div className="rn-admin-listing-state">
      <span className="rn-admin-listing-state__label">On the site:</span>{" "}
      {onSite ? (
        <span className={`rn-admin-badge rn-admin-badge--${onSite.tone}`}>{onSite.label}</span>
      ) : (
        <span className="rn-admin-listing-state__loading">Checking</span>
      )}
      <span className="rn-admin-listing-state__pending" role="status">
        {pending ? (
          <>
            <span className="rn-admin-badge rn-admin-badge--warning">Unsaved changes</span>
            <span className="rn-admin-visually-hidden">
              {" "}
              They are not on the site until you press Save changes
              {statusChanges
                ? `, and the listing status becomes ${optionLabel(statusOptions?.options, formStatus)}`
                : ""}
              .
            </span>
          </>
        ) : null}
      </span>
      {!modified && unpublishedVersionCount > 0 && hasPublishedDoc ? (
        <>
          <Button
            buttonStyle="none"
            className="rn-admin-listing-state__discard"
            onClick={() => toggleModal(modalSlug)}
          >
            Undo them
          </Button>
          <ConfirmationModal
            body="The car goes back to what the site shows now. Changes kept since the last save are lost."
            confirmLabel="Throw them away"
            confirmingLabel="Throwing away"
            heading="Throw away unsaved changes?"
            modalSlug={modalSlug}
            onConfirm={discard}
          />
        </>
      ) : null}
    </div>
  );
}
