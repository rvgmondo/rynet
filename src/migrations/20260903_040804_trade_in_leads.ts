import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`leads\` ADD \`trade_in_make\` text;`)
  await db.run(sql`ALTER TABLE \`leads\` ADD \`trade_in_model\` text;`)
  await db.run(sql`ALTER TABLE \`leads\` ADD \`trade_in_model_year\` numeric;`)
  await db.run(sql`ALTER TABLE \`leads\` ADD \`trade_in_mileage_km\` numeric;`)
  await db.run(sql`ALTER TABLE \`leads\` ADD \`trade_in_transmission\` text;`)
  await db.run(sql`ALTER TABLE \`leads\` ADD \`trade_in_condition\` text;`)
  await db.run(sql`ALTER TABLE \`leads\` ADD \`trade_in_service_history\` text;`)
  await db.run(sql`ALTER TABLE \`leads\` ADD \`trade_in_finance\` text;`)
  await db.run(sql`ALTER TABLE \`leads\` ADD \`trade_in_province_id\` integer REFERENCES provinces(id);`)
  await db.run(sql`ALTER TABLE \`leads\` ADD \`trade_in_city\` text;`)
  await db.run(sql`ALTER TABLE \`leads\` ADD \`trade_in_notes\` text;`)
  await db.run(sql`CREATE INDEX \`leads_trade_in_trade_in_province_idx\` ON \`leads\` (\`trade_in_province_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_leads\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`type\` text NOT NULL,
  	\`vehicle_id\` integer,
  	\`dealer_id\` integer,
  	\`branch_id\` integer,
  	\`name\` text NOT NULL,
  	\`email\` text,
  	\`phone\` text,
  	\`message\` text,
  	\`status\` text DEFAULT 'new' NOT NULL,
  	\`lost_reason\` text,
  	\`assigned_to_id\` integer,
  	\`first_response_at\` text,
  	\`source_utm_source\` text,
  	\`source_utm_medium\` text,
  	\`source_utm_campaign\` text,
  	\`source_referrer\` text,
  	\`source_landing_page\` text,
  	\`source_device_type\` text,
  	\`consent_id\` integer,
  	\`is_demonstration\` integer DEFAULT false,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`vehicle_id\`) REFERENCES \`vehicles\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`dealer_id\`) REFERENCES \`dealers\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`branch_id\`) REFERENCES \`branches\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`assigned_to_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`consent_id\`) REFERENCES \`consent_records\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`INSERT INTO \`__new_leads\`("id", "type", "vehicle_id", "dealer_id", "branch_id", "name", "email", "phone", "message", "status", "lost_reason", "assigned_to_id", "first_response_at", "source_utm_source", "source_utm_medium", "source_utm_campaign", "source_referrer", "source_landing_page", "source_device_type", "consent_id", "is_demonstration", "updated_at", "created_at") SELECT "id", "type", "vehicle_id", "dealer_id", "branch_id", "name", "email", "phone", "message", "status", "lost_reason", "assigned_to_id", "first_response_at", "source_utm_source", "source_utm_medium", "source_utm_campaign", "source_referrer", "source_landing_page", "source_device_type", "consent_id", "is_demonstration", "updated_at", "created_at" FROM \`leads\`;`)
  await db.run(sql`DROP TABLE \`leads\`;`)
  await db.run(sql`ALTER TABLE \`__new_leads\` RENAME TO \`leads\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`leads_type_idx\` ON \`leads\` (\`type\`);`)
  await db.run(sql`CREATE INDEX \`leads_vehicle_idx\` ON \`leads\` (\`vehicle_id\`);`)
  await db.run(sql`CREATE INDEX \`leads_dealer_idx\` ON \`leads\` (\`dealer_id\`);`)
  await db.run(sql`CREATE INDEX \`leads_branch_idx\` ON \`leads\` (\`branch_id\`);`)
  await db.run(sql`CREATE INDEX \`leads_status_idx\` ON \`leads\` (\`status\`);`)
  await db.run(sql`CREATE INDEX \`leads_assigned_to_idx\` ON \`leads\` (\`assigned_to_id\`);`)
  await db.run(sql`CREATE INDEX \`leads_consent_idx\` ON \`leads\` (\`consent_id\`);`)
  await db.run(sql`CREATE INDEX \`leads_updated_at_idx\` ON \`leads\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`leads_created_at_idx\` ON \`leads\` (\`created_at\`);`)
}
