import { Archivo } from "next/font/google";

/**
 * The one family. Declared once and imported by every root layout (the marketplace, the agency
 * and the global 404), because each owns its own <html> and has to apply the variable itself.
 *
 * Archivo at normal width only. The width axis was the previous design's idea (expanded display
 * type) and is not requested any more, which keeps a second variable dimension out of every font
 * file. Weight stays variable: headings 700, card titles, prices and buttons 600, reading 400.
 *
 * Self-hosted and subset by next/font. `preload` marks the face next/font considers worth
 * preloading, and src/lib/font-preload.ts reads that marker to write the link on dynamic routes.
 *
 * THE FALLBACK IS OURS, NOT NEXT'S. next/font's metric-matched fallback points at Arial and
 * nothing else, and Android phones and Linux have no Arial, so there the text first drew in an
 * unmatched default font and jumped when Archivo arrived: Lighthouse in CI measured layout shift of
 * up to 0.28. "Archivo Fallback" in src/styles/tokens.css carries the same measurements over Arial,
 * its metric twins (Liberation Sans, Arimo), Helvetica and Roboto, whichever the device has.
 */
export const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
  preload: true,
  adjustFontFallback: false,
});
