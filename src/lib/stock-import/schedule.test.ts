import { describe, expect, it } from "vitest";
import type { ImportReport } from "./run";
import {
  initialImportComplete,
  mayRun,
  STALE_LEASE_MINUTES,
  type SyncSettings,
  summarise,
} from "./schedule";

const NOW = new Date("2026-10-05T12:00:00.000Z");
const minutesAgo = (count: number) => new Date(NOW.getTime() - count * 60_000).toISOString();

function settings(overrides: Partial<SyncSettings> = {}): SyncSettings {
  return { enabled: true, runningSince: null, lastFinishedAt: null, runs: [], ...overrides };
}

function report(overrides: Partial<ImportReport> = {}): ImportReport {
  return {
    source: "amicomotors.co.za",
    dryRun: false,
    startedAt: NOW.toISOString(),
    finishedAt: NOW.toISOString(),
    listingsFound: 97,
    created: 0,
    updated: 2,
    unchanged: 84,
    expired: 0,
    heldBack: 11,
    leftAlone: 0,
    unreadable: 0,
    failed: 0,
    liveAfter: 86,
    photosSaved: 0,
    photosReused: 0,
    photosSkipped: 0,
    requests: 98,
    makesAdded: [],
    modelsAdded: [],
    coloursAdded: [],
    contactDetailsRemoved: 17,
    cars: [],
    problems: [],
    expiryWithheld: null,
    dataQuality: [],
    dealership: [],
    ...overrides,
  } as ImportReport;
}

describe("mayRun", () => {
  const options = { now: NOW, intervalMinutes: 180, force: false };

  it("runs when nothing has run yet", () => {
    expect(mayRun(settings(), options)).toEqual({ ok: true });
  });

  it("waits while another process holds the lease", () => {
    const busy = mayRun(settings({ runningSince: minutesAgo(5) }), options);
    expect(busy).toEqual({ ok: false, reason: "another run is busy" });
  });

  it("ignores a lease left behind by a process that died", () => {
    const stale = settings({ runningSince: minutesAgo(STALE_LEASE_MINUTES + 1) });
    expect(mayRun(stale, options)).toEqual({ ok: true });
  });

  it("does not read the dealership's website more often than the interval", () => {
    const recent = settings({ lastFinishedAt: minutesAgo(30) });
    expect(mayRun(recent, options)).toEqual({
      ok: false,
      reason: "the last run was recent enough",
    });
    expect(mayRun(settings({ lastFinishedAt: minutesAgo(181) }), options)).toEqual({ ok: true });
  });

  it("lets a person press the button inside the interval, but never past a live run", () => {
    const recent = settings({ lastFinishedAt: minutesAgo(1) });
    expect(mayRun(recent, { ...options, force: true })).toEqual({ ok: true });

    const busy = settings({ runningSince: minutesAgo(1) });
    expect(mayRun(busy, { ...options, force: true }).ok).toBe(false);
  });

  it("stays off when it has been switched off", () => {
    const off = mayRun(settings({ enabled: false }), { ...options, force: true });
    expect(off).toEqual({ ok: false, reason: "the stock sync is switched off" });
  });
});

describe("initialImportComplete", () => {
  it("is true once a full pass has left real cars live", () => {
    expect(initialImportComplete(report())).toBe(true);
  });

  it("is false for a dry run, so nothing is put away by a rehearsal", () => {
    expect(initialImportComplete(report({ dryRun: true }))).toBe(false);
  });

  it("is false while any page could not be read or saved", () => {
    expect(initialImportComplete(report({ unreadable: 1 }))).toBe(false);
    expect(initialImportComplete(report({ failed: 1 }))).toBe(false);
  });

  it("is false when the run put nothing live, so the site is never left empty", () => {
    expect(initialImportComplete(report({ liveAfter: 0 }))).toBe(false);
    expect(initialImportComplete(report({ listingsFound: 0 }))).toBe(false);
  });
});

describe("summarise", () => {
  it("says what happened in one sentence", () => {
    expect(summarise(report())).toBe(
      "97 cars on the stock list, 0 added, 2 changed, 84 already correct, 0 hidden because they left the list, 11 held back, 0 photographs saved",
    );
  });

  it("names trouble when there was any", () => {
    const line = summarise(report({ failed: 2, unreadable: 1 }));
    expect(line).toContain("2 could not be saved");
    expect(line).toContain("1 pages could not be read");
  });
});
