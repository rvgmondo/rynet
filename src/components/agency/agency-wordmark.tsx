import { RynetLockup } from "@/components/brand/rynet-mark";

/**
 * RYNET DIGITAL, for the navy header and footer.
 *
 * The supplied lockup (mark, red divider, RYNET) with DIGITAL set beside it as the second half
 * of the name: capitals, like the wordmark it continues, and in the light silver ink so the two
 * halves read as one name with the brand word leading. It is a logotype, not a label, which is
 * the only reason capitals appear outside an eyebrow.
 *
 * DIGITAL is real text, not a drawing. e2e/agency.spec.ts tells the two front doors apart by
 * finding it in the header, and a screen reader never hears it: the link around the wordmark
 * carries the name "Rynet Digital, home".
 *
 * Below 384px the lockup steps down a size so it still fits beside the review button and the menu,
 * and below 360px DIGITAL is dropped rather than RYNET: the brand word always shows, and the link
 * around it still says "Rynet Digital, home". (The mark used to stand in for RYNET there, which
 * left a 320px screen reading "R DIGITAL".)
 */
export function AgencyWordmark({ size = "header" }: { size?: "header" | "footer" }) {
  const footer = size === "footer";
  return (
    <span className="flex items-center gap-2 min-[24rem]:gap-2.5">
      <RynetLockup
        tone="on-navy"
        className={footer ? "h-7 w-auto" : "h-4 w-auto min-[24rem]:h-5 sm:h-6"}
      />
      <span
        className={`font-semibold leading-none tracking-[0.18em] text-on-navy-muted ${footer ? "pt-0.5 text-base" : "pt-px text-[0.6875rem] max-[359px]:hidden min-[24rem]:text-[0.8125rem] sm:text-sm"}`}
      >
        DIGITAL
      </span>
    </span>
  );
}
