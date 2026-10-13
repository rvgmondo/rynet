"use client";

import { useFormFields } from "@payloadcms/ui";
import { Copy, ExternalLink, MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { mockupMessage, openedLabel } from "@/lib/onboarding/mockup-message";
import { whatsappLink, whatsappNumber } from "@/lib/onboarding/whatsapp";

/**
 * On a mockup's record: its private link, the message that sends it, and whether it has been
 * opened. Reads the form; writes nothing.
 */
export function PreviewSendPanel() {
  const token = useFormFields(([fields]) => fields?.token?.value) as string | undefined;
  const dealership = useFormFields(([fields]) => fields?.dealership?.value) as string | undefined;
  const contactName = useFormFields(([fields]) => fields?.contactName?.value) as string | undefined;
  const phone = useFormFields(([fields]) => fields?.phone?.value) as string | undefined;
  const firstViewedAt = useFormFields(([fields]) => fields?.firstViewedAt?.value) as
    | string
    | undefined;
  const viewCount = useFormFields(([fields]) => fields?.viewCount?.value) as number | undefined;

  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => setOrigin(window.location.origin), []);

  if (!token) {
    return (
      <div className="rn-preview-panel">
        <p className="rn-onboard__hint">
          Upload the mockup file and save. The private link appears here.
        </p>
      </div>
    );
  }

  const link = `${origin}/preview/${token}`;
  const text = mockupMessage({ contactName, dealership: dealership || "your dealership", link });
  const number = whatsappNumber(phone);

  return (
    <div className="rn-preview-panel">
      <p className="rn-onboard__label">Private link</p>
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
        >
          <MessageCircle aria-hidden="true" />
          {number ? `Send on WhatsApp` : "Open WhatsApp"}
        </a>
      </div>
      <p className="rn-preview-panel__status" role="status">
        {openedLabel(firstViewedAt, viewCount)}
      </p>
      <p className="rn-onboard__hint">
        Opening it yourself does not count: views by Rynet staff are not recorded.
      </p>
    </div>
  );
}
