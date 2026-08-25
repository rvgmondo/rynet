import type { CollectionConfig, CollectionSlug, Field } from "payload";

import { isPlatformStaff, platformStaffOnly } from "@/access/roles";
import { isReservedSlug, slugify } from "@/lib/slug";

/**
 * Taxonomies are managed data, never enums.
 *
 * The South African market list changes: a make enters, a model gains a variant, a body
 * type gets called something else. Hardcoding these means a migration and a deploy every
 * time, which in practice means someone types the value into a free-text field instead and
 * the facet breaks. MotoHubSA hit this twice, on `make` and again on post categories, and
 * fixed it the same way both times.
 *
 * Every taxonomy therefore carries the same spine:
 *
 *   - `aliases`, which feed both the typeahead parser ("bakkie" is a pickup, "combi" is an
 *     MPV) and the feed importer's column mapping, so a dealer's own vocabulary resolves to
 *     ours without a human intervening.
 *   - `mergedInto`, so a duplicate created by a sloppy import can be merged rather than
 *     deleted. Merging rewrites the references and writes a redirect; deleting orphans
 *     every listing that pointed at it.
 */

export type TaxonomyOptions = {
  slug: string;
  singular: string;
  plural: string;
  group?: string;
  /** Extra fields specific to this taxonomy, appended after the shared spine. */
  fields?: Field[];
  /** Set for `makes`, whose slug shares a URL segment with the facet routes. */
  guardReservedSlugs?: boolean;
  description?: string;
};

export function taxonomyCollection(options: TaxonomyOptions): CollectionConfig {
  const {
    slug,
    singular,
    plural,
    group = "Taxonomy",
    fields = [],
    guardReservedSlugs = false,
    description,
  } = options;

  return {
    slug,
    labels: { singular, plural },
    admin: {
      useAsTitle: "name",
      defaultColumns: ["name", "slug", "isActive", "sortOrder"],
      group,
      description,
    },
    access: {
      // Taxonomies are public: the facet rails, the sitemaps and the typeahead all read them
      // without a session. Only platform staff can change them.
      read: () => true,
      create: platformStaffOnly,
      update: platformStaffOnly,
      delete: ({ req }) => isPlatformStaff(req.user),
    },
    fields: [
      { name: "name", type: "text", required: true, index: true },
      {
        name: "slug",
        type: "text",
        required: true,
        unique: true,
        index: true,
        admin: {
          description: "Appears in the URL. Changing it writes a redirect automatically.",
        },
        hooks: {
          beforeValidate: [
            ({ value, data }) => {
              const source =
                typeof value === "string" && value.trim().length > 0
                  ? value
                  : ((data?.name as string) ?? "");
              return slugify(source);
            },
          ],
        },
        validate: (value: unknown) => {
          if (typeof value !== "string" || value.length === 0) {
            return "That name contains no characters usable in a URL. Use letters, numbers and hyphens.";
          }
          if (guardReservedSlugs && isReservedSlug(value)) {
            return `"${value}" is reserved by a route on the site and would shadow it. Choose another name or set the address by hand.`;
          }
          return true;
        },
      },
      {
        name: "aliases",
        type: "text",
        hasMany: true,
        admin: {
          description:
            "Other names buyers and dealer feeds use for this. Feeds the search box and the stock importer. For example a bakkie is a pickup, a combi is an MPV.",
        },
      },
      {
        name: "isActive",
        type: "checkbox",
        defaultValue: true,
        index: true,
        admin: {
          position: "sidebar",
          description: "Inactive values stay on existing listings but stop appearing in filters.",
        },
      },
      {
        name: "sortOrder",
        type: "number",
        defaultValue: 0,
        admin: {
          position: "sidebar",
          description: "Lower sorts first. Equal values fall back to alphabetical.",
        },
      },
      {
        name: "mergedInto",
        type: "relationship",
        relationTo: slug as CollectionSlug,
        admin: {
          position: "sidebar",
          description:
            "Set when this is a duplicate. References are rewritten to the target and a redirect is written. Merge rather than delete, or every listing pointing here loses its value.",
        },
      },
      ...fields,
    ],
    timestamps: true,
  };
}
