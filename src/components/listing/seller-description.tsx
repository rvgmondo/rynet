import { RichText } from "@payloadcms/richtext-lexical/react";

import type { Vehicle } from "@/payload-types";

type LexicalNode = { text?: unknown; children?: LexicalNode[] };

/** True when a rich text value holds at least one character a reader would see. */
function hasText(node: LexicalNode | undefined): boolean {
  if (!node) return false;
  if (typeof node.text === "string" && node.text.trim().length > 0) return true;
  return (node.children ?? []).some((child) => hasText(child));
}

/**
 * The dealership's own description of the car.
 *
 * Rendered only when the dealership wrote something. An empty "From the dealership" heading over
 * nothing reads as a site that lost the text, so an empty or whitespace-only value renders nothing
 * at all. None of the demonstration stock carries a description today; this is here so the first
 * real listing that does is shown without another deploy.
 *
 * Server rendered through Payload's own Lexical converter, so it costs no JavaScript.
 */
export function SellerDescription({ vehicle }: { vehicle: Vehicle }) {
  const description = vehicle.description;
  if (!description || !hasText(description.root as LexicalNode)) return null;

  return (
    <section aria-labelledby="description-heading" className="rn-panel p-5 sm:p-8">
      <h2 id="description-heading" className="text-xl font-bold text-heading">
        From the dealership
      </h2>
      <RichText
        data={description}
        className="measure mt-4 space-y-4 text-base text-body [&_a]:text-accent [&_a]:underline [&_li]:ms-5 [&_ol]:list-decimal [&_ul]:list-disc"
      />
    </section>
  );
}
