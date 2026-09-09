/**
 * Contrast report.
 *
 * Reads the semantic pairs out of src/styles/tokens.css, computes every one against WCAG
 * 2.2, writes docs/contrast-report.md, and exits non-zero if any pair fails. CI runs it on
 * every pull request, so a token change that breaks contrast fails the build rather than
 * reaching a design review.
 *
 * The thresholds are per pair TYPE, not one blanket number, because WCAG's are:
 *   - normal text            4.5   (SC 1.4.3)
 *   - large text             3.0   (>=24px, or >=18.66px at weight 700)
 *   - interactive boundary   3.0   (SC 1.4.11, only where the boundary is the SOLE
 *                                  indicator of the control)
 *   - decorative             none  (a divider or a card edge carries no information)
 *
 * That last distinction is why there are two border tokens. Treating a decorative hairline
 * as if it needed 3:1 would force every divider to be far darker than it should be.
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  oklchToHex,
  PLATE,
  PLATE_CHROMA_MAX,
  PLATE_INK,
  type PlateTheme,
  plateField,
  primerField,
} from "../src/lib/vehicle-plate";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dirname, "..");

type PairKind = "text" | "large-text" | "interactive" | "decorative";

type Pair = {
  label: string;
  fg: string;
  bg: string;
  kind: PairKind;
  note?: string;
};

const MIN: Record<PairKind, number> = {
  text: 4.5,
  "large-text": 3,
  interactive: 3,
  decorative: 0,
};

// ---------------------------------------------------------------- colour maths

function toRgb(hex: string): [number, number, number] {
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

function luminance(hex: string): number {
  const [r, g, b] = toRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const ratio = (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  return Math.round(ratio * 100) / 100;
}

// ------------------------------------------------- read the tokens, do not restate them
//
// The values are parsed out of tokens.css rather than duplicated here. A report that keeps
// its own copy of the palette will eventually disagree with the stylesheet and pass while
// the site fails, which is worse than having no report.

function parseTokens(css: string): { light: Map<string, string>; dark: Map<string, string> } {
  const light = new Map<string, string>();
  const dark = new Map<string, string>();

  /*
   * A block belongs to the dark theme if its SELECTOR names the dark theme, or if it sits
   * inside a prefers-color-scheme: dark media query.
   *
   * The media query case is the one that matters and it was previously missed, because
   * `:root:not([data-theme="light"])` does not contain the string `data-theme="dark"`. The
   * whole dark palette was therefore being written into the light map, on top of the real
   * light values, and the light theme was never actually checked by this report. It passed
   * because dark values are self-consistent against a dark ground.
   */
  const blocks = [...css.matchAll(/(:root[^{]*)\{([^}]*)\}/g)];
  for (const block of blocks) {
    const [, selectorRaw, body] = block;
    if (!selectorRaw || !body) continue;

    const before = css.slice(0, block.index ?? 0);
    const lastMedia = before.lastIndexOf("@media");
    const inDarkMedia =
      lastMedia !== -1 &&
      before.slice(lastMedia, lastMedia + 120).includes("prefers-color-scheme: dark") &&
      // The query is still open if it has more { than } after it.
      countChar(before.slice(lastMedia), "{") > countChar(before.slice(lastMedia), "}");

    const selector = selectorRaw.trim();
    const target = selector.includes('data-theme="dark"') || inDarkMedia ? dark : light;
    for (const [, name, value] of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
      if (!name || !value) continue;
      target.set(name, value.trim());
    }
  }

  // The dark block inherits every token the light block set and did not override.
  for (const [k, v] of light) if (!dark.has(k)) dark.set(k, v);
  return { light, dark };
}

function countChar(text: string, char: string): number {
  let n = 0;
  for (const c of text) if (c === char) n += 1;
  return n;
}

