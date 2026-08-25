/**
 * WCAG 2.2 relative luminance and contrast ratio.
 *
 * Shared by three callers that must agree: the token report in scripts/, the dealer
 * microsite colour validator, and the component tests. One implementation, so a dealer
 * colour rejected at save time is rejected for the same reason CI would reject a token.
 */

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "").trim();
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const n = Number.parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * The nearest shade of the same hue that reaches `target` against `against`.
 *
 * Used to turn "your colour fails" into "your colour fails, try this one", which is the
 * difference between a validator a dealer works around and one they follow.
 */
export function darkenToMeet(colour: string, against = "#FFFFFF", target = 4.5): string {
  const [r, g, b] = hexToRgb(colour);
  for (let step = 0; step <= 100; step += 2) {
    const t = step / 100;
    const mixed: [number, number, number] = [
      Math.round(r * (1 - t)),
      Math.round(g * (1 - t)),
      Math.round(b * (1 - t)),
    ];
    const hex = `#${mixed.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
    if (contrastRatio(hex, against) >= target) return hex;
  }
  return "#000000";
}
