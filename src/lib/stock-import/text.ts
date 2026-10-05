/**
 * Cleaning up what a dealership's own website says about a car.
 *
 * TWO OF THESE ARE ABOUT PEOPLE, NOT TIDINESS.
 *
 * `cleanDescription` takes salespeople's names, cellphone numbers, landline numbers and email
 * addresses out of a car's description. Two reasons, and the second is the bigger one:
 *
 *   1. They are somebody's personal information. A name and a cellphone number belong to a person
 *      who has not agreed to have them republished on a marketplace, and they outlive the job:
 *      twelve of Amico's descriptions carry a first name and a cellphone number typed in months
 *      ago, and one of those people may have left.
 *   2. They route around Rynet. A buyer who dials the number in the paragraph is not a lead, is
 *      never recorded, and the dealership can never be shown what Rynet brought them. Every car
 *      already carries the dealership's own phone, WhatsApp and enquiry form, put there by the
 *      listing page, which is where a buyer should be sent.
 *
 * Prices, mileages and years survive: a South African phone number is ten digits starting with a
 * zero, or nine after +27, and "R 249 900" and "170 000 km" are neither.
 *
 * The rest is presentation. The paragraphs a website writes are not the shape Payload's editor
 * stores, so `lexicalParagraphs` builds that shape from plain text.
 */

/**
 * A South African phone number, however it was typed.
 *
 * Ten digits starting with a zero, or the same nine after a country code (with or without the
 * "(0)" people put after it), with spaces, dots, dashes and brackets anywhere between them.
 * Written once and used below, so the landline in "(012) 335-1640" and the cellphone in
 * "0820000001" are the same rule.
 */
const PHONE = String.raw`(?:\+?\s?27(?:\s?\(0\))?|\(?(?<!\d)0)(?:[\s().\-]*\d){9}(?!\d)`;

/** What people type between the words and numbers of a contact line. */
const SEP = String.raw`[\s:,.\-/&]*`;

/** The words people put in front of a number, in the cases they write them in. */
const CTA_WORD = String.raw`\b(?:[Cc]all|CALL|[Cc]ontact|CONTACT|[Pp]hone|PHONE|[Rr]ing|[Ss]ms|SMS|[Ww]hats\s?[Aa]pp|WHATSAPP|[Dd]ial|[Ss]peak\s+to|[Aa]sk\s+for|[Tt]el|TEL|[Cc]ell|CELL|[Ee]mail|EMAIL|[Mm]ail)\b`;

/** "or" and "and" between two of those words, as in "Call or WhatsApp". */
const CONNECTOR = String.raw`\b(?:or|and|OR|AND)\b`;

/** One or more of those words, joined however they were typed, and whatever follows them. */
const CALL_TO_ACTION = `(?:${CTA_WORD}(?:${SEP}(?:${CONNECTOR}${SEP})?${CTA_WORD}){0,3}${SEP})`;

/** A person's first name, or a first name and a surname, as typed in front of a number. */
const NAME = String.raw`(?:\b[A-Z][a-zA-Z'-]{1,15}\b[\s:,.\-]*)`;

/**
 * Words that start the next sentence rather than naming the person whose number went before.
 *
 * A capitalised word straight after a number is usually the salesperson ("0820000001 Thandi"),
 * but "082 000 0000 Monday to Friday" is not, so the name after a number is only taken when it is
 * not one of these, and only when what follows it could not be the rest of a sentence.
 */
const NOT_A_NAME = String.raw`(?:Today|Now|Anytime|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tue|Wed|Thu|Fri|Sat|Sun|Still|This|The|These|Full|We|Our|No|Yes|For|Price|Finance|Great|Also|And|Or|With)\b`;

/** The name typed after a number: followed by the end, by punctuation or by another capital. */
const TRAILING_NAME = String.raw`(?:[ \t]+(?!${NOT_A_NAME})[A-Z][a-z'-]{1,15}(?=\s*$|\s*[.,;!?]|\s+[A-Z]))`;

const CONTACT_RUN = new RegExp(
  `${CALL_TO_ACTION}?${NAME}{0,2}(?:${PHONE})(?:${SEP}(?:${CONNECTOR})?${SEP}(?:${PHONE}))*${TRAILING_NAME}?`,
  "g",
);

