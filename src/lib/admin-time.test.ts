import { describe, expect, it } from "vitest";

import { firstName, greeting, longDate, whenLabel } from "./admin-time";

// 16 September 2026, 14:05 in Johannesburg (UTC+2).
const NOW = new Date("2026-09-16T12:05:00Z");

describe("greeting", () => {
  it("reads the hour in Johannesburg, not on the server", () => {
    // 09:59 UTC is 11:59 in Johannesburg.
    expect(greeting(new Date("2026-09-16T09:59:00Z"))).toBe("Good morning");
    expect(greeting(new Date("2026-09-16T10:00:00Z"))).toBe("Good afternoon");
    expect(greeting(new Date("2026-09-16T14:59:00Z"))).toBe("Good afternoon");
    expect(greeting(new Date("2026-09-16T15:00:00Z"))).toBe("Good evening");
    // 23:30 UTC is already 01:30 the next morning in Johannesburg.
    expect(greeting(new Date("2026-09-16T23:30:00Z"))).toBe("Good morning");
  });
});

describe("longDate", () => {
  it("writes the weekday, day, month and year out in full", () => {
    expect(longDate(NOW)).toBe("Wednesday 16 September 2026");
  });

  it("uses the Johannesburg date across midnight UTC", () => {
    expect(longDate(new Date("2026-09-16T22:30:00Z"))).toBe("Thursday 17 September 2026");
  });
});

describe("whenLabel", () => {
  it("says today with the time", () => {
    expect(whenLabel("2026-09-16T06:30:00Z", NOW)).toBe("Today, 08:30");
  });

  it("says yesterday across a month boundary", () => {
    const first = new Date("2026-10-01T08:00:00Z");
    expect(whenLabel("2026-09-30T19:15:00Z", first)).toBe("Yesterday, 21:15");
  });

  it("gives the day and short month this year", () => {
    expect(whenLabel("2026-09-03T08:35:00Z", NOW)).toBe("3 Sep, 10:35");
  });

  it("gives the year instead of the time for an earlier year", () => {
    expect(whenLabel("2025-12-24T08:00:00Z", NOW)).toBe("24 Dec 2025");
  });

  it("does not invent a date it cannot read", () => {
    expect(whenLabel("not a date", NOW)).toBe("Date not recorded");
  });
});

describe("firstName", () => {
  it("takes the first word", () => {
    expect(firstName("  Ruben van der Merwe ")).toBe("Ruben");
  });

  it("returns nothing for an empty or missing name", () => {
    expect(firstName("")).toBeNull();
    expect(firstName(undefined)).toBeNull();
  });
});
