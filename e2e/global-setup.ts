import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { FullConfig } from "@playwright/test";

import { FIXTURE_PASSWORD, FIXTURES } from "../src/seed/fixture-accounts";

/**
 * Signs the shared accounts in once, before any suite runs, and leaves their tokens to share.
 *
 * Payload records each session on the user by reading the list, adding to it and saving it. Two
 * sign-ins to one account landing together both read the same list and the second save drops the
 * first session, so under a full parallel run calls were refused at random. A session made here,
 * before anything else signs in, is already on the list every later sign-in reads, so nothing can
 * drop it. Two accounts are shared this way: the admin, which every suite uses, and dealer A's
 * owner, which the isolation suite and the portal, social and mailer suites all need.
 *
 * Written to .playwright/, which is not committed. A suite that finds no token signs in itself.
 */
export const ADMIN_TOKEN_FILE = path.join(process.cwd(), ".playwright", "admin-token");
export const OWNER_A_TOKEN_FILE = path.join(process.cwd(), ".playwright", "owner-a-token");

async function signIn(baseURL: string, email: string, password: string): Promise<string | null> {
  const response = await fetch(`${baseURL}/api/users/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  }).catch(() => null);
  if (!response?.ok) return null;
  const { token } = (await response.json()) as { token?: string };
  return token ?? null;
}

export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use.baseURL ?? "http://localhost:3100";
  await mkdir(path.dirname(ADMIN_TOKEN_FILE), { recursive: true });
  const admin = await signIn(
    baseURL,
    process.env.ADMIN_EMAIL || "admin@rynet.co.za",
    process.env.ADMIN_PASSWORD || "ChangeMe123!",
  );
  if (admin) await writeFile(ADMIN_TOKEN_FILE, admin, "utf8");
  const owner = await signIn(baseURL, FIXTURES.ownerA, FIXTURE_PASSWORD);
  if (owner) await writeFile(OWNER_A_TOKEN_FILE, owner, "utf8");
}
