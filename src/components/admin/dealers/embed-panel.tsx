"use client";

import { useFormFields } from "@payloadcms/ui";
import { Copy, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";

import { embedSnippet } from "@/lib/embed/stock-script";

/**
 * On a dealership's Stock feed tab: the two lines that put its live Rynet stock on its own
 * website, and the feed address for a developer who would rather build their own. Reads the form;
 * writes nothing.
 */
export function EmbedPanel() {
  const slug = useFormFields(([fields]) => fields?.slug?.value) as string | undefined;
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => setOrigin(window.location.origin), []);

  if (!slug || !origin) return null;
  const snippet = embedSnippet(origin, slug);
  const feed = `${origin}/api/stock/${slug}`;

  return (
    <div className="rn-preview-panel">
      <p className="rn-onboard__label">Their stock on their own website</p>
      <p className="rn-onboard__hint">
        Paste these two lines where the cars should appear on their site. It shows every live car,
        kept up to date by itself, in a style that fits in.
      </p>
      <pre className="rn-embed-snippet">
        <code>{snippet}</code>
      </pre>
      <div className="rn-onboard__inline">
        <button
          type="button"
          className="rn-onboard__button"
          onClick={async () => {
            await navigator.clipboard.writeText(snippet);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          <Copy aria-hidden="true" /> {copied ? "Copied" : "Copy the two lines"}
        </button>
        <a className="rn-onboard__link" href={feed} target="_blank" rel="noreferrer">
          The stock as data <ExternalLink aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}
