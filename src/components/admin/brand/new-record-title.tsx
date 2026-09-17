"use client";

import { useDocumentInfo, useDocumentTitle, useTranslation } from "@payloadcms/ui";
import { useEffect } from "react";

/**
 * The heading of a record that is not saved yet: "New car", "New photo or file".
 *
 * Payload heads a new record with "[Untitled]" until its title field has a value, and a car's
 * title is only built when it is saved, so every new car read "[Untitled]" for as long as it was
 * being filled in. This replaces that placeholder whenever Payload puts it back, and only that:
 * typing a name into a record whose title is that name (a dealership, a make) still heads the
 * screen with the name.
 *
 * Display only. Added to every collection in src/payload.config.ts.
 */
export function NewRecordTitle() {
  const { id, docConfig } = useDocumentInfo();
  const { title, setDocumentTitle } = useDocumentTitle();
  const { t } = useTranslation();

  const labels = docConfig && "labels" in docConfig ? docConfig.labels : undefined;
  const singular = labels?.singular;
  const noun = typeof singular === "string" ? singular.toLowerCase() : "record";
  const isNew = id === undefined || id === null || id === "";
  const untitled = `[${t("general:untitled")}]`;

  /*
   * Payload's provider sets the heading in an effect of its own, which runs after this one in the
   * same pass and would win, leaving nothing changed to run this again. So the new heading is set
   * just after that pass, and set again whenever Payload puts the placeholder back.
   */
  useEffect(() => {
    if (!isNew || (title && title !== untitled)) return;
    const timer = window.setTimeout(() => setDocumentTitle(`New ${noun}`), 0);
    return () => window.clearTimeout(timer);
  }, [isNew, noun, setDocumentTitle, title, untitled]);

  return null;
}
