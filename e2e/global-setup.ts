import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { FullConfig } from "@playwright/test";

/**
 * Signs the admin in once, before any suite runs, and leaves the token for them to share.
 *
 * Every suite used to sign in as the same admin, and Payload records each session on the user by
 * reading the list, adding to it and saving it. Two sign-ins landing together both read the same
 * list and the second save drops the first session, so under a full parallel run admin calls were
 * refused at random. A session made here, before anything else signs in, is already on the list
 * every later sign-in reads, so nothing can drop it.
 *
 * Written to .playwright/, which is not committed. A suite that finds no token signs in itself.
 */
export const ADMIN_TOKEN_FILE = path.join(process.cwd(), ".playwright", "admin-token");

export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use.baseURL ?? "http://localhost:3100";
  const response = await fetch(`${baseURL}/api/users/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: process.env.ADMIN_EMAIL || "admin@rynet.co.za",
      password: process.env.ADMIN_PASSWORD || "ChangeMe123!",
    }),
  }).catch(() => null);
  if (!response?.ok) return;
  const { token } = (await response.json()) as { token?: string };
  if (!token) return;
  await mkdir(path.dirname(ADMIN_TOKEN_FILE), { recursive: true });
  await writeFile(ADMIN_TOKEN_FILE, token, "utf8");
}
