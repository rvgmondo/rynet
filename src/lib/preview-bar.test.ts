import { describe, expect, it } from "vitest";

import { mockupMessage, openedLabel } from "./onboarding/mockup-message";
import { previewBar, withBar } from "./preview-bar";

describe("the preview bar", () => {
  it("goes just before the closing body tag", () => {
    expect(withBar("<html><body><h1>Hi</h1></body></html>", "<b>bar</b>")).toBe(
      "<html><body><h1>Hi</h1><b>bar</b></body></html>",
    );
  });

  it("goes at the end of a page with no body tag", () => {
    expect(withBar("<h1>Hi</h1>", "<b>bar</b>")).toBe("<h1>Hi</h1><b>bar</b>");
  });

  it("cannot be broken out of by a dealership's name", () => {
    const bar = previewBar({ dealership: '<script>alert(1)</script> & "Sons"', email: "d@x.co" });
    expect(bar).not.toContain("<script>");
    expect(bar).toContain("&#60;script&#62;");
  });
});

describe("sending a mockup", () => {
  it("writes a short personal message with the link", () => {
    const text = mockupMessage({
      contactName: "Thabo Nkosi",
      dealership: "Smith Motors",
      link: "https://rynet.co.za/preview/abc",
    });
    expect(text).toMatch(/^Hi Thabo, here is the new homepage we designed for Smith Motors: https/);
    expect(text).toContain("only you have this link");
    expect(text).not.toMatch(new RegExp(`[${String.fromCharCode(0x2014, 0x2013, 0x2026, 0xb7)}]`));
  });

  it("says plainly whether the dealership has opened it", () => {
    const now = new Date("2026-10-13T12:00:00Z");
    expect(openedLabel(null, 0, now)).toBe("Not opened yet.");
    expect(openedLabel("2026-10-11T09:00:00Z", 3, now)).toBe(
      "Opened 2 days ago, 3 times so far. A good moment to call.",
    );
    expect(openedLabel("2026-10-12T09:00:00Z", 1, now)).toBe(
      "Opened yesterday. A good moment to call.",
    );
  });
});
