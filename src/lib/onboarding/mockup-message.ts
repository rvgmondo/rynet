import { firstNameOf } from "./whatsapp";

/**
 * The WhatsApp message that sends a dealership its mockup.
 *
 * Short, personal and about them: the link, that it is private, and one easy question. No price,
 * no pitch: the mockup is the pitch.
 */
export function mockupMessage(options: {
  contactName: string | null | undefined;
  dealership: string;
  link: string;
}): string {
  const first = firstNameOf(options.contactName);
  return [
    `Hi${first ? ` ${first}` : ""}, here is the new homepage we designed for ${options.dealership}: ${options.link}`,
    "",
    "It is private: only you have this link, and search engines never see it. Have a look on your phone too.",
    "",
    "What do you think?",
  ].join("\n");
}

/** "Not opened yet", or when it was first opened and how often since. */
export function openedLabel(
  firstViewedAt: string | null | undefined,
  viewCount: number | null | undefined,
  now: Date = new Date(),
): string {
  if (!firstViewedAt) return "Not opened yet.";
  const at = new Date(firstViewedAt);
  const days = Math.floor((now.getTime() - at.getTime()) / 86_400_000);
  const when =
    days <= 0
      ? `today at ${at.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}`
      : days === 1
        ? "yesterday"
        : `${days} days ago`;
  const times = viewCount && viewCount > 1 ? `, ${viewCount} times so far` : "";
  return `Opened ${when}${times}. A good moment to call.`;
}
