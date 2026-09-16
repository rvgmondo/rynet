import type { DefaultServerCellComponentProps } from "payload";

/**
 * The first photo of a car, small, beside its name in the Cars list.
 *
 * A server cell, so the thumbnail is in the page as it arrives rather than popping in after.
 * Server cells are not handed the signed-in person, so the lookup runs with access control ON
 * and no user, which is exactly the public's view of a photo; photos are public (media read is
 * open to everyone), so nothing is shown that a buyer could not already fetch.
 *
 * The image is decorative (alt=""): the car's name sits in the same row and says what it is.
 */

type SizeRecord = { url?: string | null } | null | undefined;
type MediaDoc = { url?: string | null; sizes?: { thumbnail?: SizeRecord } | null };

function firstImageId(gallery: unknown): number | string | null {
  if (!Array.isArray(gallery) || gallery.length === 0) return null;
  const image = (gallery[0] as { image?: unknown } | null)?.image;
  if (typeof image === "number" || typeof image === "string") return image;
  if (image && typeof image === "object" && "id" in image) {
    const id = (image as { id?: unknown }).id;
    if (typeof id === "number" || typeof id === "string") return id;
  }
  return null;
}

/**
 * Payload writes file addresses with the server URL fixed at build time in front. The admin can be
 * reached on another address (www or not, a test port), where that origin would be a different
 * site to the browser, so a file on our own server is linked by its path alone. Files held
 * elsewhere (R2) keep their full address.
 */
function sameSitePath(url: string | null, serverURL: string | undefined): string | null {
  if (!url) return null;
  const origin = (serverURL ?? "").replace(/\/$/, "");
  if (origin && url.startsWith(`${origin}/`)) return url.slice(origin.length);
  return url;
}

export async function VehiclePhotoCell({ rowData, payload }: DefaultServerCellComponentProps) {
  const id = firstImageId(rowData?.gallery);
  let src: string | null = null;

  if (id !== null) {
    const media = (await payload.findByID({
      collection: "media",
      id,
      depth: 0,
      disableErrors: true,
      overrideAccess: false,
      select: { url: true, sizes: true },
    })) as MediaDoc | null;
    src = sameSitePath(
      media?.sizes?.thumbnail?.url ?? media?.url ?? null,
      payload.config.serverURL,
    );
  }

  if (!src) {
    return (
      <span className="rn-admin-thumb rn-admin-thumb--empty">
        <span className="rn-admin-thumb__text">No photo</span>
      </span>
    );
  }

  return (
    <span className="rn-admin-thumb">
      {/* A plain img: the admin serves stored thumbnails as they are (images.unoptimized). */}
      <img alt="" className="rn-admin-thumb__img" height={48} loading="lazy" src={src} width={64} />
    </span>
  );
}
