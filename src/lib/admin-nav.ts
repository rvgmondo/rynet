/**
 * The admin menu, in the order the owner works.
 *
 * Payload builds its menu from each collection's `admin.group` label, in the order the
 * collections are listed in src/payload.config.ts. These are those labels, kept in one place so
 * the collections, the menu (src/components/admin/nav) and the home screen
 * (src/components/admin/dashboard) cannot drift apart.
 *
 * Labels only. A group is not a database column and renaming one changes nothing stored.
 */
export const ADMIN_GROUP = {
  /** Cars, dealerships and enquiries. Drawn as the top of the menu, with no heading to open. */
  daily: "Every day",
  details: "Details",
  people: "People",
  settings: "Website settings",
  /** Lookup lists and records nobody edits often. Folded away until somebody opens it. */
  lists: "Lists and records",
} as const;

export type AdminGroupLabel = (typeof ADMIN_GROUP)[keyof typeof ADMIN_GROUP];

/** Groups that start folded away. A person's own choice, once they make one, wins. */
export const ADMIN_GROUPS_COLLAPSED_BY_DEFAULT: readonly string[] = [ADMIN_GROUP.lists];

/** One plain sentence under each group on the home screen. */
export const ADMIN_GROUP_DESCRIPTIONS: Record<string, string> = {
  [ADMIN_GROUP.details]: "Branches, and every photo and file on the site.",
  [ADMIN_GROUP.people]: "Who can sign in here, and who signed up on the site.",
  [ADMIN_GROUP.settings]: "The finance figures and what each dealership plan includes.",
  [ADMIN_GROUP.lists]:
    "The makes, models, places and other lists the site is built from, and the consent records we must keep.",
};
