"use client";

import { Check, Share2 } from "lucide-react";
import { useEffect, useState } from "react";

import { buttonClasses } from "@/components/ui/button-classes";

/**
 * Share this listing. A small island that renders only a reserved space until it has mounted,
 * because a share button that does nothing without JavaScript is worse than no button.
 *
 * The phone's own share sheet where there is one; otherwise the canonical address is copied and a
 * polite live region says so. Only the public URL is shared, never anything about the viewer.
 */
export function ShareButton({ path, title }: { path: string; title: string }) {
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2500);
    return () => window.clearTimeout(timer);
  }, [copied]);

  // Hold the button's space before it mounts, so the title beside it does not rewrap and shift the
  // whole card when it appears.
  if (!mounted) return <span aria-hidden="true" className="-me-2 -mt-1 block size-11 shrink-0" />;

  const share = async () => {
    const url = new URL(path, window.location.origin).toString();
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url });
      } catch {
        // Dismissing the share sheet is not an error worth telling anyone about.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // No clipboard permission: nothing sensible to fall back to, and nothing broken.
    }
  };

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={share}
        className={buttonClasses({ variant: "ghost", size: "icon", className: "-me-2 -mt-1" })}
      >
        {copied ? <Check aria-hidden="true" /> : <Share2 aria-hidden="true" />}
        <span className="sr-only">Share this listing</span>
      </button>
      <span aria-live="polite" className="sr-only">
        {copied ? "Link copied" : ""}
      </span>
    </div>
  );
}
