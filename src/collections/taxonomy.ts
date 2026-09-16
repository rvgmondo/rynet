import type { CollectionConfig, CollectionSlug, Field } from "payload";

import { isPlatformStaff, platformStaffOnly } from "@/access/roles";
import { ADMIN_GROUP } from "@/lib/admin-nav";
import { dropTag } from "@/lib/revalidate";
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
 *     every listing that pointed at it. NOT IMPLEMENTED: nothing rewrites references or writes
 *     a redirect yet. Only /sell-to-a-dealer skips merged entries, so the admin hint says only
 *     that.
 *
 * The admin form: the name and this list's own fields first, the aliases, then an "Advanced"
 * section for the web address name and the duplicate link. The containers have no `name`, so
 * the layout changes no column.
 */

export type TaxonomyOptions = {
  slug: string;
  singular: string;
  plural: string;
  group?: string;
  /** Extra fields specific to this taxonomy, shown after the name. */
  fields?: Field[];
  /** Set for `makes`, whose slug shares a URL segment with the facet routes. */
  guardReservedSlugs?: boolean;
  description?: string;
  /** The relationship to the list above this one (a model's make), shown as a list column. */
  parentField?: string;
  /**
   * Short fixed lists (body shapes, provinces) are kept in their own order rather than A to Z.
   * The list view reads a single sort field.
   */
  sortByPosition?: boolean;
};

const notInList = { disableListColumn: true, disableListFilter: true } as const;

export function taxonomyCollection(options: TaxonomyOptions): CollectionConfig {
  const {
    slug,
    singular,
    plural,
    group = ADMIN_GROUP.lists,
    fields = [],
    guardReservedSlugs = false,
    description,
    parentField,
    sortByPosition = false,
  } = options;

  return {
    slug,
    labels: { singular, plural },
    defaultSort: sortByPosition ? "sortOrder" : "name",
    // Every taxonomy read on the public site is cached under one tag. Editing one here is
    // what drops it, so a corrected make name is live on the next request rather than within
    // the hour the timer would otherwise allow.
    hooks: {
      afterChange: [() => dropTag("taxonomy")],
      afterDelete: [() => dropTag("taxonomy")],
    },
    admin: {
      useAsTitle: "name",
      defaultColumns: [
        "name",
        ...(parentField ? [parentField] : []),
        "isActive",
        ...(sortByPosition ? ["sortOrder"] : []),
      ],
      group,
      description,
      pagination: { defaultLimit: 25 },
      hideAPIURL: true,
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
      { name: "name", type: "text", required: true, index: true, label: "Name" },
      ...fields,
      {
        name: "aliases",
        type: "text",
        hasMany: true,
        label: "Other names people use",
        admin: {
          ...notInList,
          /*
           * Other names buyers and dealer feeds use for this. Feeds the search box and the stock
           * importer. For example a bakkie is a pickup, a combi is an MPV.
           */
          description: "For example bakkie for pickup. Helps search and the sell form.",
        },
      },
      {
        name: "isActive",
        type: "checkbox",
        defaultValue: true,
        index: true,
        label: "Show in filters",
        admin: {
          position: "sidebar",
          // Inactive values stay on existing listings but stop appearing in filters.
          description: "Untick to hide it. Cars that use it keep it.",
        },
      },
      {
        name: "sortOrder",
        type: "number",
        defaultValue: 0,
        label: "Position",
        admin: {
          position: "sidebar",
          disableListFilter: true,
          // Lower sorts first. Equal values fall back to alphabetical.
          description: "Lower numbers come first.",
        },
      },
      {
        type: "collapsible",
        label: "Advanced",
        admin: { initCollapsed: true },
        fields: [
          {
            name: "slug",
            type: "text",
            required: true,
            unique: true,
            index: true,
            label: "Web address name",
            admin: {
              ...notInList,
              /*
               * Was: "Appears in the URL. Changing it writes a redirect automatically."
               * NOT IMPLEMENTED: nothing writes a redirect when this changes.
               */
              description: "Filled in from the name.",
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
            name: "mergedInto",
            type: "relationship",
            relationTo: slug as CollectionSlug,
            label: "Duplicate of",
            admin: {
              ...notInList,
              /*
               * Was: "Set when this is a duplicate. References are rewritten to the target and a
               * redirect is written. Merge rather than delete, or every listing pointing here
               * loses its value." NOT IMPLEMENTED: references are not rewritten and no redirect
               * is written. /sell-to-a-dealer does skip merged entries.
               */
              description: "Hides this from the sell form. Cars that use it are not moved.",
            },
          },
        ],
      },
    ],
    timestamps: true,
  };
}
