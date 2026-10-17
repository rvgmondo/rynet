import { describe, expect, it } from "vitest";

import { expiryLabel, extendedUntil, isExpired } from "./preview-link";

const NOW = new Date("2026-10-17T12:00:00.000Z");

describe("a mockup link's life", () => {
  it("has ended once its date has passed, and not before", () => {
    expect(isExpired("2026-10-17T11:59:00.000Z", NOW)).toBe(true);
    expect(isExpired("2026-10-18T12:00:00.000Z", NOW)).toBe(false);
    expect(isExpired(null, NOW)).toBe(false);
  });

  it("extends from the old end date, so extending never shortens it", () => {
    expect(extendedUntil("2026-10-20T12:00:00.000Z", 7, NOW)).toBe("2026-10-27T12:00:00.000Z");
  });

  it("extends from today when it has already ended", () => {
    expect(extendedUntil("2026-10-01T12:00:00.000Z", 7, NOW)).toBe("2026-10-24T12:00:00.000Z");
    expect(extendedUntil(null, 30, NOW)).toBe("2026-11-16T12:00:00.000Z");
  });

  it("says plainly how long is left", () => {
    expect(expiryLabel("2026-10-29T12:00:00.000Z", NOW)).toBe("Works for 12 more days.");
    expect(expiryLabel("2026-10-18T12:00:00.000Z", NOW)).toBe("Works for 1 more day.");
    expect(expiryLabel("2026-10-14T12:00:00.000Z", NOW)).toBe("Ended 3 days ago.");
    expect(expiryLabel("2026-10-16T12:00:00.000Z", NOW)).toBe("Ended yesterday.");
    expect(expiryLabel(null, NOW)).toBe("Never ends.");
  });
});
