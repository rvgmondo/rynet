import { describe, expect, it, vi } from "vitest";

import { endSessionsWhenSuspended, refuseSuspendedAccount } from "./account-status";

/**
 * "Suspended" used to be a label on a badge that nothing read.
 *
 * These are the two halves of making it true, tested as functions. The end-to-end proof that
 * they are actually wired into the login path is in e2e/isolation.spec.ts, because a hook that
 * is never called passes every unit test ever written about it.
 */

type HookArgs = Parameters<typeof refuseSuspendedAccount>[0];

const login = (status: unknown) => ({ user: { id: 1, status } }) as unknown as HookArgs;

describe("refusing a suspended sign-in", () => {
  it("refuses a suspended account and says why", () => {
    expect(() => refuseSuspendedAccount(login("suspended"))).toThrow(/suspended/i);
  });

  it("lets every other status through", () => {
    // Fails open on purpose. This enforces a decision somebody made; it does not invent one,
    // and a missing status must never be the reason a dealership cannot reach its own stock.
    for (const status of ["active", "invited", "deletion_requested", null, undefined, ""]) {
      expect(() => refuseSuspendedAccount(login(status))).not.toThrow();
    }
  });
});

describe("ending the sessions of a suspended account", () => {
  const args = (doc: unknown, previousDoc: unknown, stored: unknown) => {
    const findOne = vi.fn().mockResolvedValue(stored);
    const updateOne = vi.fn().mockResolvedValue(null);
    const req = {
      payload: { db: { findOne, updateOne }, logger: { info: vi.fn() } },
    };
    return {
      findOne,
      updateOne,
      hook: {
        collection: { slug: "users" },
        doc,
        previousDoc,
        req,
      } as unknown as Parameters<typeof endSessionsWhenSuspended>[0],
    };
  };

  const open = { id: 1, status: "suspended", sessions: [{ id: "a" }, { id: "b" }] };

  it("empties the session list when the account is suspended", async () => {
    const { updateOne, hook } = args(
      { id: 1, status: "suspended" },
      { id: 1, status: "active" },
      open,
    );

    await endSessionsWhenSuspended(hook);

    expect(updateOne).toHaveBeenCalledTimes(1);
    const written = (updateOne.mock.calls[0]?.[0] ?? {}) as {
      collection?: string;
      data?: { sessions?: unknown[]; status?: string };
      id?: number;
    };
    expect(written.collection).toBe("users");
    expect(written.id).toBe(1);
    expect(written.data?.sessions, "a session survived the suspension").toEqual([]);
    // The whole row goes back, because the database layer replaces the row rather than
    // patching it. A partial write here would blank the password hash.
    expect(written.data?.status).toBe("suspended");
  });

  it("leaves an account that was already suspended alone", async () => {
    // Otherwise every unrelated edit to a suspended account rewrites the row for nothing.
    const { updateOne, hook } = args(
      { id: 1, status: "suspended" },
      { id: 1, status: "suspended" },
      open,
    );

    await endSessionsWhenSuspended(hook);
    expect(updateOne).not.toHaveBeenCalled();
  });

  it("does nothing to an account that is not suspended", async () => {
    const { findOne, updateOne, hook } = args(
      { id: 1, status: "active" },
      { id: 1, status: "invited" },
      open,
    );

    await endSessionsWhenSuspended(hook);
    expect(findOne).not.toHaveBeenCalled();
    expect(updateOne).not.toHaveBeenCalled();
  });

  it("writes nothing when there was no session open", async () => {
    const { updateOne, hook } = args(
      { id: 1, status: "suspended" },
      { id: 1, status: "active" },
      { id: 1, status: "suspended", sessions: [] },
    );

    await endSessionsWhenSuspended(hook);
    expect(updateOne).not.toHaveBeenCalled();
  });
});