const EMAIL_RUN = new RegExp(
  `${CALL_TO_ACTION}?[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}${TRAILING_NAME}?`,
  "g",
);

/**
 * A person asked for by name, with no number beside them: "ask for Thandi", "speak to Sipho".
 *
 * Only after the two phrases that are never followed by anything but a person. "Contact the
 * sales team" and "Call us" are left alone, because what follows them is not a name.
 */
const ASK_FOR_NAME =
  /\b(?:[Aa]sk\s+for|[Ss]peak\s+to)\s+(?!the\b|our\b|us\b|a\b|an\b)[A-Z][a-z'-]{1,15}(?:\s+[A-Z][a-z'-]{1,15})?\b/g;

/** A call to action left stranded at the end once its number has gone. */
const TRAILING_CALL_TO_ACTION = new RegExp(`${CALL_TO_ACTION}(?:${CONNECTOR}${SEP})?$`);

/**
 * Takes the people out of a car's description and leaves the car in it.
 *
 * Returns the cleaned text and what it removed, because an import that quietly rewrites a
 * dealership's words should at least be able to say what it changed.
 */
export function cleanDescription(input: string | null | undefined): {
  text: string;
  removedPhones: number;
  removedEmails: number;
  removedNames: number;
} {
  if (!input) return { text: "", removedPhones: 0, removedEmails: 0, removedNames: 0 };

  let removedPhones = 0;
  let removedEmails = 0;
  let removedNames = 0;

  let text = input.replace(EMAIL_RUN, () => {
    removedEmails += 1;
    return " ";
  });

  text = text.replace(CONTACT_RUN, (run) => {
    removedPhones += (run.match(new RegExp(PHONE, "g")) ?? []).length;
    return " ";
  });

  text = text.replace(ASK_FOR_NAME, () => {
    removedNames += 1;
    return " ";
  });

  text = text.replace(TRAILING_CALL_TO_ACTION, " ");

  return { text: tidyPunctuation(text), removedPhones, removedEmails, removedNames };
}

/**
 * A price in whole rands, from however the page wrote it.
 *
 * "R169 000", "R 169,000" and "R169 000.00" are all 169000. The cents are dropped before the
 * digits are joined, because "169 000.00" read as one number is R 16 900 000.
 */
export function wholeRands(input: string | null | undefined): number | null {
  if (!input) return null;
  const withoutCents = input.replace(/(\d)[.,]\d{2}(?!\d)/g, "$1");
  return firstNumber(withoutCents);
}

/**
 * Spacing and stray punctuation, the way a person would have typed it.
 *
 * Amico's descriptions are written with spaces before their commas and full stops, and taking a
 * phone number out of the middle of one leaves a gap and an orphaned comma behind it.
 */
export function tidyPunctuation(input: string): string {
  return input
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([,.;:])\1+/g, "$1")
    .replace(/([,;:])\s*\./g, ".")
    .replace(/\s*-\s*$/, "")
    .replace(/^[\s,.;:-]+/, "")
    .replace(/[\s,;:-]+$/, "")
    .trim();
}

/** Splits cleaned text into paragraphs on blank lines, dropping the empty ones. */
export function toParagraphs(input: string): string[] {
  return input
    .split(/\n{2,}/)
    .map((part) => tidyPunctuation(part))
    .filter((part) => part.length > 0);
}

type LexicalText = {
  type: "text";
  detail: number;
  format: number;
  mode: "normal";
  style: string;
  text: string;
  version: number;
};

type LexicalParagraph = {
  type: "paragraph";
  children: LexicalText[];
  direction: "ltr";
  format: "";
  indent: number;
  textFormat: number;
  version: number;
};

export type LexicalValue = {
  root: {
    type: "root";
    children: LexicalParagraph[];
    direction: "ltr";
    format: "";
    indent: number;
    version: number;
  };
};

/**
 * Plain paragraphs as the editor stores them.
 *
 * The description field is rich text, and rich text in Payload is a Lexical document rather than a
 * string. This is the smallest valid one: a root holding a paragraph per line, each holding one
 * unformatted run of text. Nothing here is styled, because a stock import has no business
 * inventing emphasis a dealership did not write.
 */
