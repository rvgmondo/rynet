import type { Payload, SanitizedPermissions, ServerProps } from "payload";

type I18nClient = ServerProps["i18n"];

/**
 * The admin menu's groups, built from the config the same way Payload builds its own.
 *
 * Group order is the order a group's first collection appears in src/payload.config.ts, then
 * the globals. An entity appears only when the signed-in person may read it and it is not
 * hidden, so the menu never offers a page that would refuse to open. `admin.group: false`
 * leaves an entity out entirely, as it does in Payload's menu.
 *
 * Shared by the menu and the home screen, so both always list the same things.
 */

export type AdminNavEntity = {
  slug: string;
  kind: "collection" | "global";
  label: string;
  href: string;
};

export type AdminNavGroup = {
  label: string;
  entities: AdminNavEntity[];
};

type Label = unknown;

/** A static label, a translation record or a label function, read as plain text. */
export function readLabel(label: Label, i18n: I18nClient, fallback: string): string {
  const value =
    typeof label === "function"
      ? (label as (args: { i18n: I18nClient; t: I18nClient["t"] }) => unknown)({
          i18n,
          t: i18n.t,
        })
      : label;
  if (typeof value === "string" && value.length > 0) return value;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const chosen = record[i18n.language] ?? record.en ?? Object.values(record)[0];
    if (typeof chosen === "string" && chosen.length > 0) return chosen;
  }
  return fallback;
}

export function buildAdminNavGroups({
  payload,
  permissions,
  i18n,
  visibleCollections,
  visibleGlobals,
}: {
  payload: Payload;
  permissions: SanitizedPermissions | undefined;
  i18n: I18nClient;
  visibleCollections: readonly string[];
  visibleGlobals: readonly string[];
}): AdminNavGroup[] {
  const adminRoute = payload.config.routes.admin;
  const groups: AdminNavGroup[] = [];
  const other: AdminNavGroup = { label: "Other", entities: [] };

  const add = (group: unknown, entity: AdminNavEntity) => {
    if (group === false) return;
    const label = readLabel(group, i18n, "");
    if (!label) {
      other.entities.push(entity);
      return;
    }
    let target = groups.find((g) => g.label === label);
    if (!target) {
      target = { label, entities: [] };
      groups.push(target);
    }
    target.entities.push(entity);
  };

  for (const collection of payload.config.collections) {
    if (!visibleCollections.includes(collection.slug)) continue;
    if (!permissions?.collections?.[collection.slug]?.read) continue;
    add(collection.admin?.group, {
      slug: collection.slug,
      kind: "collection",
      label: readLabel(collection.labels?.plural, i18n, collection.slug),
      href: `${adminRoute}/collections/${collection.slug}`,
    });
  }

  for (const global of payload.config.globals) {
    if (!visibleGlobals.includes(global.slug)) continue;
    if (!permissions?.globals?.[global.slug]?.read) continue;
    add(global.admin?.group, {
      slug: global.slug,
      kind: "global",
      label: readLabel(global.label, i18n, global.slug),
      href: `${adminRoute}/globals/${global.slug}`,
    });
  }

  if (other.entities.length > 0) groups.push(other);
  return groups;
}
