/**
 * Long-form page shell.
 *
 * Legal and editorial pages share one measure, one heading rhythm and one link treatment,
 * so a privacy notice does not read as though it came from a different site. The measure is
 * capped at 65 characters: past that the eye loses the line return, which matters most on
 * exactly the pages people are least motivated to read.
 */
export function Prose({
  title,
  intro,
  updated,
  children,
}: {
  title: string;
  intro?: string;
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="container-page py-[var(--section-base)]">
      <div className="measure">
        <h1 className="text-4xl">{title}</h1>
        {intro ? <p className="mt-4 text-lg text-ink-secondary">{intro}</p> : null}
        {updated ? <p className="mt-3 text-xs text-ink-muted">Last updated {updated}</p> : null}
      </div>

      <div
        className={[
          "measure mt-10",
          "[&_h2]:mt-10 [&_h2]:text-2xl",
          "[&_h3]:mt-8 [&_h3]:text-lg",
          "[&_p]:mt-4 [&_p]:text-ink-secondary",
          "[&_ul]:mt-4 [&_ul]:space-y-2 [&_ul]:pl-5 [&_li]:list-disc [&_li]:text-ink-secondary",
          "[&_ol]:mt-4 [&_ol]:space-y-2 [&_ol]:pl-5 [&_ol_li]:list-decimal",
          "[&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-accent-hover",
          "[&_strong]:font-semibold [&_strong]:text-ink",
        ].join(" ")}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * A banner for copy that has not been through legal review.
 *
 * Deliberately loud. The point is that it is impossible to publish this by accident and
 * impossible to miss that it is a draft. It comes off when an attorney has read the page,
 * and not before.
 */
export function LegalReviewNotice() {
  return (
    <div
      role="note"
      className="measure mb-8 rounded-lg border-2 border-warning bg-warning-subtle p-4"
    >
      <p className="font-display text-sm font-bold text-warning">Requires legal review</p>
      <p className="mt-1 text-sm text-ink-secondary">
        This is a plain-language draft written to be cheap for an attorney to review. It has not
        been reviewed, and it is not legal advice. Do not rely on it, and do not treat this page as
        final until a South African attorney has signed it off.
      </p>
    </div>
  );
}
