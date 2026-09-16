import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-sqlite'

/**
 * Marks every car's saved record as saved, so the admin stops calling every car a draft.
 *
 * Cars have two things called status. `status` (Live, Sold, Draft and so on) is the only one the
 * website reads. `_status` is Payload's own save state for the edit screen: "published" means the
 * record the site reads is up to date, "draft" means there are changes only in the history. The
 * seed created every car without `_status`, so Payload's default of "draft" stuck, and every car
 * in the admin said "Draft" in its header while being live on the site.
 *
 * 1. Every main row becomes "published". The main row is, by definition, what the site shows, so
 *    that is simply true. The site never reads `_status`, so nothing public changes.
 *
 * 2. The history row that holds exactly that saved record (same car, same updated time) becomes
 *    "published" too. A save that is not a draft copies the main row's updated time into its
 *    history row, so the match is exact. A genuine unsaved draft, kept by autosave after the last
 *    save, has a later time, stays "draft", and the edit screen still says there are changes that
 *    are not on the site yet. Older history rows are left as they are.
 *
 * Plain SQL: no hooks run and no new history is written. Safe on an empty database, and a second
 * run changes nothing.
 */
export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  const cars = await db.run(sql`
    UPDATE vehicles SET _status = 'published'
    WHERE _status IS NULL OR _status = 'draft'
  `)

  const versions = await db.run(sql`
    UPDATE _vehicles_v SET version__status = 'published'
    WHERE (version__status IS NULL OR version__status = 'draft')
      AND EXISTS (
        SELECT 1 FROM vehicles m
        WHERE m.id = _vehicles_v.parent_id
          AND m.updated_at = _vehicles_v.version_updated_at
      )
  `)

  payload.logger.info(
    `car save state: ${cars.rowsAffected ?? 0} cars marked saved, ${versions.rowsAffected ?? 0} history rows matched`,
  )
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // Nothing worth restoring: "draft" was never true of these records, it was a missing default.
}
