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

const t = (label: string, fg: string, bg: string, note?: string): Pair => ({
  label,
  fg,
  bg,
  kind: "text",
  note,
});
const ui = (label: string, fg: string, bg: string, note?: string): Pair => ({
  label,
  fg,
  bg,
  kind: "interactive",
  note,
});
const deco = (label: string, fg: string, bg: string, note?: string): Pair => ({
  label,
  fg,
  bg,
  kind: "decorative",
  note,
});

/*
 * The SHOWROOM pairs. Every ground a piece of text or a control can sit on, per theme. See
 * docs/DESIGN-SHOWROOM.md for which component uses which pair.
 */
const PAIRS: Pair[] = [
  // Ink on the three grounds
  t("Heading on page", "--rn-heading", "--rn-page"),
  t("Heading on card", "--rn-heading", "--rn-card"),
  t("Heading on subtle panel", "--rn-heading", "--rn-subtle"),
  t("Body on page", "--rn-body", "--rn-page"),
  t("Body on card", "--rn-body", "--rn-card"),
  t("Body on subtle panel", "--rn-body", "--rn-subtle"),
  t("Muted on page", "--rn-muted", "--rn-page"),
  t("Muted on card", "--rn-muted", "--rn-card"),
  t("Muted on subtle panel", "--rn-muted", "--rn-subtle"),

  // The navy band (footer, brand panels)
  t("On-navy text on navy band", "--rn-on-navy", "--rn-navy"),
  t("On-navy muted text on navy band", "--rn-on-navy-muted", "--rn-navy"),
  t("On-navy muted text on raised navy", "--rn-on-navy-muted", "--rn-navy-raised"),
  ui(
    "Focus ring on navy band",
    "--rn-focus-ring-on-navy",
    "--rn-navy",
    "The footer and any navy panel draw their ring in this lighter blue.",
  ),

  // Actions
  t(
    "White on primary button",
    "--rn-on-primary",
    "--rn-primary",
    "Brand red #E32432 carries white at only 4.60:1, so every solid red button is #C81E2B.",
  ),
  t("White on primary button, hover", "--rn-on-primary", "--rn-primary-hover"),
  t("White on secondary button", "--rn-on-secondary", "--rn-secondary"),
  t("White on secondary button, hover", "--rn-on-secondary", "--rn-secondary-hover"),
  t("Accent words on page", "--rn-accent", "--rn-page"),
  t("Accent words on card", "--rn-accent", "--rn-card"),
  t("Accent hover on card", "--rn-accent-hover", "--rn-card"),
  t("Accent words on subtle accent", "--rn-accent", "--rn-accent-subtle"),
  // Arrow links inside tinted panels (finance teaser, contact notes, step cards on the SHOWROOM pages)
  t("Accent words on subtle panel", "--rn-accent", "--rn-subtle"),
  t("Accent words on subtle info (links inside a notice)", "--rn-accent", "--rn-info-subtle"),
  t("Muted on subtle info (small print inside a notice)", "--rn-muted", "--rn-info-subtle"),

  // Status: badges and notices put the status colour on its own subtle ground
  t("Success on card", "--rn-success", "--rn-card"),
  t("Success on subtle success", "--rn-success", "--rn-success-subtle"),
  t("Warning on card", "--rn-warning", "--rn-card"),
  t("Warning on subtle warning", "--rn-warning", "--rn-warning-subtle"),
  t("Danger on card", "--rn-danger", "--rn-card"),
  t("Danger on subtle danger", "--rn-danger", "--rn-danger-subtle"),
  t("Info on card", "--rn-info", "--rn-card"),
  t("Info on subtle info", "--rn-info", "--rn-info-subtle"),
  t("Body on subtle info (notice text)", "--rn-body", "--rn-info-subtle"),
  t("Body on subtle warning (notice text)", "--rn-body", "--rn-warning-subtle"),
  t("Heading on subtle info (notice title)", "--rn-heading", "--rn-info-subtle"),
  t("Heading on subtle warning (notice title)", "--rn-heading", "--rn-warning-subtle"),

  // Controls (SC 1.4.11)
  ui(
    "Control border on card",
    "--rn-line-control",
    "--rn-card",
    "SC 1.4.11. Inputs, selects, checkboxes and outline buttons are drawn with this, and it is the boundary that IS the control.",
  ),
  ui("Control border on page", "--rn-line-control", "--rn-page"),
  ui("Control border on subtle panel", "--rn-line-control", "--rn-subtle"),
  ui(
    "Checked checkbox or radio fill on card",
    "--rn-control-checked",
    "--rn-card",
    "The checked state is carried by the fill, so the fill is held to the non-text minimum.",
  ),
  ui("Checked checkbox or radio fill on subtle panel", "--rn-control-checked", "--rn-subtle"),
  ui("Focus ring on page", "--rn-focus-ring", "--rn-page"),
  ui("Focus ring on card", "--rn-focus-ring", "--rn-card"),
  ui("Focus ring on subtle panel", "--rn-focus-ring", "--rn-subtle"),

  // The older inverse pair, which flips with the theme
  t("Inverse text on inverse ground", "--rn-text-inverse", "--rn-surface-inverse"),
  t("Inverse muted text on inverse ground", "--rn-text-muted-inverse", "--rn-surface-inverse"),
  t("Inverse accent words on inverse ground", "--rn-red-text-inverse", "--rn-surface-inverse"),
  ui("Inverse focus ring on inverse ground", "--rn-focus-ring-inverse", "--rn-surface-inverse"),

  // Decorative
  deco(
    "Divider on card",
    "--rn-line",
    "--rn-card",
    "Decorative only. Never the sole indicator of a control, so no minimum applies.",
  ),
  deco("Strong divider on page", "--rn-line-strong", "--rn-page"),
  deco("Divider on navy band", "--rn-line-on-navy", "--rn-navy"),
  deco(
    "Brand red as a graphic mark",
    "--rn-brand-red",
    "--rn-card",
    "Registered decorative on purpose. Brand red carries no text and no text sits on it. If it is ever needed as text it must be re-registered with its size class, rather than the token being weakened to suit.",
  ),
  deco("Brand mark ink on card", "--rn-mark-ink", "--rn-card"),
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
| White on brand red \`#E32432\` | ${contrast("#E32432", "#FFFFFF").toFixed(2)} | Clears AA by 0.10. Too thin to build on, so solid buttons use \`#C81E2B\` and red words use \`#B81B29\`. |
| Brand red \`#E32432\` on brand navy | ${contrast("#E32432", "#001123").toFixed(2)} | Fails as text. Dark-theme red words use \`#FF7079\`. |
| Brand silver \`#B1B4BB\` on white | ${contrast("#B1B4BB", "#FFFFFF").toFixed(2)} | Fails everything, including the 3:1 non-text minimum. Decorative rules only on light. |
| Brand silver \`#B1B4BB\` on brand navy | ${contrast("#B1B4BB", "#001123").toFixed(2)} | Passes comfortably. Silver belongs on navy, which is where the dark-theme mark uses it. |
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
