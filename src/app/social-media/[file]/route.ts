import { readFile } from "node:fs/promises";

import { isSocialFileName, socialMediaPath } from "@/lib/social/media";

/**
 * The pictures Rynet posts to dealerships' Facebook Pages and Instagram, served so Meta's servers
 * can fetch them. Public on purpose (Meta fetches without a login, and only once it has the
 * address), under 128-bit random names nobody can guess, never indexed. Each is a picture of a car
 * that is about to be posted publicly anyway.
 */
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> },
): Promise<Response> {
  const { file } = await params;
  if (!isSocialFileName(file)) return new Response("Not found.", { status: 404 });
  try {
    const bytes = await readFile(socialMediaPath(file));
    return new Response(new Uint8Array(bytes), {
      headers: {
        "content-type": "image/jpeg",
        "content-length": String(bytes.length),
        "cache-control": "public, max-age=86400, immutable",
        "x-robots-tag": "noindex, noimageindex",
      },
    });
  } catch {
    return new Response("Not found.", { status: 404 });
  }
}