/** Resolves var(--x) chains down to a literal hex. */
function resolve(name: string, tokens: Map<string, string>, seen = new Set<string>()): string {
  const raw = tokens.get(name);
  if (!raw) throw new Error(`token ${name} is not defined`);
  if (seen.has(name)) throw new Error(`token ${name} refers to itself`);
  seen.add(name);

  const ref = raw.match(/var\((--[\w-]+)\)/);
  if (ref?.[1]) return resolve(ref[1], tokens, seen);
  if (/^#[0-9a-f]{3,8}$/i.test(raw)) return raw;
  throw new Error(`token ${name} resolves to "${raw}", which is not a hex colour`);
}

// ------------------------------------------------------------------- the pairs

const PAIRS: Pair[] = [
  {
    label: "Body text on surface",
    fg: "--rn-text-primary",
    bg: "--rn-surface",
    kind: "text",
  },
  {
    label: "Body text on raised surface",
    fg: "--rn-text-primary",
    bg: "--rn-surface-raised",
    kind: "text",
  },
  {
    label: "Body text on sunken surface",
    fg: "--rn-text-primary",
    bg: "--rn-surface-sunken",
    kind: "text",
  },
  {
    label: "Secondary text on surface",
    fg: "--rn-text-secondary",
    bg: "--rn-surface",
    kind: "text",
  },
  {
    label: "Secondary text on raised surface",
    fg: "--rn-text-secondary",
    bg: "--rn-surface-raised",
    kind: "text",
  },
  { label: "Muted text on surface", fg: "--rn-text-muted", bg: "--rn-surface", kind: "text" },
  {
    label: "Muted text on raised surface",
    fg: "--rn-text-muted",
    bg: "--rn-surface-raised",
    kind: "text",
  },
  {
    label: "Muted text on sunken surface",
    fg: "--rn-text-muted",
    bg: "--rn-surface-sunken",
    kind: "text",
  },
  {
    label: "Inverse text on inverse surface",
    fg: "--rn-text-inverse",
    bg: "--rn-surface-inverse",
    kind: "text",
  },
  {
    label: "Accent link on surface",
    fg: "--rn-accent",
    bg: "--rn-surface",
    kind: "text",
    note: "Brand red-500 is 4.60 here, which clears AA by 0.10. This uses red-600 instead.",
  },
  {
    label: "Accent link hover on surface",
    fg: "--rn-accent-hover",
    bg: "--rn-surface",
    kind: "text",
  },
  {
    label: "Accent link on raised surface",
    fg: "--rn-accent",
    bg: "--rn-surface-raised",
    kind: "text",
  },
  {
    label: "Accent link on subtle accent",
    fg: "--rn-accent",
    bg: "--rn-accent-subtle",
    kind: "text",
  },
  {
    label: "Label on solid accent button",
    fg: "--rn-text-on-accent",
    bg: "--rn-accent-solid",
    kind: "text",
  },
  {
    label: "Label on solid accent button, hover",
    fg: "--rn-text-on-accent",
    bg: "--rn-accent-solid-hover",
    kind: "text",
  },
  { label: "Success on surface", fg: "--rn-success", bg: "--rn-surface", kind: "text" },
  { label: "Warning on surface", fg: "--rn-warning", bg: "--rn-surface", kind: "text" },
  { label: "Danger on surface", fg: "--rn-danger", bg: "--rn-surface", kind: "text" },
  { label: "Info on surface", fg: "--rn-info", bg: "--rn-surface", kind: "text" },
  {
    label: "Success on subtle success",
    fg: "--rn-success",
    bg: "--rn-success-subtle",
    kind: "text",
  },
  {
    label: "Warning on subtle warning",
    fg: "--rn-warning",
    bg: "--rn-warning-subtle",
    kind: "text",
  },
  {
    label: "Danger on subtle danger",
    fg: "--rn-danger",
    bg: "--rn-danger-subtle",
    kind: "text",
  },
  { label: "Info on subtle info", fg: "--rn-info", bg: "--rn-info-subtle", kind: "text" },
  {
    label: "Input border on surface",
    fg: "--rn-border-interactive",
    bg: "--rn-surface",
    kind: "interactive",
    note: "SC 1.4.11. This is the boundary that IS the control.",
  },
  {
    label: "Input border on raised surface",
    fg: "--rn-border-interactive",
    bg: "--rn-surface-raised",
    kind: "interactive",
  },
  {
    label: "Strong border on surface",
    fg: "--rn-border-strong",
    bg: "--rn-surface",
    kind: "interactive",
  },
  {
    label: "Focus ring on surface",
    fg: "--rn-focus-ring",
    bg: "--rn-surface",
    kind: "interactive",
  },
  {
    label: "Inverse focus ring on inverse surface",
    fg: "--rn-focus-ring-inverse",
    bg: "--rn-surface-inverse",
    kind: "interactive",
    note: "An inverse panel carries the other theme's ground, so it needs the other theme's ring. One ring token cannot serve both.",
  },
  {
    label: "Focus ring on solid accent",
    fg: "--rn-focus-ring",
    bg: "--rn-accent-solid",
    kind: "decorative",
    note: "The ring sits on the surface-coloured offset, not directly on the button. Recorded for visibility.",
  },
  {
    label: "Subtle divider on surface",
    fg: "--rn-border-subtle",
    bg: "--rn-surface",
    kind: "decorative",
    note: "Decorative only. Never the sole indicator of a control, so no minimum applies.",
  },
  {
    label: "Subtle divider on raised surface",
    fg: "--rn-border-subtle",
    bg: "--rn-surface-raised",
    kind: "decorative",
  },

  /*
   * The ink flip. A card, a register row and a browse tile all invert on hover and on
   * focus-within, so the flipped state carries its own full set of text pairs. It is the
   * only interactive feedback in a design with no shadows and no borders, which makes these
   * three rows as load-bearing as the rest state.
   */
  {
    label: "Muted text on a flipped card",
    fg: "--rn-text-muted-inverse",
    bg: "--rn-surface-inverse",
    kind: "text",
    note: "The hover and focus state inverts the whole card, so muted copy needs its own value there.",
  },
  {
    label: "Accent text on a flipped card",
    fg: "--rn-red-text-inverse",
    bg: "--rn-surface-inverse",
    kind: "text",
  },
  {
    label: "Interactive boundary on sunken surface",
    fg: "--rn-border-interactive",
    bg: "--rn-surface-sunken",
    kind: "interactive",
    note: "The filter rail sits on the sunken ground, and its checkboxes are boundary-only controls.",
  },
  {
    label: "Strong hairline on surface",
    fg: "--rn-hairline-strong",
    bg: "--rn-surface",
    kind: "decorative",
    note: "Section openers and the ruled VERIFIED stamp. A rule that frames a word carries no information the word does not.",
  },
  {
    label: "Brand silver on the ink band",
    fg: "--rn-silver",
    bg: "--rn-surface-inverse",
    kind: "decorative",
    note: "Silver's only job on a light theme. It is never used on paper.",
  },
  {
    label: "Brand red as a graphic mark",
    fg: "--rn-red",
    bg: "--rn-surface",
    kind: "decorative",
    note: "Registered decorative on purpose. Brand red carries no text and no text sits on it, so it has no contrast obligation. If anyone ever needs it as text it must be re-registered as large-text with the size class documented, rather than the token being weakened to suit.",
  },
];

/*
 * The plate sweep.
 *
 * The imagery system draws exactly one ink colour on a field whose lightness is a theme
 * constant, so its readability is a bounded problem rather than one check per listing. This
 * covers all 360 hues at the chromatic value plus both ends of the neutral band plus the
 * primer, which is every field colour the product can produce.
 */
function plateRows(theme: PlateTheme): Row[] {
  const rows: Row[] = [];
  const k = PLATE[theme];

  let worst = { hex: "", ratio: Number.POSITIVE_INFINITY, hue: 0 };
  for (let hue = 0; hue < 360; hue += 1) {
    const hex = oklchToHex(k.chromaticL, PLATE_CHROMA_MAX, hue);
    const ratio = contrast(PLATE_INK, hex);
    if (ratio < worst.ratio) worst = { hex, ratio, hue };
  }

  const add = (label: string, bg: string, note?: string) =>
    rows.push({
      label,
      fg: "PLATE_INK",
      bg,
      kind: "text",
      note,
      fgHex: PLATE_INK,
      bgHex: bg,
      ratio: contrast(PLATE_INK, bg),
      min: MIN.text,
      pass: contrast(PLATE_INK, bg) >= MIN.text,
    });

  add(
    `Plate ink on the worst of all 360 hues (H ${worst.hue})`,
    worst.hex,
    "A generated sweep, not a sample. Every chromatic paint any dealership ever enters lands on this one lightness, so passing here means no listing can produce an unreadable plate.",
  );
  add("Plate ink on the lightest neutral plate", oklchToHex(k.neutralMaxL, 0.01, 250));
  add("Plate ink on the darkest neutral plate", oklchToHex(k.neutralMinL, 0.01, 250));
  add("Plate ink on primer, where no colour was recorded", primerField(theme));
  add(
    "Plate ink on the worst seeded swatch (Glacier White)",
    plateField("#F4F5F7", "white", theme),
  );

  return rows;
}

// --------------------------------------------------------------------- report

type Row = Pair & { ratio: number; min: number; pass: boolean; fgHex: string; bgHex: string };

function evaluate(tokens: Map<string, string>): Row[] {
  return PAIRS.map((pair) => {
    const fgHex = resolve(pair.fg, tokens);
    const bgHex = resolve(pair.bg, tokens);
    const ratio = contrast(fgHex, bgHex);
    const min = MIN[pair.kind];
    return { ...pair, fgHex, bgHex, ratio, min, pass: ratio >= min };
  });
}

function table(rows: Row[]): string {
  const head =
    "| Pair | Foreground | Background | Ratio | Required | Result |\n|---|---|---|---:|---:|---|";
  const body = rows
    .map(
      (r) =>
        `| ${r.label} | \`${r.fgHex}\` | \`${r.bgHex}\` | ${r.ratio.toFixed(2)} | ` +
        `${r.min === 0 ? "n/a" : r.min.toFixed(1)} | ${r.pass ? "pass" : "**FAIL**"} |`,
    )
    .join("\n");
  return `${head}\n${body}`;
}

function notes(rows: Row[]): string {
  const withNotes = rows.filter((r) => r.note);
  if (withNotes.length === 0) return "";
  return `\n### Notes\n\n${withNotes.map((r) => `- **${r.label}.** ${r.note}`).join("\n")}\n`;
}

function main(): void {
  const css = readFileSync(path.join(root, "src/styles/tokens.css"), "utf8");
  const { light, dark } = parseTokens(css);

  const lightRows = [...evaluate(light), ...plateRows("light")];
  const darkRows = [...evaluate(dark), ...plateRows("dark")];
  const failures = [...lightRows, ...darkRows].filter((r) => !r.pass);

  const report = `# Contrast report

Generated by \`npm run contrast\` from \`src/styles/tokens.css\`. Do not edit by hand.

Thresholds are per pair type, per WCAG 2.2: normal text 4.5:1 (SC 1.4.3), large text 3:1,
interactive boundaries 3:1 (SC 1.4.11), and decorative elements no minimum. A divider that
carries no information is not held to a control's standard, which is why there are two
border tokens rather than one.

**Status: ${failures.length === 0 ? "all pairs pass" : `${failures.length} FAILING`}**

## Light theme

${table(lightRows)}

## Dark theme

${table(darkRows)}
${notes(lightRows)}
## What is deliberately not in this table

Brand red \`#E32432\` as body text, and brand silver \`#B1B4BB\` as light-theme text, are both
absent because the token set does not allow them. For the record:

| Pair | Ratio | Verdict |
|---|---:|---|
| Brand red \`#E32432\` on white | ${contrast("#E32432", "#FFFFFF").toFixed(2)} | Clears AA by 0.10. Too thin to build on, so links use red-600. |
| Brand red \`#E32432\` on brand navy | ${contrast("#E32432", "#001123").toFixed(2)} | Fails. Dark-theme accents use red-300. |
| Brand silver \`#B1B4BB\` on white | ${contrast("#B1B4BB", "#FFFFFF").toFixed(2)} | Fails everything, including the 3:1 non-text minimum. Decorative rules only on light. |
| Brand silver \`#B1B4BB\` on brand navy | ${contrast("#B1B4BB", "#001123").toFixed(2)} | Passes comfortably. This is silver's real job: dark-theme muted text. |
`;

  writeFileSync(path.join(root, "docs/contrast-report.md"), report, "utf8");

  if (failures.length > 0) {
    console.error(`\nContrast check FAILED. ${failures.length} pair(s) below their minimum:\n`);
    for (const f of failures) {
      console.error(
        `  ${f.label}: ${f.fgHex} on ${f.bgHex} = ${f.ratio.toFixed(2)}, needs ${f.min.toFixed(1)}`,
      );
    }
    console.error("\nFix the tokens in src/styles/tokens.css. Do not lower the threshold.\n");
    process.exit(1);
  }

  console.warn(
    `Contrast check passed: ${lightRows.length} light pairs, ${darkRows.length} dark pairs.`,
  );
  console.warn("Wrote docs/contrast-report.md");
}

main();
