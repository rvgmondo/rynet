import { afterEach, describe, expect, it } from "vitest";

import {
  addView,
  flushDue,
  isCrawler,
  resetViews,
  restorePending,
  takePending,
  viewDay,
} from "./views";

afterEach(() => resetViews());

describe("car view counter", () => {
  it("counts a visitor once per car per day", () => {
    const at = new Date("2026-10-29T08:00:00Z");
    expect(addView("a", 1, 13, at)).toBe(true);
    expect(addView("a", 1, 13, at)).toBe(false);
    expect(addView("b", 1, 13, at)).toBe(true);
    expect(addView("a", 2, 13, at)).toBe(true);
    expect(takePending()).toEqual([
      { vehicle: 1, dealer: 13, day: "2026-10-29", views: 2 },
      { vehicle: 2, dealer: 13, day: "2026-10-29", views: 1 },
    ]);
  });

  it("counts the same visitor again the next South African day", () => {
    expect(addView("a", 1, 13, new Date("2026-10-29T21:00:00Z"))).toBe(true);
    // 22:30 UTC is already 30 Oct in Johannesburg.
    expect(addView("a", 1, 13, new Date("2026-10-29T22:30:00Z"))).toBe(true);
    expect(takePending().map((row) => row.day)).toEqual(["2026-10-29", "2026-10-30"]);
  });

  it("writes after a minute, not before", () => {
    const at = new Date();
    addView("a", 1, 13, at);
    expect(flushDue(at.getTime() + 30_000)).toBe(false);
    expect(flushDue(at.getTime() + 60_000)).toBe(true);
  });

  it("keeps views from a failed write", () => {
    addView("a", 1, 13);
    const rows = takePending();
    addView("b", 1, 13);
    restorePending(rows);
    expect(takePending()[0]?.views).toBe(2);
  });

  it("does not count crawlers or link previews", () => {
    expect(isCrawler("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe(true);
    expect(isCrawler("WhatsApp/2.23.20.0")).toBe(true);
    expect(isCrawler(null)).toBe(true);
    expect(isCrawler("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1")).toBe(
      false,
    );
  });

  it("names the day in South African time", () => {
    expect(viewDay(new Date("2026-10-31T22:30:00Z"))).toBe("2026-11-01");
  });
});
