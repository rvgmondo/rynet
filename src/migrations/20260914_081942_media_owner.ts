import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

/**
 * Gives every photo an owner, so one dealership cannot change or delete another's pictures.
 *
 * WRITTEN ON 17 SEPTEMBER AND NUMBERED BEFORE 20260914_081943_demo_photographs ON PURPOSE.
 * Migrations run in filename order, and that one plants the demonstration photographs through
 * Payload's own API, which builds its INSERT from the collections as they are today. On any
 * database that has not run it yet, including the live one, it would insert a `dealer_id` that
 * the table does not have and the whole boot-time migration would stop there. The rule this is
 * an instance of: a column has to be added before any data migration that writes through the
 * Local API to the same collection, whatever order the two were written in.
 *
 * Media update and delete used to allow any dealer account. Adding `dealer_id` is what lets the
 * access rule be a query rather than a role check, and the index is what keeps that query cheap
 * on a library that will end up holding every car on the platform.
 *
 * BACKFILL. An empty owner means the photo is Rynet's own, and every photo that exists today is:
 * the library is the seeded demonstration stock plus the site's own artwork, uploaded by staff
 * before any dealership had an account. So the backfill is to leave them all platform owned, and
 * the UPDATE below says that out loud rather than relying on a new column happening to be null.
 * It is also what makes a second run harmless.
 *
 * Nothing on the public site reads this column, so an older build rolled back over it carries on
 * exactly as before.
 */
export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`media\` ADD \`dealer_id\` integer REFERENCES dealers(id);`)
  await db.run(sql`CREATE INDEX \`media_dealer_idx\` ON \`media\` (\`dealer_id\`);`)

  const platformOwned = await db.run(sql`UPDATE \`media\` SET \`dealer_id\` = NULL`)

  payload.logger.info(
    `photo ownership: ${platformOwned.rowsAffected ?? 0} existing photos left as Rynet's own`,
  )
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_media\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`alt\` text,
  	\`is_decorative\` integer DEFAULT false,
  	\`credit\` text,
  	\`is_demonstration\` integer DEFAULT false,
  	\`folder\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`url\` text,
  	\`thumbnail_u_r_l\` text,
  	\`filename\` text,
  	\`mime_type\` text,
  	\`filesize\` numeric,
  	\`width\` numeric,
  	\`height\` numeric,
  	\`focal_x\` numeric,
  	\`focal_y\` numeric,
  	\`sizes_thumbnail_url\` text,
  	\`sizes_thumbnail_width\` numeric,
  	\`sizes_thumbnail_height\` numeric,
  	\`sizes_thumbnail_mime_type\` text,
  	\`sizes_thumbnail_filesize\` numeric,
  	\`sizes_thumbnail_filename\` text,
  	\`sizes_card_url\` text,
  	\`sizes_card_width\` numeric,
  	\`sizes_card_height\` numeric,
  	\`sizes_card_mime_type\` text,
  	\`sizes_card_filesize\` numeric,
  	\`sizes_card_filename\` text,
  	\`sizes_gallery_url\` text,
  	\`sizes_gallery_width\` numeric,
  	\`sizes_gallery_height\` numeric,
  	\`sizes_gallery_mime_type\` text,
  	\`sizes_gallery_filesize\` numeric,
  	\`sizes_gallery_filename\` text,
  	\`sizes_hero_url\` text,
  	\`sizes_hero_width\` numeric,
  	\`sizes_hero_height\` numeric,
  	\`sizes_hero_mime_type\` text,
  	\`sizes_hero_filesize\` numeric,
  	\`sizes_hero_filename\` text
  );
  `)
  await db.run(sql`INSERT INTO \`__new_media\`("id", "alt", "is_decorative", "credit", "is_demonstration", "folder", "updated_at", "created_at", "url", "thumbnail_u_r_l", "filename", "mime_type", "filesize", "width", "height", "focal_x", "focal_y", "sizes_thumbnail_url", "sizes_thumbnail_width", "sizes_thumbnail_height", "sizes_thumbnail_mime_type", "sizes_thumbnail_filesize", "sizes_thumbnail_filename", "sizes_card_url", "sizes_card_width", "sizes_card_height", "sizes_card_mime_type", "sizes_card_filesize", "sizes_card_filename", "sizes_gallery_url", "sizes_gallery_width", "sizes_gallery_height", "sizes_gallery_mime_type", "sizes_gallery_filesize", "sizes_gallery_filename", "sizes_hero_url", "sizes_hero_width", "sizes_hero_height", "sizes_hero_mime_type", "sizes_hero_filesize", "sizes_hero_filename") SELECT "id", "alt", "is_decorative", "credit", "is_demonstration", "folder", "updated_at", "created_at", "url", "thumbnail_u_r_l", "filename", "mime_type", "filesize", "width", "height", "focal_x", "focal_y", "sizes_thumbnail_url", "sizes_thumbnail_width", "sizes_thumbnail_height", "sizes_thumbnail_mime_type", "sizes_thumbnail_filesize", "sizes_thumbnail_filename", "sizes_card_url", "sizes_card_width", "sizes_card_height", "sizes_card_mime_type", "sizes_card_filesize", "sizes_card_filename", "sizes_gallery_url", "sizes_gallery_width", "sizes_gallery_height", "sizes_gallery_mime_type", "sizes_gallery_filesize", "sizes_gallery_filename", "sizes_hero_url", "sizes_hero_width", "sizes_hero_height", "sizes_hero_mime_type", "sizes_hero_filesize", "sizes_hero_filename" FROM \`media\`;`)
  await db.run(sql`DROP TABLE \`media\`;`)
  await db.run(sql`ALTER TABLE \`__new_media\` RENAME TO \`media\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`media_folder_idx\` ON \`media\` (\`folder\`);`)
  await db.run(sql`CREATE INDEX \`media_updated_at_idx\` ON \`media\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`media_created_at_idx\` ON \`media\` (\`created_at\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`media_filename_idx\` ON \`media\` (\`filename\`);`)
  await db.run(sql`CREATE INDEX \`media_sizes_thumbnail_sizes_thumbnail_filename_idx\` ON \`media\` (\`sizes_thumbnail_filename\`);`)
  await db.run(sql`CREATE INDEX \`media_sizes_card_sizes_card_filename_idx\` ON \`media\` (\`sizes_card_filename\`);`)
  await db.run(sql`CREATE INDEX \`media_sizes_gallery_sizes_gallery_filename_idx\` ON \`media\` (\`sizes_gallery_filename\`);`)
  await db.run(sql`CREATE INDEX \`media_sizes_hero_sizes_hero_filename_idx\` ON \`media\` (\`sizes_hero_filename\`);`)
}
