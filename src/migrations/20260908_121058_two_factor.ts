import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`users_two_factor_recovery_codes\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`hash\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`users_two_factor_recovery_codes_order_idx\` ON \`users_two_factor_recovery_codes\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`users_two_factor_recovery_codes_parent_id_idx\` ON \`users_two_factor_recovery_codes\` (\`_parent_id\`);`)
  await db.run(sql`ALTER TABLE \`users\` ADD \`two_factor_secret\` text;`)
  await db.run(sql`ALTER TABLE \`users\` ADD \`two_factor_confirmed_at\` text;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`users_two_factor_recovery_codes\`;`)
  await db.run(sql`ALTER TABLE \`users\` DROP COLUMN \`two_factor_secret\`;`)
  await db.run(sql`ALTER TABLE \`users\` DROP COLUMN \`two_factor_confirmed_at\`;`)
}
