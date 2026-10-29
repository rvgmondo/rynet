import { describe, expect, it } from "vitest";

import { formatReport, isQuietMonth, type MonthStats, monthRange } from "./dealer-month";

const stats = (over: Partial<MonthStats> = {}): MonthStats => ({
  dealer: "Melrose Auto",
  month: "2026-11",
  carsLive: 47,
  carsAdded: 47,
  carsSold: 2,
  views: 40,
  messages: 1,
  phoneReveals: 0,
  whatsappTaps: 1,
  topCars: [{ title: "2021 BMW M3", views: 12 }],
  ...over,
});

describe("monthly dealer report", () => {
  it("runs the month in South African time", () => {
    expect(monthRange("2026-11")).toEqual({
      from: "2026-10-31T22:00:00.000Z",
      to: "2026-11-30T22:00:00.000Z",
    });
    expect(monthRange("2026-12").to).toBe("2026-12-31T22:00:00.000Z");
    expect(() => monthRange("2026-13")).toThrow();
  });

  it("leads with the work when the numbers are small", () => {
    const { subject, body } = formatReport(
      stats(),
      ["Faster car pages"],
      ["Loaded 47 cars"],
      "Guy",
    );
    expect(subject).toBe("Your cars on Rynet in November 2026");
    expect(body.startsWith("Hi Guy,")).toBe(true);
    expect(body.indexOf("What we did for Melrose Auto")).toBeLessThan(body.indexOf("Your numbers"));
    expect(body).toContain("47 cars live on Rynet today, 47 added in November, 2 marked sold");
    expect(body).toContain("2 buyer contacts: 1 message, 0 phone numbers revealed, 1 WhatsApp tap");
  });

  it("leads with the numbers when there is something to show", () => {
    const busy = stats({ views: 800, messages: 6 });
    expect(isQuietMonth(busy)).toBe(false);
    const { body } = formatReport(busy, ["Faster car pages"], []);
    expect(body.indexOf("Your numbers")).toBeLessThan(body.indexOf("What we improved"));
    expect(body).toContain("Most viewed: 2021 BMW M3 (12)");
  });

  it("never uses dashes, ellipses or middots a person would read", () => {
    const { subject, body } = formatReport(stats(), ["One"], ["Two"]);
    expect(`${subject}\n${body}`).not.toMatch(/[—–…·]/);
  });
});
