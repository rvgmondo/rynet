"use client";

import { useDocumentInfo, useFormFields } from "@payloadcms/ui";
import { CalendarPlus, Copy, ExternalLink, MessageCircle, Square } from "lucide-react";
import { useEffect, useState } from "react";

import { mockupMessage, openedLabel } from "@/lib/onboarding/mockup-message";
import { whatsappLink, whatsappNumber } from "@/lib/onboarding/whatsapp";
import { expiryLabel, extendedUntil, isExpired } from "@/lib/preview-link";

/**
 * On a mockup's record: its link, the message that sends it, whether it has been opened, and the
 * tools for its life: extend it, end it now, and mark it sent.
 *
 * The buttons save straight away, through the same API the form uses, and reload the record, so
 * nobody has to remember to press Save after extending a link.
 */
export function PreviewSendPanel() {
  const { id } = useDocumentInfo();
  const slug = useFormFields(([fields]) => fields?.slug?.value) as string | undefined;
  const dealership = useFormFields(([fields]) => fields?.dealership?.value) as string | undefined;
  const contactName = useFormFields(([fields]) => fields?.contactName?.value) as string | undefined;
  const phone = useFormFields(([fields]) => fields?.phone?.value) as string | undefined;
  const firstViewedAt = useFormFields(([fields]) => fields?.firstViewedAt?.value) as
    | string
    | undefined;
  const viewCount = useFormFields(([fields]) => fields?.viewCount?.value) as number | undefined;
  const expiresAt = useFormFields(([fields]) => fields?.expiresAt?.value) as string | undefined;
  const stage = useFormFields(([fields]) => fields?.stage?.value) as string | undefined;

  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  if (!id || !slug) {
    return (
      <div className="rn-preview-panel">
        <p className="rn-onboard__hint">Upload the mockup file and save. Its link appears here.</p>
      </div>
    );
  }

  const link = `${origin}/p/${slug}`;
  const text = mockupMessage({ contactName, dealership: dealership || "your dealership", link });
  const number = whatsappNumber(phone);
  const ended = isExpired(expiresAt);

  async function save(data: Record<string, unknown>) {
    setSaving(true);
    setProblem("");
    const response = await fetch(`/api/previews/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      setSaving(false);
      setProblem("That did not save. Reload the page and try again.");
      return;
    }
    window.location.reload();
  }

  return (
    <div className="rn-preview-panel">
      <p className="rn-onboard__label">Link</p>
      <div className="rn-onboard__inline">
        <a className="rn-onboard__link" href={link} target="_blank" rel="noreferrer">
          {link.replace(/^https?:\/\//, "")} <ExternalLink aria-hidden="true" />
        </a>
        <button
          type="button"
          className="rn-onboard__button"
          onClick={async () => {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          <Copy aria-hidden="true" /> {copied ? "Copied" : "Copy link"}
        </button>
        <a
          className="rn-onboard__button rn-onboard__button--whatsapp"
          href={whatsappLink(number, text)}
          target="_blank"
          rel="noreferrer"
          onClick={() => {
            // Sending it is what makes it "sent". Saved once WhatsApp has opened.
            if (!stage || stage === "draft") setTimeout(() => void save({ stage: "sent" }), 500);
          }}
        >
          <MessageCircle aria-hidden="true" />
          {number ? "Send on WhatsApp" : "Open WhatsApp"}
        </a>
      </div>

      <p className="rn-preview-panel__status" role="status">
        {openedLabel(firstViewedAt, viewCount)}
      </p>

      <div className={`rn-preview-panel__expiry${ended ? " rn-preview-panel__expiry--ended" : ""}`}>
        <p className="rn-preview-panel__status">
          Link: {expiryLabel(expiresAt)}
          {ended ? " They see a note asking for a fresh link." : ""}
        </p>
        <div className="rn-onboard__inline">
          <button
            type="button"
            className="rn-onboard__button"
            disabled={saving}
            onClick={() => void save({ expiresAt: extendedUntil(expiresAt, 7) })}
          >
            <CalendarPlus aria-hidden="true" /> {ended ? "Open it for 7 days" : "Add 7 days"}
          </button>
          <button
            type="button"
            className="rn-onboard__button"
            disabled={saving}
            onClick={() => void save({ expiresAt: extendedUntil(expiresAt, 30) })}
          >
            <CalendarPlus aria-hidden="true" /> {ended ? "Open it for 30 days" : "Add 30 days"}
          </button>
          {!ended ? (
            <button
              type="button"
              className="rn-onboard__button"
              disabled={saving}
              onClick={() => void save({ expiresAt: new Date().toISOString() })}
            >
              <Square aria-hidden="true" /> End it now
            </button>
          ) : null}
        </div>
      </div>

      {problem ? (
        <p className="rn-onboard__result rn-onboard__result--bad" role="alert">
          {problem}
        </p>
      ) : null}
      <p className="rn-onboard__hint">
        Opening it yourself does not count, and you can always open it, even after it has ended.
      </p>
    </div>
  );
}
