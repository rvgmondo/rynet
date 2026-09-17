import type { CollectionConfig } from "payload";

import { dealerIdOf, isDealerStaff, isPlatformStaff, scopedToOwnDealer } from "@/access/roles";
import { ADMIN_GROUP } from "@/lib/admin-nav";

/**
 * The media library.
 *
 * Three rules here are enforced rather than encouraged.
 *
 * A photo belongs to the dealership that uploaded it, and only that dealership can change or
 * delete it. Update and delete used to allow any dealer account, which meant one dealership
 * could rewrite the description on a competitor's photograph or delete the pictures off its
 * stock. Ownership is written by the hook below rather than taken from the request, the same
 * line the vehicles collection draws, and e2e/isolation.spec.ts attacks it as dealer A.
 * A photo with no dealership is Rynet's own: every photo that existed before this rule is
 * platform owned, which is what the seeded demonstration library actually is.
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
  labels: { singular: "Photo or file", plural: "Photos and files" },
  defaultSort: "-createdAt",
  admin: {
    group: ADMIN_GROUP.details,
    defaultColumns: ["filename", "alt", "folder", "isDemonstration", "createdAt"],
    // Was: "Every image needs alt text, or an explicit decorative flag. This is enforced."
    description:
      "Every photo needs a short description, so people using screen readers know what it shows.",
    pagination: { defaultLimit: 25 },
    hideAPIURL: true,
  },
  access: {
    read: () => true,
    create: ({ req }) => isPlatformStaff(req.user) || isDealerStaff(req.user),
    /*
     * Scoped to the owning dealership, as a Where clause rather than a boolean, so the
     * constraint is folded into the query instead of being checked after the row is already
     * in hand. Platform staff keep everything. A dealership with no photo of its own matches
     * nothing, and Rynet's own library (no dealership) matches nothing for any dealer.
     */
    update: scopedToOwnDealer("dealer"),
    delete: scopedToOwnDealer("dealer"),
  },
  hooks: {
    beforeValidate: [
      ({ data, req, operation }) => {
        if (!data) return data;

        // THE line, the same one Vehicles draws: the owner is replaced with the uploader's own
        // dealership rather than read from the request, so a crafted body cannot file a photo
        // under a competitor. Platform staff choose the owner, and leaving it empty means the
        // photo is Rynet's own.
        if (operation === "create" && isDealerStaff(req.user)) {
          data.dealer = dealerIdOf(req.user);
        }

        return data;
      },
    ],
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
      // "Photo description" rather than "Describe the photo", which read as an instruction when it
      // headed a column in the list.
      label: "Photo description",
      admin: {
        /*
         * What the image shows, for someone who cannot see it. Describe the subject, not the file,
         * so "2023 Toyota Hilux Raider, front three-quarter" rather than "vehicle photo".
         */
        description:
          "Needed unless Decorative only is ticked. Say what it shows, for example 2023 Toyota Hilux Raider, front view.",
      },
      validate: (value: unknown, { data }: { data?: Record<string, unknown> }) => {
        if (data?.isDecorative) return true;
        if (typeof value === "string" && value.trim().length > 0) return true;
        return "Describe the photo, or tick Decorative only if it shows nothing a person needs to know.";
      },
    },
    {
      name: "isDecorative",
      type: "checkbox",
      defaultValue: false,
      label: "Decorative only",
      admin: {
        components: { Cell: "/components/admin/cells/value-cells#YesNoCell" },
        // Tick only for images that carry no information, such as a background texture. These
        // are hidden from screen readers.
        description: "Tick only for backgrounds and patterns.",
      },
    },
    {
      name: "credit",
      type: "text",
      label: "Photo credit",
      // Photographer or source, where one is owed.
      admin: { disableListFilter: true },
    },
    {
      /*
       * Seeded illustration, not a dealer's photograph.
       *
       * The demonstration stock is illustrated with real photographs of the real models from
       * Wikimedia Commons, because a car marketplace with no photographs in it cannot be
       * judged, designed or demonstrated. They are photographs of the MODEL, never of the
       * individual car, and every listing that carries one already says it is an example.
       *
       * This flag is what lets all of it be found and deleted in one command the day real
       * dealer photography arrives, and what keeps it out of anything that speaks to a
       * machine. Same rule as the listings themselves: see structured-data.ts.
       *
       * Was described as: "Seeded illustration rather than a real photograph of a real car.
       * Deleted when real stock arrives." Read only in the admin (UI only; access is unchanged).
       */
      name: "isDemonstration",
      type: "checkbox",
      defaultValue: false,
      label: "Example photo",
      admin: {
        description: "A photo of the model, not of a real car for sale.",
        position: "sidebar",
        readOnly: true,
        components: { Cell: "/components/admin/cells/value-cells#YesNoCell" },
      },
    },
    {
      name: "dealer",
      type: "relationship",
      relationTo: "dealers",
      index: true,
      label: "Dealership",
      access: {
        // Only platform staff may move a photo between owners. A dealer user's value is
        // written server side on upload regardless, so this closes the admin path too.
        update: ({ req }) => isPlatformStaff(req.user),
      },
      admin: {
        position: "sidebar",
        // Set from the signed-in account when a dealership uploads (beforeValidate above).
        description: "Whose photo this is. Empty means it is Rynet's own.",
      },
    },
    {
      name: "folder",
      type: "text",
      index: true,
      label: "Folder",
      // Groups the library. For example: stock, dealers, editorial, agency.
      admin: { description: "For example stock, dealers or agency." },
    },
  ],
};
