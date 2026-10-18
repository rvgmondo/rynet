import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { classifyMetaError, scrubUrl } from "./http";
import { decryptToken, encryptToken, signState, verifyState } from "./secrets";
import { nextAutoSlot, retryDelayMs } from "./slots";

/** A time on a given day, South African time, as a Date. */
const sast = (day: string, time: string) => new Date(`${day}T${time}:00+02:00`);

describe("when an automatic post goes out", () => {
  it("goes now when nothing is booked and the day is open", () => {
    const now = sast("2026-10-19", "10:15");
    expect(nextAutoSlot([], now)).toEqual(now);
  });

  it("waits for 08:00 when it is early, and for tomorrow when it is late", () => {
    expect(nextAutoSlot([], sast("2026-10-19", "05:30"))).toEqual(sast("2026-10-19", "08:00"));
    expect(nextAutoSlot([], sast("2026-10-19", "19:30"))).toEqual(sast("2026-10-20", "08:00"));
  });

  it("keeps three hours between posts", () => {
    const booked = [sast("2026-10-19", "09:00")];
    expect(nextAutoSlot(booked, sast("2026-10-19", "10:00"))).toEqual(sast("2026-10-19", "12:00"));
  });

  it("puts no more than three on one day", () => {
    const booked = ["08:00", "11:00", "14:00"].map((time) => sast("2026-10-19", time));
    expect(nextAutoSlot(booked, sast("2026-10-19", "08:30"))).toEqual(sast("2026-10-20", "08:00"));
  });

  it("does not let a run of new cars past 18:00", () => {
    const booked = [sast("2026-10-19", "13:00"), sast("2026-10-19", "16:00")];
    expect(nextAutoSlot(booked, sast("2026-10-19", "13:30"))).toEqual(sast("2026-10-20", "08:00"));
  });

  it("tries a failed post again after 5, 15 and 60 minutes, then stops", () => {
    expect([1, 2, 3, 4].map(retryDelayMs)).toEqual([300_000, 900_000, 3_600_000, null]);
  });
});

describe("talking to Meta", () => {
  it("never keeps a token in a URL it logs", () => {
    const scrubbed = scrubUrl("https://graph.facebook.com/v26.0/me?access_token=EAAB123&fields=id");
    expect(scrubbed).not.toContain("EAAB123");
    expect(scrubbed).toContain("fields=id");
  });

  it("asks for a new connection when the token has gone bad", () => {
    const verdict = classifyMetaError({ error: { code: 190, error_subcode: 463 } }, 400);
    expect(verdict.reconnect).toBe(true);
    expect(verdict.retryable).toBe(false);
  });

  it("tries again on a rate limit and gives up on a permission error", () => {
    expect(classifyMetaError({ error: { code: 4 } }, 400).retryable).toBe(true);
    expect(classifyMetaError({ error: { code: 10 } }, 403).retryable).toBe(false);
    expect(classifyMetaError({ error: { code: 4, error_subcode: 2207051 } }, 400).retryable).toBe(
      false,
    );
  });
});

describe("the secrets", () => {
  const before = process.env.SOCIAL_TOKEN_KEY;
  beforeEach(() => {
    process.env.SOCIAL_TOKEN_KEY = "a test key that is comfortably over thirty-two characters";
  });
  afterEach(() => {
    process.env.SOCIAL_TOKEN_KEY = before;
  });

  it("encrypts a token so the stored value is not the token", () => {
    const stored = encryptToken("EAAB-page-token");
    expect(stored).not.toContain("EAAB");
    expect(decryptToken(stored)).toBe("EAAB-page-token");
  });

  it("refuses to store anything without a key", () => {
    process.env.SOCIAL_TOKEN_KEY = "";
    expect(() => encryptToken("x")).toThrow(/SOCIAL_TOKEN_KEY/);
  });

  it("signs the state, and rejects one that was edited or is stale", () => {
    const now = Date.now();
    const state = signState({ dealerId: 7, userId: 3 }, now);
    expect(verifyState(state, now)).toEqual({ dealerId: 7, userId: 3 });

    const [body, sig] = state.split(".");
    const edited = Buffer.from(
      JSON.stringify({
        ...JSON.parse(Buffer.from(body ?? "", "base64url").toString()),
        dealerId: 8,
      }),
    ).toString("base64url");
    expect(verifyState(`${edited}.${sig}`, now)).toBeNull();
    expect(verifyState(state, now + 11 * 60_000)).toBeNull();
  });
});
