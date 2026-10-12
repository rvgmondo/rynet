import { describe, expect, it } from "vitest";

import { liveMessage, whatsappLink, whatsappNumber } from "./whatsapp";

describe("whatsappNumber", () => {
  it.each([
    ["082 555 1234", "27825551234"],
    ["+27 82 555 1234", "27825551234"],
    ["27825551234", "27825551234"],
    ["(012) 335-1640", "27123351640"],
    ["825551234", "27825551234"],
  ])("reads %s", (input, expected) => {
    expect(whatsappNumber(input)).toBe(expected);
  });

  it.each(["", "12345", "+44 20 7946 0958", null])("refuses %s", (input) => {
    expect(whatsappNumber(input)).toBeNull();
  });
});

describe("whatsappLink", () => {
  it("puts the message in the box, encoded", () => {
    expect(whatsappLink("27825551234", "Hi there & welcome")).toBe(
      "https://wa.me/27825551234?text=Hi%20there%20%26%20welcome",
    );
  });

  it("lets the person choose who to send it to when there is no number", () => {
    expect(whatsappLink(null, "Hi")).toBe("https://wa.me/?text=Hi");
  });
});

describe("liveMessage", () => {
  it("greets by first name and gives the showroom", () => {
    const text = liveMessage({
      contactName: "Mark Greeff",
      showroomUrl: "https://rynet.co.za/dealers/amico-motors",
      liveCars: 86,
      fromWebsite: true,
    });
    expect(text).toContain("Hi Mark, you are live on Rynet.");
    expect(text).toContain("https://rynet.co.za/dealers/amico-motors");
    expect(text).toContain("86 of your cars are on it.");
    expect(text).toContain("from your website on their own");
  });

  it("says cars are loading only while they are", () => {
    const loading = liveMessage({
      contactName: "",
      showroomUrl: "https://rynet.co.za/dealers/x",
      liveCars: 0,
      fromWebsite: false,
      loading: true,
    });
    expect(loading).toMatch(/^Hi, you are live/);
    expect(loading).toContain("being loaded now");

    const idle = liveMessage({
      contactName: "",
      showroomUrl: "https://rynet.co.za/dealers/x",
      liveCars: 0,
      fromWebsite: false,
    });
    expect(idle).not.toContain("being loaded");
    expect(idle).not.toContain("of your cars");
  });

  it("uses no dashes or ellipses", () => {
    const text = liveMessage({
      contactName: "A",
      showroomUrl: "u",
      liveCars: 1,
      fromWebsite: true,
    });
    const banned = new RegExp(`[${String.fromCharCode(0x2014, 0x2013, 0x2026, 0xb7)}]`);
    expect(text).not.toMatch(banned);
  });
});
