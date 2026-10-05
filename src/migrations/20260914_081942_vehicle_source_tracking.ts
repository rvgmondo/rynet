import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-sqlite'

/**
 * Lets a car remember which stock list it was read from, and which listing it is there.
 *
 * WRITTEN ON 17 SEPTEMBER AND NUMBERED BEFORE 20260914_081943_demo_photographs ON PURPOSE, for
 * the reason 20260914_081942_media_owner gives: that migration photographs the demonstration cars
 * through Payload's own API, which reads and writes every column the Cars collection has today.
 * On a database that has not run it yet, including the live one, it would ask for a `source`
 * column that is not there and the boot-time migration would stop. A column is added before any
 * data migration that goes through the Local API to the same collection.
 *
 * Rynet is starting to carry stock that a dealership keeps somewhere else, beginning with Amico
 * Motors' own website. An import that cannot recognise a car it has already listed does one of two
 * useless things every time it runs: it lists the same car again, or it wipes the lot and relists
 * it. Five columns fix that.
 *
 *   `source`                  the stock list, written the way a person would say it, for example
 *                             amicomotors.co.za.
 *   `external_id`             how that stock list names this car. Its own post number where the
 *                             site exposes one, otherwise the address of the page.
 *   `last_seen_in_source_at`  the last run that still found the car there. A car that stops being
 *                             found is hidden rather than deleted, and this is the evidence.
 *   `source_managed`          whether the import may still change this car. Untick it and the car
 *                             is left exactly as a person edited it.
 *   `source_note`             why the import could not put a car live, written on the car so the
 *                             answer is where the question gets asked.
 *
 * THE UNIQUE INDEX is the part that matters. One car per dealership per listing on that stock
 * list, so a second run updates rather than duplicates. It is declared on the drizzle table in
 * payload.config.ts rather than typed in here by hand, so the local schema push and this migration
 * cannot disagree about whether it exists. SQLite treats NULLs in a unique index as different from
 * one another, so the 311 demonstration cars, which came from no stock list at all, are untouched:
 * they all have a NULL source and none of them collides with another.
 *
 * Nothing on the public site reads these columns, so an older build rolled back over this carries
 * on exactly as it did before.
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`vehicles\` ADD \`source\` text;`)
  await db.run(sql`ALTER TABLE \`vehicles\` ADD \`external_id\` text;`)
  await db.run(sql`ALTER TABLE \`vehicles\` ADD \`last_seen_in_source_at\` text;`)
  await db.run(sql`ALTER TABLE \`vehicles\` ADD \`source_managed\` integer DEFAULT false;`)
  await db.run(sql`ALTER TABLE \`vehicles\` ADD \`source_note\` text;`)
  await db.run(sql`CREATE INDEX \`vehicles_source_idx\` ON \`vehicles\` (\`source\`);`)
  await db.run(sql`CREATE INDEX \`vehicles_external_id_idx\` ON \`vehicles\` (\`external_id\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`vehicles_source_listing_idx\` ON \`vehicles\` (\`dealer_id\`,\`source\`,\`external_id\`);`)
  await db.run(sql`ALTER TABLE \`_vehicles_v\` ADD \`version_source\` text;`)
  await db.run(sql`ALTER TABLE \`_vehicles_v\` ADD \`version_external_id\` text;`)
  await db.run(sql`ALTER TABLE \`_vehicles_v\` ADD \`version_last_seen_in_source_at\` text;`)
  await db.run(sql`ALTER TABLE \`_vehicles_v\` ADD \`version_source_managed\` integer DEFAULT false;`)
  await db.run(sql`ALTER TABLE \`_vehicles_v\` ADD \`version_source_note\` text;`)
  await db.run(sql`CREATE INDEX \`_vehicles_v_version_version_source_idx\` ON \`_vehicles_v\` (\`version_source\`);`)
  await db.run(sql`CREATE INDEX \`_vehicles_v_version_version_external_id_idx\` ON \`_vehicles_v\` (\`version_external_id\`);`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX \`vehicles_source_idx\`;`)
  await db.run(sql`DROP INDEX \`vehicles_external_id_idx\`;`)
  await db.run(sql`DROP INDEX \`vehicles_source_listing_idx\`;`)
  await db.run(sql`ALTER TABLE \`vehicles\` DROP COLUMN \`source\`;`)
  await db.run(sql`ALTER TABLE \`vehicles\` DROP COLUMN \`external_id\`;`)
  await db.run(sql`ALTER TABLE \`vehicles\` DROP COLUMN \`last_seen_in_source_at\`;`)
  await db.run(sql`ALTER TABLE \`vehicles\` DROP COLUMN \`source_managed\`;`)
  await db.run(sql`ALTER TABLE \`vehicles\` DROP COLUMN \`source_note\`;`)
  await db.run(sql`DROP INDEX \`_vehicles_v_version_version_source_idx\`;`)
  await db.run(sql`DROP INDEX \`_vehicles_v_version_version_external_id_idx\`;`)
  await db.run(sql`ALTER TABLE \`_vehicles_v\` DROP COLUMN \`version_source\`;`)
  await db.run(sql`ALTER TABLE \`_vehicles_v\` DROP COLUMN \`version_external_id\`;`)
  await db.run(sql`ALTER TABLE \`_vehicles_v\` DROP COLUMN \`version_last_seen_in_source_at\`;`)
  await db.run(sql`ALTER TABLE \`_vehicles_v\` DROP COLUMN \`version_source_managed\`;`)
  await db.run(sql`ALTER TABLE \`_vehicles_v\` DROP COLUMN \`version_source_note\`;`)
}
