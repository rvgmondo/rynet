import { afterEach, describe, expect, it, vi } from "vitest";

import { leadPush, openPush, sendPush, shouldPushOpen } from "./push";

describe("phone pushes", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("does nothing without a topic", () => {
    vi.stubEnv("NTFY_TOPIC", "");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    sendPush({ title: "t", message: "m" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("posts to the topic with a three second limit and never throws", () => {
    vi.stubEnv("NTFY_TOPIC", "test-topic");
    const fetch = vi.fn().mockRejectedValue(new Error("down"));
    vi.stubGlobal("fetch", fetch);
    expect(() =>
      sendPush({
        title: "Rynet mockup opened: Café Motors",
        message: "m",
        click: "https://rynet.co.za/admin",
      }),
    ).not.toThrow();
    const [url, init] = fetch.mock.calls[0] as [string, RequestInit];
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe("https://ntfy.sh/test-topic");
    expect(parsed.searchParams.get("title")).toBe("Rynet mockup opened: Café Motors");
    expect(parsed.searchParams.get("click")).toBe("https://rynet.co.za/admin");
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("pushes the first open, then at most once an hour", () => {
    const now = new Date("2026-10-27T10:00:00Z");
    expect(shouldPushOpen(null, now)).toBe(true);
    expect(shouldPushOpen("2026-10-27T09:30:00Z", now)).toBe(false);
    expect(shouldPushOpen("2026-10-27T08:59:00Z", now)).toBe(true);
  });

  it("says how often a mockup has been opened", () => {
    expect(openPush({ dealership: "Auto Arena", count: 1, adminUrl: "x" }).message).toBe(
      "Auto Arena just opened their mockup.",
    );
    expect(openPush({ dealership: "Auto Arena", count: 3, adminUrl: "x" }).message).toContain(
      "(opened 3 times)",
    );
  });

  it("pushes leads people filled in, and stays quiet on taps and reveals", () => {
    expect(leadPush({ type: "dealer_signup", name: "Jan", adminUrl: "x" })?.title).toBe(
      "Rynet lead: a dealership wants to list",
    );
    expect(leadPush({ type: "whatsapp_click", adminUrl: "x" })).toBeNull();
    expect(leadPush({ type: "phone_reveal", adminUrl: "x" })).toBeNull();
  });
});
