/**
 * WhatsApp links with the message already written, for staff to send from their own phone.
 *
 * Rynet sends nothing on anyone's behalf: the link opens WhatsApp with the text in the box and
 * the person decides whether to press send. That is also why it works with no email set up.
 */

/** A South African number as WhatsApp wants it, 27 and the nine digits, or null if it is not one. */
export function whatsappNumber(input: string | null | undefined): string | null {
  const digits = (input ?? "").replace(/\D/g, "");
  if (/^0\d{9}$/.test(digits)) return `27${digits.slice(1)}`;
  if (/^27\d{9}$/.test(digits)) return digits;
  if (/^\d{9}$/.test(digits) && /^[1-9]/.test(digits)) return `27${digits}`;
  return null;
}

export function whatsappLink(number: string | null, text: string): string {
  const query = `text=${encodeURIComponent(text)}`;
  return number ? `https://wa.me/${number}?${query}` : `https://wa.me/?${query}`;
}

export function firstNameOf(name: string | null | undefined): string {
  return (name ?? "").trim().split(/\s+/)[0] ?? "";
}

/** The message that tells a dealership it is live, with the link to its showroom. */
export function liveMessage(options: {
  contactName: string | null | undefined;
  showroomUrl: string;
  liveCars: number;
  fromWebsite: boolean;
  /** True while their cars are still being read, so the message can say so honestly. */
  loading?: boolean;
}): string {
  const first = firstNameOf(options.contactName);
  const cars =
    options.liveCars === 1
      ? "1 of your cars is on it"
      : `${options.liveCars} of your cars are on it`;
  const upkeep = options.fromWebsite
    ? " They stay up to date from your website on their own, so there is nothing for you to do."
    : "";
  return [
    `Hi${first ? ` ${first}` : ""}, you are live on Rynet. Here is your showroom: ${options.showroomUrl}`,
    "",
    ...(options.liveCars > 0
      ? [`${cars}.${upkeep}`, ""]
      : options.loading
        ? [`Your cars are being loaded now.${upkeep}`, ""]
        : []),
    "Any questions, just reply here.",
  ].join("\n");
}
