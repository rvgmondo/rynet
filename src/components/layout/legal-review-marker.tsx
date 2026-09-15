/**
 * The standard marker for legal wording that has not been reviewed by an attorney.
 *
 * One component so there is one treatment: small, sentence case, a dot of the warning
 * colour, and its own line, never run into the sentence it qualifies. See .rn-review in
 * globals.css for the styling and src/content/legal-review.ts for why it looks like this.
 *
 * Pass the reviewed date for the wording it sits beside. While that is empty the marker shows;
 * once it is set, the marker renders nothing. It never decides on its own that something has
 * been reviewed.
 */
export function LegalReviewMarker({
  reviewedAt,
  className = "",
}: {
  reviewedAt: string | null | undefined;
  className?: string;
}) {
  if (reviewedAt) return null;

  return (
    <p role="note" className={`rn-review ${className}`}>
      Requires legal review
    </p>
  );
}
