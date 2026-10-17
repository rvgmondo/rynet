import { describe, expect, it } from "vitest";

import { leadEmail, recipientFor } from "./lead-email";

const lead = (type: string) => ({
  id: 7,
  type,
  name: "Thandi Buyer",
  phone: "082 555 1234",
  email: "thandi@example.com",
  message: "Is it still available?",
});

const dealer = {
  tradingName: "Smith Motors",
  principalEmail: "boss@smith.example",
  routing: [
    { leadType: "test_drive", toAddress: "bookings@smith.example", branch: null },
    { leadType: "enquiry", toAddress: "north@smith.example", branch: 2 },
  ],
};

describe("who hears about a lead", () => {
  it("sends Rynet's own leads to the right Rynet mailbox", () => {
    expect(recipientFor(lead("dealer_signup"), null, null)?.to).toBe("sales@rynet.co.za");
    expect(recipientFor(lead("mockup_request"), null, null)?.to).toBe("sales@rynet.co.za");
    expect(recipientFor(lead("agency_enquiry"), null, null)?.to).toBe("sales@rynet.co.za");
    expect(recipientFor(lead("trade_in"), null, null)?.to).toBe("info@rynet.co.za");
  });

  it("sends nothing for a tap that left no details", () => {
    expect(recipientFor(lead("whatsapp_click"), dealer, null)).toBeNull();
    expect(recipientFor(lead("phone_reveal"), dealer, null)).toBeNull();
  });

  it("follows the dealership's own rules, branch first", () => {
    expect(recipientFor(lead("test_drive"), dealer, { id: 1 })?.to).toBe("bookings@smith.example");
    expect(recipientFor(lead("enquiry"), dealer, { id: 2 })?.to).toBe("north@smith.example");
  });

  it("falls back to the branch, then the dealer principal", () => {
    expect(recipientFor(lead("enquiry"), dealer, { id: 1, email: "sales@smith.example" })?.to).toBe(
      "sales@smith.example",
    );
    expect(recipientFor(lead("finance"), dealer, { id: 1 })?.to).toBe("boss@smith.example");
  });

  it("never lets a lead go nowhere: no address at all goes to info, marked", () => {
    const none = recipientFor(lead("enquiry"), { tradingName: "Quiet Cars" }, { id: 1 });
    expect(none).toEqual({ to: "info@rynet.co.za", audience: "staff", fallback: true });
  });

  it("never emails an example dealership", () => {
    expect(recipientFor(lead("enquiry"), { ...dealer, isDemonstration: true }, null)).toBeNull();
  });
});

describe("what the email says", () => {
  it("gives the dealership the buyer, the car, and a reply that reaches the buyer", () => {
    const email = leadEmail(
      lead("enquiry"),
      { to: "x@smith.example", audience: "dealer" },
      {
        carTitle: "2021 Toyota Hilux",
        carUrl: "https://rynet.co.za/vehicles/toyota/hilux/2021-rn1",
        adminUrl: "https://rynet.co.za/admin/collections/leads/7",
      },
    );
    expect(email.subject).toBe("A question about a car: 2021 Toyota Hilux");
    expect(email.text).toContain("Phone: 082 555 1234");
    expect(email.text).toContain("Is it still available?");
    expect(email.text).not.toContain("/admin/");
    expect(email.replyTo).toBe("thandi@example.com");
  });

  it("gives staff the admin link, and says when it was meant for a dealership", () => {
    const email = leadEmail(
      lead("enquiry"),
      { to: "info@rynet.co.za", audience: "staff", fallback: true },
      { dealerName: "Quiet Cars", adminUrl: "https://rynet.co.za/admin/collections/leads/7" },
    );
    expect(email.text).toContain("should have gone to Quiet Cars");
    expect(email.text).toContain("https://rynet.co.za/admin/collections/leads/7");
    expect(email.replyTo).toBeUndefined();
  });

  it("uses no dashes or ellipses", () => {
    const banned = new RegExp(`[${String.fromCharCode(0x2014, 0x2013, 0x2026, 0xb7)}]`);
    const email = leadEmail(
      lead("mockup_request"),
      { to: "s", audience: "staff" },
      { adminUrl: "u" },
    );
    expect(email.subject + email.text).not.toMatch(banned);
  });
});
