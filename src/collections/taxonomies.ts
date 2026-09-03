import type { CollectionConfig } from "payload";

import { taxonomyCollection } from "./taxonomy";

/**
 * Every taxonomy, built from the one factory.
 *
 * Seeded values are real South African market data, not placeholders. The nine provinces
 * are the nine provinces; the makes are the makes actually sold here.
 */

export const Provinces: CollectionConfig = taxonomyCollection({
  slug: "provinces",
  singular: "Province",
  plural: "Provinces",
  group: "Places",
  description: "The nine provinces. Used by the location facet and the dealer directory.",
});

export const Cities: CollectionConfig = taxonomyCollection({
  slug: "cities",
  singular: "City or town",
  plural: "Cities and towns",
  group: "Places",
  fields: [
    {
      name: "province",
      type: "relationship",
      relationTo: "provinces",
      required: true,
      index: true,
    },
    {
      name: "latitude",
      type: "number",
      admin: {
        description: "Centre point, used to seed the radius filter when a buyer picks a city.",
      },
    },
    { name: "longitude", type: "number" },
  ],
});

export const Makes: CollectionConfig = taxonomyCollection({
  slug: "makes",
  singular: "Make",
  plural: "Makes",
  // The only taxonomy whose slug shares a URL segment with the facet routes.
  guardReservedSlugs: true,
  description:
    "Manufacturers. The slug appears directly under /cars/, so reserved route words are rejected.",
  fields: [
    { name: "logo", type: "upload", relationTo: "media" },
    {
      name: "isPopular",
      type: "checkbox",
      defaultValue: false,
      admin: {
        description: "Shown in the shortlist above the full A to Z list on the search page.",
      },
    },
  ],
});

export const Models: CollectionConfig = taxonomyCollection({
  slug: "models",
  singular: "Model",
  plural: "Models",
  fields: [
    { name: "make", type: "relationship", relationTo: "makes", required: true, index: true },
    {
      name: "bodyType",
      type: "relationship",
      relationTo: "body-types",
      admin: { description: "The usual body for this model. A listing can still override it." },
    },
  ],
});

export const Variants: CollectionConfig = taxonomyCollection({
  slug: "variants",
  singular: "Variant",
  plural: "Variants",
  fields: [
    { name: "model", type: "relationship", relationTo: "models", required: true, index: true },
  ],
});

export const BodyTypes: CollectionConfig = taxonomyCollection({
  slug: "body-types",
  singular: "Body type",
  plural: "Body types",
});

export const FuelTypes: CollectionConfig = taxonomyCollection({
  slug: "fuel-types",
  singular: "Fuel type",
  plural: "Fuel types",
});

export const Transmissions: CollectionConfig = taxonomyCollection({
  slug: "transmissions",
  singular: "Transmission",
  plural: "Transmissions",
});

export const Drivetrains: CollectionConfig = taxonomyCollection({
  slug: "drivetrains",
  singular: "Drivetrain",
  plural: "Drivetrains",
});

export const Colours: CollectionConfig = taxonomyCollection({
  slug: "colours",
  singular: "Colour",
  plural: "Colours",
  description:
    'Manufacturer colour names, grouped into families so "Deep Sea Blue" and "Aegean Blue" both filter under Blue.',
  fields: [
    {
      name: "family",
      type: "select",
      required: true,
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
    },
    {
      name: "swatch",
      type: "text",
      admin: {
        description: "Hex value for the filter swatch. Decorative only, never the sole indicator.",
      },
    },
  ],
});

export const FeatureCategories: CollectionConfig = taxonomyCollection({
  slug: "feature-categories",
  singular: "Feature category",
  plural: "Feature categories",
});

export const Features: CollectionConfig = taxonomyCollection({
  slug: "features",
  singular: "Feature",
  plural: "Features",
  description:
    "A structured list, never free text. Free-text features cannot be filtered, compared or counted.",
  fields: [
    {
      name: "category",
      type: "relationship",
      relationTo: "feature-categories",
      required: true,
      index: true,
    },
    {
      name: "isHighlight",
      type: "checkbox",
      defaultValue: false,
      admin: { description: "Shown as a chip on the listing card, not just in the full spec." },
    },
  ],
});

export const Franchises: CollectionConfig = taxonomyCollection({
  slug: "franchises",
  singular: "Franchise",
  plural: "Franchises",
  group: "Dealers",
  description: "Manufacturer franchise affiliations a dealership holds.",
  fields: [{ name: "make", type: "relationship", relationTo: "makes", index: true }],
});

export const DealerGroups: CollectionConfig = taxonomyCollection({
  slug: "dealer-groups",
  singular: "Dealer group",
  plural: "Dealer groups",
  group: "Dealers",
  fields: [{ name: "logo", type: "upload", relationTo: "media" }],
});

export const Accreditations: CollectionConfig = taxonomyCollection({
  slug: "accreditations",
  singular: "Accreditation",
  plural: "Accreditations",
  group: "Dealers",
  description:
    "Industry bodies such as the RMI, NADA and MIWA. Shown on a dealer profile only once verified.",
  fields: [{ name: "badge", type: "upload", relationTo: "media" }],
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
