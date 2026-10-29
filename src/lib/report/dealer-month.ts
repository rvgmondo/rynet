/**
 * "Your cars on Rynet in <month>": the short monthly report each dealership gets.
 *
 * Real numbers only, every one read from the database: cars live today, cars that went live and
 * sold in the month, views (src/lib/track/views.ts), and the three kinds of contact: a message
 * through the site, a revealed phone number, a WhatsApp tap. When the numbers are small, the email
 * leads with the work we did, because a small number with nothing beside it reads as failure and
 * the dealership did nothing wrong.
 *
 * The month runs in South African time. Views are stored by South African day; leads and dates
 * are compared against the month's start and end in the same zone.
 */

export type MonthStats = {
  dealer: string;
  month: string; // yyyy-mm
  carsLive: number;
  carsAdded: number;
  carsSold: number;
  views: number;
  messages: number;
  phoneReveals: number;
  whatsappTaps: number;
  topCars: { title: string; views: number }[];
};

/** Lead types a buyer leaves about a dealership's cars. Agency and sign-up leads are Rynet's own. */
export const MESSAGE_TYPES = [
  "enquiry",
  "test_drive",
  "finance",
  "trade_in",
  "callback",
  "dealer_contact",
] as const;

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function monthName(month: string): string {
  const [year, m] = month.split("-").map(Number);
  return `${MONTHS[(m ?? 1) - 1]} ${year}`;
}

/** The month as an ISO range in South African time (UTC+2, no daylight saving). */
export function monthRange(month: string): { from: string; to: string } {
  const [year, m] = month.split("-").map(Number);
  if (!year || !m || m < 1 || m > 12) throw new Error(`Not a month: ${month}`);
  const from = new Date(Date.UTC(year, m - 1, 1, -2));
  const to = new Date(Date.UTC(year, m, 1, -2));
  return { from: from.toISOString(), to: to.toISOString() };
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Small enough that the work we did goes first. */
export function isQuietMonth(s: MonthStats): boolean {
  return s.views < 100 && s.messages + s.phoneReveals + s.whatsappTaps < 3;
}

/**
 * The email, plain text. `improvements` are the month's real changes to Rynet, one line each,
 * written by a person; `work` is what we did for this dealership (loading, updating), likewise.
 */
export function formatReport(
  s: MonthStats,
  improvements: string[],
  work: string[],
  firstName = "there",
): { subject: string; body: string } {
  const name = monthName(s.month);
  const contacts = s.messages + s.phoneReveals + s.whatsappTaps;

  const numbers = [
    `${plural(s.carsLive, "car", "cars")} live on Rynet today` +
      (s.carsAdded ? `, ${s.carsAdded} added in ${name.split(" ")[0]}` : "") +
      (s.carsSold ? `, ${s.carsSold} marked sold` : ""),
    `${plural(s.views, "view", "views")} of your cars`,
    `${plural(contacts, "buyer contact", "buyer contacts")}: ` +
      [
        plural(s.messages, "message", "messages"),
        plural(s.phoneReveals, "phone number revealed", "phone numbers revealed"),
        plural(s.whatsappTaps, "WhatsApp tap", "WhatsApp taps"),
      ].join(", "),
  ];
  if (s.topCars.length && s.views > 0) {
    numbers.push(
      `Most viewed: ${s.topCars.map((car) => `${car.title} (${car.views})`).join(", ")}`,
    );
  }

  const bullets = (lines: string[]) => lines.map((line) => `- ${line}`).join("\n");
  const workBlock = work.length ? `What we did for ${s.dealer}:\n${bullets(work)}` : "";
  const improvedBlock = improvements.length
    ? `What we improved on Rynet:\n${bullets(improvements)}`
    : "";
  const numbersBlock = `Your numbers for ${name}:\n${bullets(numbers)}`;

  const quiet = isQuietMonth(s);
  const opener = quiet
    ? `Here's your Rynet update for ${name}. We're still early, so the numbers are small, and here's what we've been doing.`
    : `Here's how your cars did on Rynet in ${name}.`;
  const blocks = quiet
    ? [workBlock, improvedBlock, numbersBlock]
    : [numbersBlock, workBlock, improvedBlock];

  const body = [
    `Hi ${firstName},`,
    opener,
    ...blocks.filter(Boolean),
    "We keep loading and updating your cars ourselves, so there's nothing you need to do. If anything on your listings looks wrong, just reply to this email.",
    "Ruben\nRynet, rynet.co.za",
  ].join("\n\n");

  return { subject: `Your cars on Rynet in ${name}`, body };
}
