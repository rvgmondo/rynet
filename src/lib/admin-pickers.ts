import type { CollectionConfig, Field } from "payload";

/**
 * How the admin's pickers behave, set once for every collection instead of field by field.
 *
 * Three things confused people filling in a car or an enquiry:
 *
 * 1. A small pencil inside every chosen value ("Toyota", "Eastern Cape") opened that record for
 *    editing in a panel over the form, so renaming a make for the whole site was one stray click
 *    away while adding a car. The pencil is gone. The records are still edited from their own
 *    lists.
 * 2. A "+" beside a car's dealership, an enquiry's car or its "Handled by" made a new dealership,
 *    car or staff account from inside another form. Those are made from their own screens, with
 *    their own checks in view. The "+" stays beside lookup lists (a make, a colour), where adding
 *    a missing entry while filling in a car is the point.
 * 3. A list that takes several values read "Choose one", like every other list.
 *
 * Presentation only: `allowEdit`, `allowCreate` and `placeholder` are admin settings. Access rules
 * decide who may create or change what, and they are untouched. A value a field sets for itself
 * is kept.
 */

/** Records made from their own screens, never from a "+" inside another form. */
export const NO_CREATE_FROM_PICKER: readonly string[] = [
  "vehicles",
  "dealers",
  "branches",
  "users",
  "buyers",
  "plans",
  "leads",
  "consent-records",
  // South Africa's nine provinces are the whole list.
  "provinces",
];

export const CHOOSE_ANY = "Choose any";

type AnyField = Record<string, unknown> & { type?: string };

function relationTargets(field: AnyField): string[] {
  const relationTo = field.relationTo;
  if (typeof relationTo === "string") return [relationTo];
  if (Array.isArray(relationTo))
    return relationTo.filter((v): v is string => typeof v === "string");
  return [];
}

function pickerAdmin(field: AnyField): AnyField {
  const admin = { ...((field.admin as Record<string, unknown> | undefined) ?? {}) };

  if (field.type === "relationship") {
    if (admin.allowEdit === undefined) admin.allowEdit = false;
    const targets = relationTargets(field);
    if (
      admin.allowCreate === undefined &&
      targets.length > 0 &&
      targets.every((slug) => NO_CREATE_FROM_PICKER.includes(slug))
    ) {
      admin.allowCreate = false;
    }
  }

  if (
    (field.type === "relationship" || field.type === "select") &&
    field.hasMany === true &&
    admin.placeholder === undefined
  ) {
    admin.placeholder = CHOOSE_ANY;
  }

  return { ...field, admin };
}

/** The same fields, with the picker settings above applied at every depth. */
export function withPlainPickerFields(fields: readonly Field[]): Field[] {
  return fields.map((original) => {
    let field = original as unknown as AnyField;

    if (Array.isArray(field.fields)) {
      field = { ...field, fields: withPlainPickerFields(field.fields as Field[]) };
    }
    if (Array.isArray(field.tabs)) {
      field = {
        ...field,
        tabs: (field.tabs as Array<{ fields: Field[] }>).map((tab) => ({
          ...tab,
          fields: withPlainPickerFields(tab.fields),
        })),
      };
    }
    if (Array.isArray(field.blocks)) {
      field = {
        ...field,
        blocks: (field.blocks as Array<{ fields: Field[] }>).map((block) => ({
          ...block,
          fields: withPlainPickerFields(block.fields),
        })),
      };
    }
    if (field.type === "relationship" || field.type === "select") {
      field = pickerAdmin(field);
    }
    return field as unknown as Field;
  });
}

export function withPlainPickers(collections: CollectionConfig[]): CollectionConfig[] {
  return collections.map((collection) => ({
    ...collection,
    fields: withPlainPickerFields(collection.fields),
  }));
}
