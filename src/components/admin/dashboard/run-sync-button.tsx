"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * "Read it now", for the moment a dealership says they have changed something.
 *
 * The timer reads their website every few hours, which is right for a site updated by hand and
 * wrong for the five minutes after somebody drops the price of a car and wants to see it. The
 * button asks the server to run the same pass at once, and the server still refuses if one is
 * already busy, so two people pressing it does not start two runs.
 */
export function RunSyncButton() {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "running" | "done" | "failed">("idle");
  const [message, setMessage] = useState<string>("");

  async function run() {
    setState("running");
    setMessage("");
    try {
      const response = await fetch("/api/stock-sync/run", {
        method: "POST",
        credentials: "include",
      });
      const body = (await response.json()) as { ran?: boolean; summary?: string; reason?: string };
      if (!response.ok) {
        setState("failed");
        setMessage(body.reason ?? "It could not run.");
        return;
      }
      setState("done");
      setMessage(body.ran ? (body.summary ?? "Finished.") : (body.reason ?? "Nothing to do."));
      router.refresh();
    } catch (error) {
      setState("failed");
      setMessage((error as Error).message);
    }
  }

  return (
    <span className="rn-admin-sync">
      <button
        type="button"
        className="rn-admin-sync__button"
        onClick={run}
        disabled={state === "running"}
      >
        {state === "running" ? "Reading their website" : "Read it now"}
      </button>
      {message ? (
        <output className="rn-admin-sync__message" aria-live="polite">
          {message}
        </output>
      ) : null}
    </span>
  );
}
