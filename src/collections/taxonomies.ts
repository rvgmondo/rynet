import type { CollectionConfig } from "payload";

import { taxonomyCollection } from "./taxonomy";

/**
 * Every taxonomy, built from the one factory.
 *
 * Seeded values are real South African market data, not placeholders. The nine provinces
 * are the nine provinces; the makes are the makes actually sold here.
 *
 * Labels and descriptions are written for the person keeping these lists. Where an older
 * description explained the reasoning, it is kept as a comment beside the new one.
 */

const notInList = { disableListColumn: true, disableListFilter: true } as const;

export const Provinces: CollectionConfig = taxonomyCollection({
  slug: "provinces",
  singular: "Province",
  plural: "Provinces",
  sortByPosition: true,
  // Was: "The nine provinces. Used by the location facet and the dealer directory."
  description: "The nine provinces, used by the location filter and the dealership list.",
});

export const Cities: CollectionConfig = taxonomyCollection({
  slug: "cities",
  singular: "Town or city",
  plural: "Towns and cities",
  parentField: "province",
  fields: [
    {
      name: "province",
      type: "relationship",
      relationTo: "provinces",
      required: true,
      index: true,
      label: "Province",
    },
    {
      type: "collapsible",
      label: "Map centre",
      admin: { initCollapsed: true },
      fields: [
        {
          type: "row",
          fields: [
            {
              name: "latitude",
              type: "number",
              label: "Latitude",
              admin: {
                ...notInList,
                // Centre point, used to seed the radius filter when a buyer picks a city.
                description: "The middle of the town, for the distance filter.",
              },
            },
            { name: "longitude", type: "number", label: "Longitude", admin: notInList },
          ],
        },
      ],
    },
  ],
});

export const Makes: CollectionConfig = taxonomyCollection({
  slug: "makes",
  singular: "Make",
  plural: "Makes",
  // The only taxonomy whose slug shares a URL segment with the facet routes.
  guardReservedSlugs: true,
  // Was: "Manufacturers. The slug appears directly under /cars/, so reserved route words are
  // rejected."
  description:
    "Car brands. The web address name is used in /cars/ links, so a few words are not allowed.",
  fields: [
    {
      name: "logo",
      type: "upload",
      relationTo: "media",
      // NOT IMPLEMENTED: the site does not show make logos yet.
      label: "Logo (not shown on the site yet)",
      admin: notInList,
    },
    {
      name: "isPopular",
      type: "checkbox",
      defaultValue: false,
      label: "Popular make",
      admin: {
        /*
         * Was: "Shown in the shortlist above the full A to Z list on the search page."
         * NOT IMPLEMENTED: the search page does not read this yet.
         */
        description: "Not used on the site yet.",
      },
    },
  ],
});

export const Models: CollectionConfig = taxonomyCollection({
  slug: "models",
  singular: "Model",
  plural: "Models",
  parentField: "make",
  fields: [
    {
      name: "make",
      type: "relationship",
      relationTo: "makes",
      required: true,
      index: true,
      label: "Make",
    },
    {
      name: "bodyType",
      type: "relationship",
      relationTo: "body-types",
      label: "Usual body shape",
      // The usual body for this model. A listing can still override it.
      admin: { disableListColumn: true },
    },
  ],
});

export const Variants: CollectionConfig = taxonomyCollection({
  slug: "variants",
  singular: "Variant",
  plural: "Variants",
  parentField: "model",
  fields: [
    {
      name: "model",
      type: "relationship",
      relationTo: "models",
      required: true,
      index: true,
      label: "Model",
      admin: {
        /*
         * Web address names are unique across ALL variants, not per model, so two models cannot
         * both have a variant with the same name (five seeded cars point at a variant of another
         * model because of it). Changing that rule is a separate task.
         */
        description:
          "Web address names are shared by all models, so the same variant name cannot exist twice.",
      },
    },
  ],
});

export const BodyTypes: CollectionConfig = taxonomyCollection({
  slug: "body-types",
  singular: "Body shape",
  plural: "Body shapes",
  sortByPosition: true,
});

export const FuelTypes: CollectionConfig = taxonomyCollection({
  slug: "fuel-types",
  singular: "Fuel type",
  plural: "Fuel types",
  sortByPosition: true,
});

