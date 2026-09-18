/**
 * Times on the admin home screen, in South African time and plain words.
 *
 * The server runs in whatever timezone the host is set to, so every figure here is read in
 * Africa/Johannesburg explicitly. Month names are written out here rather than taken from
 * Intl, because ICU versions disagree on whether September is "Sep" or "Sept".
 */

export const ADMIN_TIME_ZONE = "Africa/Johannesburg";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = [
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
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type Parts = { year: number; month: number; day: number; hour: number; minute: number };

const partsFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: ADMIN_TIME_ZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  hourCycle: "h23",
});

function partsOf(date: Date): Parts {
  const out: Partial<Record<string, number>> = {};
  for (const part of partsFormatter.formatToParts(date)) {
    if (part.type !== "literal") out[part.type] = Number(part.value);
  }
  const hour = out.hour ?? 0;
  return {
    year: out.year ?? 1970,
    month: out.month ?? 1,
    day: out.day ?? 1,
    hour: hour === 24 ? 0 : hour,
    minute: out.minute ?? 0,
  };
}

/** Days since the epoch for the calendar date, so "yesterday" survives a month boundary. */
function dayNumber(p: Parts): number {
  return Math.floor(Date.UTC(p.year, p.month - 1, p.day) / 86_400_000);
}

const two = (n: number) => String(n).padStart(2, "0");

/** "Good morning" before noon, "Good afternoon" before five, then "Good evening". */
export function greeting(now: Date): string {
  const { hour } = partsOf(now);
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** "Wednesday 16 September 2026". */
export function longDate(now: Date): string {
  const p = partsOf(now);
  const weekday = WEEKDAYS[new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay()];
  return `${weekday} ${p.day} ${MONTHS_LONG[p.month - 1]} ${p.year}`;
}

/**
 * "Today, 14:05", "Yesterday, 09:12", "3 Sep, 10:35", or "3 Sep 2025" for an earlier year.
 */
export function whenLabel(value: Date | string, now: Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "Date not recorded";
  const p = partsOf(date);
  const n = partsOf(now);
  const time = `${two(p.hour)}:${two(p.minute)}`;
  const diff = dayNumber(n) - dayNumber(p);
  if (diff === 0) return `Today, ${time}`;
  if (diff === 1) return `Yesterday, ${time}`;
  if (p.year !== n.year) return `${p.day} ${MONTHS[p.month - 1]} ${p.year}`;
  return `${p.day} ${MONTHS[p.month - 1]}, ${time}`;
}

/**
 * Words that name a role, a team or the business rather than a person. The seeded account is
 * called "Platform admin", and "Good afternoon, Platform" greets nobody.
 */
const NOT_A_PERSON = new Set([
  "admin",
  "administrator",
  "platform",
  "staff",
  "team",
  "sales",
  "support",
  "office",
  "reception",
  "account",
  "accounts",
  "user",
  "test",
  "demo",
  "example",
  "system",
  "info",
  "rynet",
  "dealer",
  "dealership",
  "principal",
  "manager",
]);

/**
 * The first name, for a greeting, when the account's name looks like a person's: "Ruben" from
 * "Ruben van der Merwe". Nothing at all when there is no name, or when the name is a role, a team,
 * an email address or has digits in it ("Platform admin", "Sales team", "agent2").
 */
export function firstName(name: unknown): string | null {
  if (typeof name !== "string") return null;
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0];
  if (!first) return null;
  if (/[@\d]/.test(name)) return null;
  if (!/^\p{L}/u.test(first)) return null;
  const isRole = words.some((word) =>
    NOT_A_PERSON.has(word.toLowerCase().replace(/[^\p{L}]/gu, "")),
  );
  return isRole ? null : first;
}
