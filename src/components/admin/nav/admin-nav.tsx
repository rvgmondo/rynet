import type { PayloadRequest, ServerProps } from "payload";
import { PREFERENCE_KEYS } from "payload/shared";

import { ADMIN_GROUP, ADMIN_GROUPS_COLLAPSED_BY_DEFAULT } from "@/lib/admin-nav";

import { AdminNavClient, type AdminNavSection } from "./admin-nav-client";
import { buildAdminNavGroups } from "./nav-groups";

type NavPreferences = {
  open?: boolean;
  groups?: Record<string, { open?: boolean } | undefined>;
};

/**
 * The admin menu, replacing Payload's (`admin.components.Nav`).
 *
 * What it changes from the stock menu, and why:
 *   - Home, Cars, Dealerships and Enquiries sit at the top as plain links, with no group to
 *     open first, because they are the day's work.
 *   - "Lists and records" (the lookup lists and consent records) starts folded away. Payload
 *     has no setting for a group that starts closed.
 *   - Each group heading is a real disclosure button that says whether it is open
 *     (aria-expanded). Payload's does not.
 *   - Sign out and a link to the public website are written out in words.
 *
 * What it keeps: Payload's own wrapper (so the menu button, the mobile sheet and the saved
 * open or closed state all behave as before) and the per-person preference record, so a group
 * somebody opens stays open for them.
 *
 * UI only. Every link is filtered by the same read permission Payload uses, and access rules
 * still decide what each page shows.
 */
export async function AdminNav(
  props: ServerProps & { req?: PayloadRequest; visibleEntities?: ServerProps["visibleEntities"] },
) {
  const { payload, permissions, i18n, visibleEntities, req, user } = props;
  if (!payload?.config) return null;

  const groups = buildAdminNavGroups({
    payload,
    permissions,
    i18n,
    visibleCollections: visibleEntities?.collections ?? [],
    visibleGlobals: visibleEntities?.globals ?? [],
  });

  let preferences: NavPreferences | null = null;
  if (user && req) {
    const found = await payload.find({
      collection: "payload-preferences",
      depth: 0,
      limit: 1,
      pagination: false,
      req,
      where: {
        and: [
          { key: { equals: PREFERENCE_KEYS.NAV } },
          { "user.relationTo": { equals: user.collection } },
          { "user.value": { equals: user.id } },
        ],
      },
    });
    const value = found.docs[0]?.value;
    if (value && typeof value === "object") preferences = value as NavPreferences;
  }

  const primary = groups.find((g) => g.label === ADMIN_GROUP.daily)?.entities ?? [];
  const sections: AdminNavSection[] = groups
    .filter((g) => g.label !== ADMIN_GROUP.daily)
    .map((g) => ({
      ...g,
      open:
        preferences?.groups?.[g.label]?.open ??
        !ADMIN_GROUPS_COLLAPSED_BY_DEFAULT.includes(g.label),
    }));

  const adminRoute = payload.config.routes.admin;

  return (
    <AdminNavClient
      adminRoute={adminRoute}
      logoutHref={`${adminRoute}${payload.config.admin.routes.logout}`}
      primary={primary}
      sections={sections}
      navPreferredOpen={preferences?.open !== false}
    />
  );
}
