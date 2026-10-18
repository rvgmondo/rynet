/**
 * Personalising a mailing: {{dealership}} becomes "Amico Motors" for Amico and "Highveld Motor
 * Group" for Highveld. Pure, so what each dealership receives can be tested and previewed.
 *
 * An unknown field is not silently left in as "{{dealrship}}" for a dealer principal to read: the
 * Mailer refuses to send until every field in the words is one of these.
 */

export const MERGE_FIELDS = {
  firstName: "The contact's first name, or nothing",
  dealership: "The dealership's trading name",
  showroomUrl: "Their showroom on Rynet",
  portalUrl: "Where they sign in to their portal",
  liveCars: "How many of their cars are live",
  newEnquiries: "How many enquiries are waiting for an answer",
} as const;

export type MergeField = keyof typeof MERGE_FIELDS;
export type MergeValues = Record<MergeField, string>;

const FIELD = /\{\{\s*([a-zA-Z]+)\s*\}\}/g;

/** Every field used in these words that is not one Rynet knows how to fill. */
export function unknownFields(...texts: string[]): string[] {
  const unknown = new Set<string>();
  for (const text of texts) {
    for (const match of text.matchAll(FIELD)) {
      const name = match[1] ?? "";
      if (!(name in MERGE_FIELDS)) unknown.add(name);
    }
  }
  return [...unknown];
}

export function merge(text: string, values: MergeValues): string {
  return (
    text
      .replace(FIELD, (whole, name: string) =>
        name in values ? values[name as MergeField] : whole,
      )
      // "Hi {{firstName}}," with no name on record reads "Hi ,". Tidy the gap it leaves.
      .replace(/ +([,.!?])/g, "$1")
  );
}