export const Transmissions: CollectionConfig = taxonomyCollection({
  slug: "transmissions",
  singular: "Gearbox",
  plural: "Gearboxes",
  sortByPosition: true,
});

export const Drivetrains: CollectionConfig = taxonomyCollection({
  slug: "drivetrains",
  singular: "Drive type",
  plural: "Drive types",
  sortByPosition: true,
});

export const Colours: CollectionConfig = taxonomyCollection({
  slug: "colours",
  singular: "Colour",
  plural: "Colours",
  parentField: "family",
  // Was: 'Manufacturer colour names, grouped into families so "Deep Sea Blue" and "Aegean Blue"
  // both filter under Blue.'
  description:
    "The makers' colour names, grouped so Deep Sea Blue and Aegean Blue both filter under Blue.",
  fields: [
    {
      name: "family",
      type: "select",
      required: true,
      label: "Colour group",
      options: [
        "White",
        "Silver",
        "Grey",
        "Black",
        "Blue",
        "Red",
        "Green",
        "Beige",
        "Brown",
        "Gold",
        "Orange",
        "Yellow",
        "Purple",
        "Other",
      ].map((value) => ({ value: value.toLowerCase(), label: value })),
      index: true,
      admin: { description: "Buyers filter by the group, for example Blue." },
    },
    {
      name: "swatch",
      type: "text",
      label: "Swatch colour",
      admin: {
        ...notInList,
        // Hex value for the filter swatch. Decorative only, never the sole indicator.
        description: "A hex colour like #1F4E8C.",
      },
    },
  ],
});

export const FeatureCategories: CollectionConfig = taxonomyCollection({
  slug: "feature-categories",
  singular: "Feature group",
  plural: "Feature groups",
  sortByPosition: true,
});

export const Features: CollectionConfig = taxonomyCollection({
  slug: "features",
  singular: "Feature",
  plural: "Features",
  parentField: "category",
  // Was: "A structured list, never free text. Free-text features cannot be filtered, compared or
  // counted."
  description: "The features a car can have. Buyers filter by these, so pick from here.",
  fields: [
    {
      name: "category",
      type: "relationship",
      relationTo: "feature-categories",
      required: true,
      index: true,
      label: "Feature group",
    },
    {
      name: "isHighlight",
      type: "checkbox",
      defaultValue: false,
      label: "Highlight on car cards",
      admin: {
        /*
         * Was: "Shown as a chip on the listing card, not just in the full spec."
         * NOT IMPLEMENTED: the listing card does not read this yet.
         */
        description: "Not used on the site yet.",
      },
    },
  ],
});

export const Franchises: CollectionConfig = taxonomyCollection({
  slug: "franchises",
  singular: "Franchise",
  plural: "Franchises",
  parentField: "make",
  // Was: "Manufacturer franchise affiliations a dealership holds."
  description: "The brands a dealership can be an official dealer for.",
  fields: [{ name: "make", type: "relationship", relationTo: "makes", index: true, label: "Make" }],
});

export const DealerGroups: CollectionConfig = taxonomyCollection({
  slug: "dealer-groups",
  singular: "Dealer group",
  plural: "Dealer groups",
  description: "Companies that own several dealerships.",
  fields: [{ name: "logo", type: "upload", relationTo: "media", label: "Logo", admin: notInList }],
});

export const Accreditations: CollectionConfig = taxonomyCollection({
  slug: "accreditations",
  singular: "Industry body",
  plural: "Industry bodies",
  // Was: "Industry bodies such as the RMI, NADA and MIWA. Shown on a dealer profile only once
  // verified."
  description: "Industry bodies such as the RMI, NADA and MIWA.",
  fields: [
    {
      name: "badge",
      type: "upload",
      relationTo: "media",
      // NOT IMPLEMENTED: the dealership page does not show badges yet.
      label: "Badge (not shown on the site yet)",
      admin: notInList,
    },
  ],
});

export const TAXONOMY_COLLECTIONS: CollectionConfig[] = [
  Makes,
  Models,
  Variants,
  BodyTypes,
  FuelTypes,
  Transmissions,
  Drivetrains,
  Colours,
  FeatureCategories,
  Features,
  Provinces,
  Cities,
  Franchises,
  DealerGroups,
  Accreditations,
];
