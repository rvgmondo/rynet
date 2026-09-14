import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-sqlite'

import { installDemoPhotos, removeDemoPhotos } from '../seed/demo-photos'

/**
 * A data migration, and the only way the demonstration photographs reach the live site.
 *
 * The host has no tsx and nobody runs seed scripts on it, so the photographs that every
 * development machine had were never on the site the owner looks at. Migrations run once, are
 * recorded, and the app applies them to itself at boot (see onInit in payload.config.ts), so
 * this is the one mechanism that is guaranteed to reach production exactly once.
 *
 * It does nothing, and is still recorded as done, on a database with no stock (a fresh install,
 * where the seed runs afterwards and `npm run seed:photos` does this job), and on a database
 * with any real stock on it at all. installDemoPhotos explains both refusals.
 */
export async function up({ payload, req }: MigrateUpArgs): Promise<void> {
  const result = await installDemoPhotos(payload, { req })
  payload.logger.info(
    result.installed
      ? `demonstration photographs: ${result.photographs} registered, ${result.listings} listings photographed`
      : `demonstration photographs skipped: ${result.reason}`,
  )
}

export async function down({ payload, req }: MigrateDownArgs): Promise<void> {
  const removed = await removeDemoPhotos(payload, { req })
  payload.logger.info(`demonstration photographs removed: ${removed}`)
}