export function lexicalParagraphs(paragraphs: string[]): LexicalValue | null {
  const kept = paragraphs.map((text) => text.trim()).filter((text) => text.length > 0);
  if (kept.length === 0) return null;

  return {
    root: {
      type: "root",
      direction: "ltr",
      format: "",
      indent: 0,
      version: 1,
      children: kept.map((text) => ({
        type: "paragraph",
        direction: "ltr",
        format: "",
        indent: 0,
        textFormat: 0,
        version: 1,
        children: [
          { type: "text", detail: 0, format: 0, mode: "normal", style: "", text, version: 1 },
        ],
      })),
    },
  };
}

/** The readable text back out of a stored rich text value, for comparing one run with the next. */
export function lexicalToText(value: unknown): string {
  const out: string[] = [];
  const walk = (node: unknown): void => {
    if (!node || typeof node !== "object") return;
    const record = node as { text?: unknown; children?: unknown; root?: unknown };
    if (record.root) walk(record.root);
    if (typeof record.text === "string") out.push(record.text);
    if (Array.isArray(record.children)) for (const child of record.children) walk(child);
  };
  walk(value);
  return tidyPunctuation(out.join(" "));
}

/**
 * Lower case, no accents, no punctuation, single spaces. What two names are compared as.
 *
 * The accents come off before the punctuation does, so "Mégane" is compared as "megane" rather
 * than as "m gane", and a page that spells it either way finds the same model.
 */
export function normaliseKey(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Capitalises each word, leaving anything that already carries a capital alone. */
export function titleCaseWords(input: string): string {
  if (/[A-Z]/.test(input)) return input.trim();
  return input
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** The colour words the site groups its filters by, longest first so "dark grey" beats "red". */
const COLOUR_WORDS = [
  "white",
  "silver",
  "grey",
  "gray",
  "black",
  "blue",
  "red",
  "green",
  "beige",
  "brown",
  "gold",
  "orange",
  "yellow",
  "purple",
  "charcoal",
  "bronze",
];

/** Words that come glued to a colour word on this source, for example "greymetallic". */
const COLOUR_MODIFIERS = ["metallic", "pearl", "light", "dark", "pure", "mica", "solid"];

/**
 * A colour name written the way a person would write it.
 *
 * Amico's colour field holds everything from "Candy White" to "greymetallic". The second kind is
 * one word with no capital in it, so the words are separated again before it is title cased, which
 * keeps "Grey Metallic" out of a filter list that would otherwise read like a typing accident.
 */
export function tidyColourName(input: string): string {
  const trimmed = input.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";

  if (!/\s/.test(trimmed) && !/[A-Z]/.test(trimmed)) {
    let split = trimmed;
    for (const word of [...COLOUR_WORDS, ...COLOUR_MODIFIERS]) {
      split = split.replace(new RegExp(`(?<=.)(${word})`, "g"), " $1");
      split = split.replace(new RegExp(`(${word})(?=.)`, "g"), "$1 ");
    }
    return titleCaseWords(split.replace(/\s+/g, " ").trim());
  }

  return titleCaseWords(trimmed);
}

/** Which of the site's colour groups a colour name belongs to, or null when it says nothing. */
export function colourFamilyOf(input: string): string | null {
  const key = normaliseKey(input);
  if (!key) return null;
  for (const word of COLOUR_WORDS) {
    if (new RegExp(`\\b${word}\\b`).test(key)) {
      if (word === "gray") return "grey";
      if (word === "charcoal") return "grey";
      if (word === "bronze") return "brown";
      return word;
    }
  }
  return null;
}

/** The first whole number in a string, ignoring spaces and commas inside it, or null. */
export function firstNumber(input: string | null | undefined): number | null {
  if (!input) return null;
  const match = input.replace(/\u00a0/g, " ").match(/\d[\d\s,.]*/);
  if (!match) return null;
  const digits = match[0].replace(/[^\d]/g, "");
  if (!digits) return null;
  const value = Number.parseInt(digits, 10);
  return Number.isFinite(value) ? value : null;
}
