import type { CollectionConfig, Field } from "payload";
import { describe, expect, it } from "vitest";

import { Buyers } from "@/collections/Buyers";
import { Dealers } from "@/collections/Dealers";
import { Leads } from "@/collections/Leads";
import { Users } from "@/collections/Users";
import { Vehicles } from "@/collections/Vehicles";

import {
  ACCOUNT_STATUS_TONES,
  CAR_QUICK_FILTERS,
  CAR_STATUS_LIST_LABELS,
  CAR_STATUS_TONES,
  DEALER_QUICK_FILTERS,
  DEALER_STATUS_TONES,
  LEAD_QUICK_FILTERS,
  LEAD_STATUS_TONES,
  LEAD_TYPE_LIST_LABELS,
  LEAD_TYPE_TONES,
} from "./admin-quick-filters";

/**
 * The quick filters and badge colours name option VALUES by hand. A typo there would not fail a
 * build, it would quietly show an empty list or a grey badge, so each value is checked against
 * the collection it belongs to.
 */

function findField(fields: Field[], name: string): Field | undefined {
  for (const field of fields) {
    if ("name" in field && field.name === name) return field;
    if (field.type === "tabs") {
      for (const tab of field.tabs) {
        const found = findField(tab.fields, name);
        if (found) return found;
      }
    }
    if ((field.type === "row" || field.type === "collapsible") && "fields" in field) {
      const found = findField(field.fields, name);
      if (found) return found;
    }
  }
  return undefined;
}

function optionValues(collection: CollectionConfig, name: string): string[] {
  const field = findField(collection.fields, name);
  if (!field || !("options" in field))
    throw new Error(`${collection.slug}.${name} is not a select`);
  return field.options.map((option) => (typeof option === "string" ? option : option.value));
}

function expectFieldExists(collection: CollectionConfig, name: string) {
  expect(findField(collection.fields, name), `${collection.slug}.${name}`).toBeDefined();
}

describe("admin quick filters and badges", () => {
  it("only name car statuses that exist", () => {
    const statuses = optionValues(Vehicles, "status");
    expect(Object.keys(CAR_STATUS_TONES).sort()).toEqual([...statuses].sort());
    expect(Object.keys(CAR_STATUS_LIST_LABELS).sort()).toEqual([...statuses].sort());
  });

  it("only name enquiry statuses and kinds that exist", () => {
    const statuses = optionValues(Leads, "status");
    const types = optionValues(Leads, "type");
    expect(Object.keys(LEAD_STATUS_TONES).sort()).toEqual([...statuses].sort());
    expect(Object.keys(LEAD_TYPE_LIST_LABELS).sort()).toEqual([...types].sort());
    for (const value of Object.keys(LEAD_TYPE_TONES)) expect(types).toContain(value);
  });

  it("only name dealership and account statuses that exist", () => {
    expect(Object.keys(DEALER_STATUS_TONES).sort()).toEqual(
      [...optionValues(Dealers, "verificationStatus")].sort(),
    );
    const accounts = new Set([...optionValues(Users, "status"), ...optionValues(Buyers, "status")]);
    expect(Object.keys(ACCOUNT_STATUS_TONES).sort()).toEqual([...accounts].sort());
  });

  it("filter on fields and values the lists really have", () => {
    const cases: [CollectionConfig, typeof CAR_QUICK_FILTERS][] = [
      [Vehicles, CAR_QUICK_FILTERS],
      [Leads, LEAD_QUICK_FILTERS],
      [Dealers, DEALER_QUICK_FILTERS],
    ];
    for (const [collection, filters] of cases) {
      expect(filters[0]?.conditions, "the first button clears the filter").toEqual([]);
      for (const filter of filters) {
        for (const condition of filter.conditions) {
          expectFieldExists(collection, condition.field);
          const field = findField(collection.fields, condition.field);
          if (field && "options" in field) {
            const values = optionValues(collection, condition.field);
            const wanted = Array.isArray(condition.value) ? condition.value : [condition.value];
            for (const value of wanted) expect(values).toContain(value);
          }
        }
      }
    }
  });
});
