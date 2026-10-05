import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`stock_sync_runs\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`finished_at\` text,
  	\`summary\` text,
  	\`ok\` integer,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`stock_sync\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`stock_sync_runs_order_idx\` ON \`stock_sync_runs\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`stock_sync_runs_parent_id_idx\` ON \`stock_sync_runs\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`stock_sync\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`enabled\` integer DEFAULT true,
  	\`running_since\` text,
  	\`last_finished_at\` text,
  	\`initial_import_done_at\` text,
  	\`demonstration_stock_hidden_at\` text,
  	\`updated_at\` text,
  	\`created_at\` text
  );
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`stock_sync_runs\`;`)
  await db.run(sql`DROP TABLE \`stock_sync\`;`)
}
