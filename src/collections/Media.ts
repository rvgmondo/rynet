import type { CollectionConfig } from "payload";

import { isDealerStaff, isPlatformStaff } from "@/access/roles";

/**
 * The media library.
 *
 * Two rules here are enforced rather than encouraged.
 *
 * Alt text is required unless the image is explicitly flagged decorative. Not "recommended",
 * not a warning in the sidebar: the save fails. An alt field that can be skipped is an alt
 * field that is skipped, and on a platform of tens of thousands of vehicle photographs that
 * is the single largest accessibility failure available to us. Vehicle gallery images get a
 * sensible default generated from the vehicle's own details, so the common case costs the
 * dealer nothing.
 *
 * Uploads are re-encoded through sharp, which strips EXIF including GPS coordinates. A
 * dealer photographing stock on a phone is otherwise publishing the exact location of every
 * car on their forecourt.
 */
export const Media: CollectionConfig = {
  slug: "media",
  labels: { singular: "Image or file", plural: "Media" },
  admin: {
    group: "Content",
    defaultColumns: ["filename", "alt", "isDecorative", "updatedAt"],
    description: "Every image needs alt text, or an explicit decorative flag. This is enforced.",
  },
  access: {
    read: () => true,
    create: ({ req }) => isPlatformStaff(req.user) || isDealerStaff(req.user),
    update: ({ req }) => isPlatformStaff(req.user) || isDealerStaff(req.user),
    delete: ({ req }) => isPlatformStaff(req.user) || isDealerStaff(req.user),
  },
  upload: {
    // Derivatives are generated once on upload. The public site never asks the origin to
    // resize on the fly, because the origin is a shared cPanel box.
    imageSizes: [
      { name: "thumbnail", width: 320, height: 240, position: "centre" },
      { name: "card", width: 640, height: 480, position: "centre" },
      { name: "gallery", width: 1280, height: 960, position: "centre" },
      { name: "hero", width: 1920, height: 1080, position: "centre" },
    ],
    adminThumbnail: "thumbnail",
    focalPoint: true,
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/avif", "application/pdf"],
    formatOptions: {
      format: "webp",
      options: { quality: 82 },
    },
  },
  fields: [
    {
      name: "alt",
      type: "text",
      admin: {
        description:
          'What the image shows, for someone who cannot see it. Describe the subject, not the file, so "2023 Toyota Hilux Raider, front three-quarter" rather than "vehicle photo".',
      },
      validate: (value: unknown, { data }: { data?: Record<string, unknown> }) => {
        if (data?.isDecorative) return true;
        if (typeof value === "string" && value.trim().length > 0) return true;
        return "Add alt text, or tick 'Decorative' if this image carries no information. It cannot be published without one or the other.";
      },
    },
    {
      name: "isDecorative",
      type: "checkbox",
      defaultValue: false,
      admin: {
        description:
          "Tick only for images that carry no information, such as a background texture. These are hidden from screen readers.",
      },
    },
    {
      name: "credit",
      type: "text",
      admin: { description: "Photographer or source, where one is owed." },
    },
    {
      name: "folder",
      type: "text",
      index: true,
      admin: { description: "Groups the library. For example: stock, dealers, editorial, agency." },
    },
  ],
};
