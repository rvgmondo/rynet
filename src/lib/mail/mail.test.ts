import { describe, expect, it } from "vitest";

import { inviteEmail } from "./invite-email";
import { bodyHtml, bodyText, renderEmail } from "./layout";
import { leftOutBecause, type MailerDealer, renderFor } from "./mailer";
import { merge, unknownFields } from "./merge";
import { checkUnsubscribe, unsubscribeCode } from "./unsubscribe";

const BANNED = new RegExp(`[${String.fromCharCode(0x2014, 0x2013, 0x2026, 0xb7)}]`);

const dealer: MailerDealer = {
  id: 12,
  tradingName: "Amico Motors",
  slug: "amico-motors",
  email: "boss@amico.example",
  contactName: "Thabo Nkosi",
  liveCars: 41,
  newEnquiries: 2,
  hasLogin: true,
  readsWebsite: true,
  socialConnected: false,
  optedOut: false,
  verified: true,
};

describe("the email design", () => {
  it("turns the small body format into paragraphs, bullets, bold and links", () => {
    const html = bodyHtml(
      "Hello **there**.\n\n- one\n- two\n\nSee [the site](https://rynet.co.za).",
    );
    expect(html).toContain("<strong");
    expect(html.match(/<li/g)).toHaveLength(2);
    expect(html).toContain('href="https://rynet.co.za"');
  });

  it("escapes anything typed, so a template cannot carry HTML or a script link", () => {
    const html = bodyHtml('<img src=x onerror="alert(1)"> [bad](javascript:alert(1))');
    expect(html).not.toContain("<img");
    expect(html).not.toContain('href="javascript');
  });

  it("always has a text copy, with links written out", () => {
    expect(bodyText("Go [here](https://rynet.co.za/portal).")).toBe(
      "Go here (https://rynet.co.za/portal).",
    );
    const { text } = renderEmail({
      heading: "Hi",
      body: "Words",
      button: { label: "Open", url: "https://rynet.co.za" },
      unsubscribeUrl: "https://rynet.co.za/unsubscribe?d=1&t=x",
    });
    expect(text).toContain("Open: https://rynet.co.za");
    expect(text).toContain("Stop these emails: https://rynet.co.za/unsubscribe");
  });
});

describe("personalising a mailing", () => {
  const values = {
    firstName: "Thabo",
    dealership: "Amico Motors",
    showroomUrl: "https://rynet.co.za/dealers/amico-motors",
    portalUrl: "https://rynet.co.za/portal",
    liveCars: "41",
    newEnquiries: "2",
  };

  it("fills every field for each dealership", () => {
    expect(merge("Hi {{firstName}}, {{dealership}} has {{ liveCars }} live.", values)).toBe(
      "Hi Thabo, Amico Motors has 41 live.",
    );
  });

  it("tidies the gap a missing first name leaves", () => {
    expect(merge("Hi {{firstName}},", { ...values, firstName: "" })).toBe("Hi,");
  });

  it("names any field Rynet cannot fill, so a typo never reaches a dealer", () => {
    expect(unknownFields("Hi {{firstname}} at {{dealership}}")).toEqual(["firstname"]);
    expect(unknownFields("Hi {{firstName}}")).toEqual([]);
  });

  it("renders one dealership's copy with its own details and its own unsubscribe link", () => {
    const email = renderFor(
      {
        subject: "{{dealership}}: news",
        body: "Hi {{firstName}}, you have {{liveCars}} cars live.",
        buttonLabel: "Open your portal",
        buttonUrl: "{{portalUrl}}",
      },
      dealer,
      "https://rynet.co.za",
    );
    expect(email.subject).toBe("Amico Motors: news");
    expect(email.text).toContain("Hi Thabo, you have 41 cars live.");
    expect(email.html).toContain('href="https://rynet.co.za/portal"');
    expect(email.unsubscribe).toBe(`https://rynet.co.za/unsubscribe?d=12&t=${unsubscribeCode(12)}`);
    expect(email.text).not.toMatch(BANNED);
  });

  it("leaves out a dealership that opted out or has no address, and says why", () => {
    expect(leftOutBecause(dealer)).toBeNull();
    expect(leftOutBecause({ ...dealer, optedOut: true })).toMatch(/asked not to/);
    expect(leftOutBecause({ ...dealer, email: null })).toMatch(/No email address/);
  });
});

describe("the unsubscribe link", () => {
  it("works for the dealership it was made for and no other", () => {
    const code = unsubscribeCode(12);
    expect(checkUnsubscribe(12, code)).toBe(true);
    expect(checkUnsubscribe(13, code)).toBe(false);
    expect(checkUnsubscribe(12, "0".repeat(32))).toBe(false);
    expect(checkUnsubscribe(12, "not-a-code")).toBe(false);
  });
});

describe("the invite email", () => {
  it("carries the link and says how long it works", () => {
    const email = inviteEmail({
      name: "Thabo Nkosi",
      tradingName: "Amico Motors",
      link: "https://rynet.co.za/portal/set-password?token=abc",
    });
    expect(email.subject).toBe("Your Rynet login for Amico Motors");
    expect(email.html).toContain("https://rynet.co.za/portal/set-password?token=abc");
    expect(email.text).toContain("7 days");
    expect(email.text).not.toMatch(BANNED);
  });
});
