import { previewNotFound, servePreview } from "@/lib/serve-preview";

/**
 * A dealership's website mockup at its readable link, rynet.co.za/p/<name>.
 *
 * Readable on purpose: the pages are noindex, listed nowhere and in no sitemap, so a link is only
 * found by being sent, and every link ends on its own date. See src/lib/serve-preview.ts.
 */
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;
  if (!/^[a-z0-9-]{1,190}$/.test(slug)) return previewNotFound();
  return servePreview(request, { slug: { equals: slug } });
}
