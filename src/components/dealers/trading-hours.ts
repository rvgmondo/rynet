import type { Branch } from "@/payload-types";

/**
 * Trading hours, worked out the way a buyer asks about them: "can I go there now?"
 *
 * South Africa keeps a single time zone, UTC+2, with no daylight saving, so the local clock is
 * the UTC clock moved forward two hours. That is deliberate rather than lazy: the server runs in
 * UTC, and the old sidebar called `new Date().getDay()`, which said "Closed today" to anyone
 * looking at a Monday listing between midnight and two in the morning on Sunday night.
 */

export const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type Day = (typeof DAYS)[number];

export const DAY_LABEL: Record<string, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

type HoursSource = Pick<Branch, "tradingHours" | "holidayOverrides">;

const SAST_OFFSET_MS = 2 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** The weekday, minutes past midnight and calendar date on a South African clock. */
export function southAfricanClock(now: Date = new Date()) {
  const local = new Date(now.getTime() + SAST_OFFSET_MS);
  const dayIndex = (local.getUTCDay() + 6) % 7;
  return {
    day: DAYS[dayIndex] as Day,
    minutes: local.getUTCHours() * 60 + local.getUTCMinutes(),
    isoDate: local.toISOString().slice(0, 10),
  };
}

function toMinutes(value: string | null | undefined): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value?.trim() ?? "");
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** A stored date on the South African calendar, whichever way the admin saved it. */
function sastDate(value: string): string | null {
  const time = Date.parse(value);
  if (Number.isNaN(time)) return null;
  return new Date(time + SAST_OFFSET_MS).toISOString().slice(0, 10);
}

type DayHours = { open: boolean; opensAt: string | null; closesAt: string | null };

/** The hours that apply on a date: a public holiday override first, then the weekday row. */
function hoursOn(branch: HoursSource, day: Day, isoDate: string): DayHours | null {
  const override = (branch.holidayOverrides ?? []).find((o) => sastDate(o.date) === isoDate);
  if (override) {
    return {
      open: !override.closed && Boolean(override.opensAt && override.closesAt),
      opensAt: override.opensAt ?? null,
      closesAt: override.closesAt ?? null,
    };
  }
  const row = (branch.tradingHours ?? []).find((h) => h.day === day);
  if (!row) return null;
  return {
    open: !row.closed && Boolean(row.opensAt && row.closesAt),
    opensAt: row.opensAt ?? null,
    closesAt: row.closesAt ?? null,
  };
}

export type OpeningStatus = { open: boolean; text: string };

/**
 * "Open now, closes at 17:30", or "Closed now, opens tomorrow at 08:00".
 *
 * Null when the branch has recorded no hours at all, because a guess is worse than silence.
 * Only call this on a request-time render: a cached page would freeze "Open now".
 */
export function openingStatus(branch: HoursSource, now: Date = new Date()): OpeningStatus | null {
  if (!branch.tradingHours?.length) return null;

  const clock = southAfricanClock(now);
  const today = hoursOn(branch, clock.day, clock.isoDate);
  if (today?.open) {
    const opens = toMinutes(today.opensAt);
    const closes = toMinutes(today.closesAt);
    if (opens !== null && closes !== null) {
      if (clock.minutes < opens) {
        return { open: false, text: `Closed now, opens today at ${today.opensAt}` };
      }
      if (clock.minutes < closes) {
        return { open: true, text: `Open now, closes at ${today.closesAt}` };
      }
    }
  }

  for (let ahead = 1; ahead <= 7; ahead += 1) {
    const next = southAfricanClock(new Date(now.getTime() + ahead * DAY_MS));
    const hours = hoursOn(branch, next.day, next.isoDate);
    if (hours?.open && hours.opensAt) {
      const when = ahead === 1 ? "tomorrow" : DAY_LABEL[next.day];
      return { open: false, text: `Closed now, opens ${when} at ${hours.opensAt}` };
    }
  }

  return { open: false, text: "Closed now" };
}

/** Today's hours as one line, for places that may be cached for a while: "Today 08:00 to 17:30". */
export function todaysHours(branch: HoursSource, now: Date = new Date()): string | null {
  if (!branch.tradingHours?.length) return null;
  const clock = southAfricanClock(now);
  const today = hoursOn(branch, clock.day, clock.isoDate);
  if (!today) return null;
  return today.open ? `Today ${today.opensAt} to ${today.closesAt}` : "Closed today";
}

/** The seven weekday rows in order, for a table. Today is flagged so it can be emphasised. */
export function weekRows(branch: HoursSource, now: Date = new Date()) {
  const clock = southAfricanClock(now);
  return DAYS.flatMap((day) => {
    const row = (branch.tradingHours ?? []).find((h) => h.day === day);
    if (!row) return [];
    const open = !row.closed && Boolean(row.opensAt && row.closesAt);
    return [
      {
        day,
        label: DAY_LABEL[day] ?? day,
        hours: open ? `${row.opensAt} to ${row.closesAt}` : "Closed",
        isToday: day === clock.day,
      },
    ];
  });
}
