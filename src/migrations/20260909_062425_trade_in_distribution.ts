import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`leads_disclosures\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`dealer_id\` integer,
  	\`disclosed_at\` text,
  	\`withdrawn_at\` text,
  	FOREIGN KEY (\`dealer_id\`) REFERENCES \`dealers\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`leads\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`leads_disclosures_order_idx\` ON \`leads_disclosures\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`leads_disclosures_parent_id_idx\` ON \`leads_disclosures\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`leads_disclosures_dealer_idx\` ON \`leads_disclosures\` (\`dealer_id\`);`)
  await db.run(sql`CREATE TABLE \`leads_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`dealers_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`leads\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`dealers_id\`) REFERENCES \`dealers\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`leads_rels_order_idx\` ON \`leads_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`leads_rels_parent_idx\` ON \`leads_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`leads_rels_path_idx\` ON \`leads_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`leads_rels_dealers_id_idx\` ON \`leads_rels\` (\`dealers_id\`);`)
  await db.run(sql`ALTER TABLE \`dealers\` ADD \`accepts_trade_ins\` integer DEFAULT false;`)
  await db.run(sql`ALTER TABLE \`dealers_rels\` ADD \`makes_id\` integer REFERENCES makes(id);`)
  await db.run(sql`CREATE INDEX \`dealers_rels_makes_id_idx\` ON \`dealers_rels\` (\`makes_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`leads_disclosures\`;`)
  await db.run(sql`DROP TABLE \`leads_rels\`;`)
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_dealers_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`media_id\` integer,
  	\`franchises_id\` integer,
  	\`accreditations_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`dealers\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`franchises_id\`) REFERENCES \`franchises\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`accreditations_id\`) REFERENCES \`accreditations\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_dealers_rels\`("id", "order", "parent_id", "path", "media_id", "franchises_id", "accreditations_id") SELECT "id", "order", "parent_id", "path", "media_id", "franchises_id", "accreditations_id" FROM \`dealers_rels\`;`)
  await db.run(sql`DROP TABLE \`dealers_rels\`;`)
  await db.run(sql`ALTER TABLE \`__new_dealers_rels\` RENAME TO \`dealers_rels\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`dealers_rels_order_idx\` ON \`dealers_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`dealers_rels_parent_idx\` ON \`dealers_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`dealers_rels_path_idx\` ON \`dealers_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`dealers_rels_media_id_idx\` ON \`dealers_rels\` (\`media_id\`);`)
  await db.run(sql`CREATE INDEX \`dealers_rels_franchises_id_idx\` ON \`dealers_rels\` (\`franchises_id\`);`)
  await db.run(sql`CREATE INDEX \`dealers_rels_accreditations_id_idx\` ON \`dealers_rels\` (\`accreditations_id\`);`)
  await db.run(sql`ALTER TABLE \`dealers\` DROP COLUMN \`accepts_trade_ins\`;`)
}
