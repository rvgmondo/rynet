import { describe, expect, it } from "vitest";

import { carActions, nextCarState, tabOf } from "./cars";
import { INVITE_DAYS, inviteMessage, setPasswordPath } from "./invite-message";
import { passwordProblem } from "./password";

describe("what a dealership can do to a car", () => {
  it("offers sold and reserved for a live car, and back on sale for the others", () => {
    expect(carActions("live")).toEqual(["sold", "reserved"]);
    expect(carActions("reserved")).toEqual(["live", "sold"]);
    expect(carActions("sold")).toEqual(["live"]);
  });

  it("never puts a hidden car live from the portal", () => {
    for (const status of ["draft", "pending_review", "expired", "archived"]) {
      expect(carActions(status)).toEqual([]);
      expect(nextCarState(status, "live")).toBeNull();
    }
  });

  it("refuses a move that is not offered", () => {
    expect(nextCarState("sold", "reserved")).toBeNull();
    expect(nextCarState("live", "sold")).toBe("sold");
  });

  it("groups every hidden state together", () => {
    expect(tabOf("live")).toBe("live");
    expect(tabOf("draft")).toBe("hidden");
    expect(tabOf("expired")).toBe("hidden");
  });
});

describe("choosing a password", () => {
  it("wants ten characters and the same twice", () => {
    expect(passwordProblem("short", "short")).toMatch(/at least 10/);
    expect(passwordProblem("a long enough one", "a long enough two")).toMatch(/not the same/);
    expect(passwordProblem("a long enough one", "a long enough one")).toBeNull();
  });
});

describe("the invite", () => {
  it("links to the set-password page and says how long it lasts", () => {
    const token = "a".repeat(40);
    expect(setPasswordPath(token)).toBe(`/portal/set-password?token=${token}`);
    const text = inviteMessage({
      name: "Thabo Nkosi",
      tradingName: "Amico Motors",
      link: "https://rynet.co.za/portal/set-password?token=x",
    });
    expect(text).toMatch(/^Hi Thabo, here is your login for Amico Motors on Rynet\./);
    expect(text).toContain(`${INVITE_DAYS} days`);
    expect(text).not.toMatch(new RegExp(`[${String.fromCharCode(0x2014, 0x2013, 0x2026, 0xb7)}]`));
  });
});
