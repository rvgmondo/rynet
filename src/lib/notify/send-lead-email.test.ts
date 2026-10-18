import type { Payload } from "payload";
import { afterEach, describe, expect, it, vi } from "vitest";

import { sendLeadEmail } from "./send-lead-email";

/** A stand-in for Payload: the three records the sender reads, and a sendEmail that records. */
function fakePayload(records: Record<string, Record<number, Record<string, unknown>>>) {
  const sent: Record<string, unknown>[] = [];
  const payload = {
    config: { serverURL: "https://rynet.co.za", routes: { admin: "/admin" } },
    findByID: async ({ collection, id }: { collection: string; id: number }) => {
      const doc = records[collection]?.[id];
      if (!doc) throw new Error("not found");
      return doc;
    },
    count: async () => ({ totalDocs: 0 }),
    sendEmail: async (message: Record<string, unknown>) => {
      sent.push(message);
    },
    logger: { error: vi.fn() },
  } as unknown as Payload;
  return { payload, sent };
}

const records = {
  dealers: {
    3: {
      id: 3,
      tradingName: "Smith Motors",
      isDemonstration: false,
      principal: { email: "boss@smith.example" },
      emailRouting: [],
    },
    4: { id: 4, tradingName: "Example Cars", isDemonstration: true, principal: {} },
  },
  branches: { 5: { id: 5, email: "sales@smith.example" } },
  vehicles: {
    9: {
      id: 9,
      title: "2021 Toyota Hilux",
      publicRef: "RN1",
      modelYear: 2021,
      make: { id: 1, slug: "toyota", name: "Toyota" },
      model: { id: 2, slug: "hilux", name: "Hilux" },
      variant: null,
    },
  },
};

const enquiry = {
  id: 77,
  type: "enquiry",
  name: "Thandi Buyer",
  email: "thandi@example.com",
  phone: "082 555 1234",
  message: "Still available?",
  dealer: 3,
  branch: 5,
  vehicle: 9,
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("sending a new lead", () => {
  it("does nothing at all without a mail server", async () => {
    vi.stubEnv("SMTP_HOST", "");
    const { payload, sent } = fakePayload(records);
    await sendLeadEmail(payload, enquiry);
    expect(sent).toEqual([]);
  });

  it("emails the dealership's branch, about the car, replying to the buyer", async () => {
    vi.stubEnv("SMTP_HOST", "mail.rynet.co.za");
    const { payload, sent } = fakePayload(records);
    await sendLeadEmail(payload, enquiry);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      to: "sales@smith.example",
      subject: "A question about a car: 2021 Toyota Hilux",
      replyTo: "thandi@example.com",
    });
    expect(String(sent[0]?.text)).toContain("https://rynet.co.za/vehicles/toyota/hilux/2021-rn1");
  });

  it("sends a mockup request to sales@rynet.co.za", async () => {
    vi.stubEnv("SMTP_HOST", "mail.rynet.co.za");
    const { payload, sent } = fakePayload(records);
    await sendLeadEmail(payload, { id: 8, type: "mockup_request", name: "Sam", phone: "082" });
    expect(sent[0]?.to).toBe("sales@rynet.co.za");
    expect(String(sent[0]?.text)).toContain("https://rynet.co.za/admin/collections/leads/8");
  });

  it("never emails about an example dealership or an example lead", async () => {
    vi.stubEnv("SMTP_HOST", "mail.rynet.co.za");
    const { payload, sent } = fakePayload(records);
    await sendLeadEmail(payload, { ...enquiry, dealer: 4, branch: null });
    await sendLeadEmail(payload, { ...enquiry, isDemonstration: true });
    expect(sent).toEqual([]);
  });

  it("never throws, whatever goes wrong", async () => {
    vi.stubEnv("SMTP_HOST", "mail.rynet.co.za");
    const { payload } = fakePayload(records);
    (payload as unknown as { sendEmail: () => Promise<void> }).sendEmail = async () => {
      throw new Error("mail server down");
    };
    await expect(sendLeadEmail(payload, enquiry)).resolves.toBeUndefined();
  });
});
