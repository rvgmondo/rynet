import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`previews\` ADD \`slug\` text;`)
  await db.run(sql`ALTER TABLE \`previews\` ADD \`stage\` text DEFAULT 'draft';`)
  await db.run(sql`ALTER TABLE \`previews\` ADD \`expires_at\` text;`)
  await db.run(sql`CREATE UNIQUE INDEX \`previews_slug_idx\` ON \`previews\` (\`slug\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX \`previews_slug_idx\`;`)
  await db.run(sql`ALTER TABLE \`previews\` DROP COLUMN \`slug\`;`)
  await db.run(sql`ALTER TABLE \`previews\` DROP COLUMN \`stage\`;`)
  await db.run(sql`ALTER TABLE \`previews\` DROP COLUMN \`expires_at\`;`)
}
