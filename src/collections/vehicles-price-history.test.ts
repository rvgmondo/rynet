import type { CollectionBeforeChangeHook } from "payload";
import { describe, expect, it } from "vitest";

import { Vehicles } from "./Vehicles";

/**
 * The car hooks that keep the price history, run in order the way Payload runs them.
 *
 * With drafts on, `originalDoc` for an update is the latest DRAFT that autosave kept, while the
 * site reads the saved car. These tests hand the hooks exactly that situation: a saved car at
 * R 300 000, and a draft left by typing 2850000, pausing, and deleting a zero. Before the second
 * hook existed, saving that draft recorded a previous price of R 2 850 000 and the site showed a
 * price drop that never happened (confirmed against the running app over the REST API).
 *
 * `req.payload.findByID` is the only thing the hooks read: it answers with the saved car, and with
 * a verified dealership for the verification check in the first hook.
 */

type Doc = Record<string, unknown>;

const hooks = (Vehicles.hooks?.beforeChange ?? []) as CollectionBeforeChangeHook[];

function fakeReq(savedCar: Doc) {
  return {
    user: { id: 1, collection: "users", role: "platform_admin" },
    payload: {
      findByID: async ({ collection }: { collection: string }) =>
        collection === "dealers" ? { id: 7, verificationStatus: "verified" } : savedCar,
    },
  };
}

async function runHooks(data: Doc, originalDoc: Doc, savedCar: Doc): Promise<Doc> {
  let current = { ...data };
  for (const hook of hooks) {
    const result = await hook({
      data: current,
      originalDoc,
      req: fakeReq(savedCar),
      operation: "update",
      collection: Vehicles,
      context: {},
    } as unknown as Parameters<CollectionBeforeChangeHook>[0]);
    current = (result as Doc) ?? current;
  }
  return current;
}

const saved: Doc = {
  id: 42,
  dealer: 7,
  status: "live",
  price: 300000,
  previousPrice: null,
  priceHistory: [],
};

describe("a car's price history across drafts", () => {
  it("runs the new hook after the existing one", () => {
    expect(hooks.length).toBeGreaterThanOrEqual(2);
  });

  it("saving a corrected price measures against the saved car, not the half-typed draft", async () => {
    // The latest draft autosave kept after "2850000", then "285000".
    const latestDraft: Doc = {
      ...saved,
      price: 285000,
      previousPrice: 2850000,
      priceHistory: [
        { price: 2850000, changedAt: "2026-09-16T10:00:00.000Z" },
        { price: 285000, changedAt: "2026-09-16T10:00:02.000Z" },
      ],
    };
    const result = await runHooks({ ...latestDraft, _status: "published" }, latestDraft, saved);
    expect(result.previousPrice).toBe(300000);
    expect((result.priceHistory as Doc[]).map((entry) => entry.price)).toEqual([285000]);
  });

  it("an autosave never carries a history the saved car does not have", async () => {
    const earlierDraft: Doc = { ...saved, price: 2850000, previousPrice: 300000 };
    const result = await runHooks(
      { ...earlierDraft, price: 285000, _status: "draft" },
      earlierDraft,
      saved,
    );
    expect(result.previousPrice).toBe(300000);
    expect((result.priceHistory as Doc[]).map((entry) => entry.price)).toEqual([285000]);
  });

  it("saving the saved price again leaves both fields as the saved car has them", async () => {
    const savedWithDrop: Doc = {
      ...saved,
      price: 285000,
      previousPrice: 300000,
      priceHistory: [{ id: "a", price: 285000, changedAt: "2026-09-01T00:00:00.000Z" }],
    };
    const draft: Doc = { ...savedWithDrop, price: 999999, previousPrice: 285000 };
    const result = await runHooks(
      { ...draft, price: 285000, _status: "published" },
      draft,
      savedWithDrop,
    );
    expect(result.previousPrice).toBe(300000);
    expect(result.priceHistory).toEqual(savedWithDrop.priceHistory);
  });
});
