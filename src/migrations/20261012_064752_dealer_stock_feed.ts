import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`dealers\` ADD \`stock_feed_website_url\` text;`)
  await db.run(sql`ALTER TABLE \`dealers\` ADD \`stock_feed_read_website\` integer DEFAULT false;`)
  await db.run(sql`ALTER TABLE \`dealers\` ADD \`stock_feed_last_read_at\` text;`)
  await db.run(sql`ALTER TABLE \`dealers\` ADD \`stock_feed_last_summary\` text;`)
  // Amico was read from its website before any other dealership could be. It carries on the same
  // way, now as an ordinary dealership with a feed rather than a special case in the code.
  await db.run(
    sql`UPDATE \`dealers\` SET \`stock_feed_website_url\` = 'https://amicomotors.co.za', \`stock_feed_read_website\` = 1 WHERE \`slug\` = 'amico-motors';`,
  )
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`dealers\` DROP COLUMN \`stock_feed_website_url\`;`)
  await db.run(sql`ALTER TABLE \`dealers\` DROP COLUMN \`stock_feed_read_website\`;`)
  await db.run(sql`ALTER TABLE \`dealers\` DROP COLUMN \`stock_feed_last_read_at\`;`)
  await db.run(sql`ALTER TABLE \`dealers\` DROP COLUMN \`stock_feed_last_summary\`;`)
}
