import type { CollectionConfig } from "payload";

import { platformStaffOnly } from "@/access/roles";

/**
 * How many people looked at each car, one row per car per day.
 *
 * Written only by the view counter (src/lib/track/views.ts), which buffers views in memory and
 * writes them in one go a minute later, so a page view is never a write on the busiest pages of a
 * one-file SQLite database. Read by the monthly dealer report.
 *
 * A view is one visitor opening one car once on one day, with JavaScript on, who is not signed in
 * as Rynet or dealership staff and is not a known crawler. It is a lower number than a server log
 * would give, and an honest one.
 */
export const CarViews: CollectionConfig = {
  slug: "car-views",
  labels: { singular: "Car view count", plural: "Car view counts" },
  admin: { hidden: true },
  access: {
    read: platformStaffOnly,
    create: () => false,
    update: () => false,
    delete: platformStaffOnly,
  },
  fields: [
    { name: "vehicle", type: "relationship", relationTo: "vehicles", required: true, index: true },
    { name: "dealer", type: "relationship", relationTo: "dealers", index: true },
    { name: "day", type: "text", required: true, index: true },
    { name: "views", type: "number", required: true, defaultValue: 0 },
  ],
};
