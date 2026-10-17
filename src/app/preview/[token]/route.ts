import { previewNotFound, servePreview } from "@/lib/serve-preview";

/**
 * The older mockup link shape, /preview/<code>. Kept so a link sent before readable links existed
 * still opens. New links are /p/<name> (src/app/p/[slug]/route.ts). See src/lib/serve-preview.ts.
 */
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return previewNotFound();
  return servePreview(request, { token: { equals: token } });
}
