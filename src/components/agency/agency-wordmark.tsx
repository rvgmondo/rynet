import { RynetLockup, RynetMark } from "@/components/brand/rynet-mark";

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
 * Below 384px the full lockup and DIGITAL do not fit beside the review button and the menu, so
 * the mark stands in for RYNET, the way an app icon does. Below 360px DIGITAL also steps down a
 * size, which keeps the bar inside a 320px screen with room to spare.
 */
export function AgencyWordmark({ size = "header" }: { size?: "header" | "footer" }) {
  const footer = size === "footer";
  return (
    <span className="flex items-center gap-2.5">
      <RynetMark tone="on-navy" className={footer ? "hidden" : "h-8 w-auto min-[24rem]:hidden"} />
      <RynetLockup
        tone="on-navy"
        className={footer ? "h-7 w-auto" : "hidden h-5 w-auto min-[24rem]:block sm:h-6"}
      />
      <span
        className={`font-semibold leading-none tracking-[0.18em] text-on-navy-muted ${footer ? "pt-0.5 text-base" : "pt-px text-[0.8125rem] max-[359px]:text-[0.6875rem] max-[359px]:tracking-[0.14em] sm:text-sm"}`}
      >
        DIGITAL
      </span>
    </span>
  );
}
