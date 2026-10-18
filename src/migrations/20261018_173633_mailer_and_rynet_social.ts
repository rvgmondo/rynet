import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`email_templates\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`subject\` text NOT NULL,
  	\`body\` text NOT NULL,
  	\`button_label\` text,
  	\`button_url\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`email_templates_updated_at_idx\` ON \`email_templates\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`email_templates_created_at_idx\` ON \`email_templates\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`mailings\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`subject\` text NOT NULL,
  	\`body\` text NOT NULL,
  	\`button_label\` text,
  	\`button_url\` text,
  	\`audience\` text,
  	\`status\` text DEFAULT 'sending' NOT NULL,
  	\`created_by_id\` integer,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`created_by_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`mailings_created_by_idx\` ON \`mailings\` (\`created_by_id\`);`)
  await db.run(sql`CREATE INDEX \`mailings_updated_at_idx\` ON \`mailings\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`mailings_created_at_idx\` ON \`mailings\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`mail_deliveries\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`mailing_id\` integer NOT NULL,
  	\`dealer_id\` integer,
  	\`to\` text NOT NULL,
  	\`status\` text DEFAULT 'queued' NOT NULL,
  	\`error\` text,
  	\`sent_at\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`mailing_id\`) REFERENCES \`mailings\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`dealer_id\`) REFERENCES \`dealers\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`mail_deliveries_mailing_idx\` ON \`mail_deliveries\` (\`mailing_id\`);`)
  await db.run(sql`CREATE INDEX \`mail_deliveries_dealer_idx\` ON \`mail_deliveries\` (\`dealer_id\`);`)
  await db.run(sql`CREATE INDEX \`mail_deliveries_status_idx\` ON \`mail_deliveries\` (\`status\`);`)
  await db.run(sql`CREATE INDEX \`mail_deliveries_updated_at_idx\` ON \`mail_deliveries\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`mail_deliveries_created_at_idx\` ON \`mail_deliveries\` (\`created_at\`);`)
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_social_accounts\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`dealer_id\` integer,
  	\`network\` text NOT NULL,
  	\`display_name\` text NOT NULL,
  	\`external_id\` text NOT NULL,
  	\`page_id\` text,
  	\`token\` text,
  	\`state\` text DEFAULT 'pending' NOT NULL,
  	\`auto_post\` integer DEFAULT false,
  	\`connected_by_id\` integer,
  	\`connected_at\` text,
  	\`last_posted_at\` text,
  	\`last_error\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`dealer_id\`) REFERENCES \`dealers\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`connected_by_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`INSERT INTO \`__new_social_accounts\`("id", "dealer_id", "network", "display_name", "external_id", "page_id", "token", "state", "auto_post", "connected_by_id", "connected_at", "last_posted_at", "last_error", "updated_at", "created_at") SELECT "id", "dealer_id", "network", "display_name", "external_id", "page_id", "token", "state", "auto_post", "connected_by_id", "connected_at", "last_posted_at", "last_error", "updated_at", "created_at" FROM \`social_accounts\`;`)
  await db.run(sql`DROP TABLE \`social_accounts\`;`)
  await db.run(sql`ALTER TABLE \`__new_social_accounts\` RENAME TO \`social_accounts\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`social_accounts_dealer_idx\` ON \`social_accounts\` (\`dealer_id\`);`)
  await db.run(sql`CREATE INDEX \`social_accounts_external_id_idx\` ON \`social_accounts\` (\`external_id\`);`)
  await db.run(sql`CREATE INDEX \`social_accounts_page_id_idx\` ON \`social_accounts\` (\`page_id\`);`)
  await db.run(sql`CREATE INDEX \`social_accounts_state_idx\` ON \`social_accounts\` (\`state\`);`)
  await db.run(sql`CREATE INDEX \`social_accounts_connected_by_idx\` ON \`social_accounts\` (\`connected_by_id\`);`)
  await db.run(sql`CREATE INDEX \`social_accounts_updated_at_idx\` ON \`social_accounts\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`social_accounts_created_at_idx\` ON \`social_accounts\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`__new_social_posts\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`dealer_id\` integer,
  	\`account_id\` integer,
  	\`network\` text NOT NULL,
  	\`kind\` text DEFAULT 'manual' NOT NULL,
  	\`vehicle_id\` integer,
  	\`caption\` text NOT NULL,
  	\`image_file\` text NOT NULL,
  	\`status\` text DEFAULT 'queued' NOT NULL,
  	\`run_after\` text,
  	\`attempts\` numeric DEFAULT 0,
  	\`started_at\` text,
  	\`posted_at\` text,
  	\`external_post_id\` text,
  	\`permalink\` text,
  	\`error\` text,
  	\`created_by_id\` integer,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`dealer_id\`) REFERENCES \`dealers\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`account_id\`) REFERENCES \`social_accounts\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`vehicle_id\`) REFERENCES \`vehicles\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`created_by_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`INSERT INTO \`__new_social_posts\`("id", "dealer_id", "account_id", "network", "kind", "vehicle_id", "caption", "image_file", "status", "run_after", "attempts", "started_at", "posted_at", "external_post_id", "permalink", "error", "created_by_id", "updated_at", "created_at") SELECT "id", "dealer_id", "account_id", "network", "kind", "vehicle_id", "caption", "image_file", "status", "run_after", "attempts", "started_at", "posted_at", "external_post_id", "permalink", "error", "created_by_id", "updated_at", "created_at" FROM \`social_posts\`;`)
  await db.run(sql`DROP TABLE \`social_posts\`;`)
  await db.run(sql`ALTER TABLE \`__new_social_posts\` RENAME TO \`social_posts\`;`)
  await db.run(sql`CREATE INDEX \`social_posts_dealer_idx\` ON \`social_posts\` (\`dealer_id\`);`)
  await db.run(sql`CREATE INDEX \`social_posts_account_idx\` ON \`social_posts\` (\`account_id\`);`)
  await db.run(sql`CREATE INDEX \`social_posts_vehicle_idx\` ON \`social_posts\` (\`vehicle_id\`);`)
  await db.run(sql`CREATE INDEX \`social_posts_status_idx\` ON \`social_posts\` (\`status\`);`)
  await db.run(sql`CREATE INDEX \`social_posts_run_after_idx\` ON \`social_posts\` (\`run_after\`);`)
  await db.run(sql`CREATE INDEX \`social_posts_created_by_idx\` ON \`social_posts\` (\`created_by_id\`);`)
  await db.run(sql`CREATE INDEX \`social_posts_updated_at_idx\` ON \`social_posts\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`social_posts_created_at_idx\` ON \`social_posts\` (\`created_at\`);`)
  await db.run(sql`ALTER TABLE \`dealers\` ADD \`email_opt_out\` integer DEFAULT false;`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`email_templates_id\` integer REFERENCES email_templates(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`mailings_id\` integer REFERENCES mailings(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`mail_deliveries_id\` integer REFERENCES mail_deliveries(id);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_email_templates_id_idx\` ON \`payload_locked_documents_rels\` (\`email_templates_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_mailings_id_idx\` ON \`payload_locked_documents_rels\` (\`mailings_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_mail_deliveries_id_idx\` ON \`payload_locked_documents_rels\` (\`mail_deliveries_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`email_templates\`;`)
  await db.run(sql`DROP TABLE \`mailings\`;`)
  await db.run(sql`DROP TABLE \`mail_deliveries\`;`)
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_payload_locked_documents_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`vehicles_id\` integer,
  	\`dealers_id\` integer,
  	\`leads_id\` integer,
  	\`previews_id\` integer,
  	\`branches_id\` integer,
  	\`media_id\` integer,
  	\`users_id\` integer,
  	\`buyers_id\` integer,
  	\`plans_id\` integer,
  	\`makes_id\` integer,
  	\`models_id\` integer,
  	\`variants_id\` integer,
  	\`body_types_id\` integer,
  	\`fuel_types_id\` integer,
  	\`transmissions_id\` integer,
  	\`drivetrains_id\` integer,
  	\`colours_id\` integer,
  	\`feature_categories_id\` integer,
  	\`features_id\` integer,
  	\`provinces_id\` integer,
  	\`cities_id\` integer,
  	\`franchises_id\` integer,
  	\`dealer_groups_id\` integer,
  	\`accreditations_id\` integer,
  	\`consent_records_id\` integer,
  	\`social_accounts_id\` integer,
  	\`social_posts_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_locked_documents\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`vehicles_id\`) REFERENCES \`vehicles\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`dealers_id\`) REFERENCES \`dealers\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`leads_id\`) REFERENCES \`leads\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`previews_id\`) REFERENCES \`previews\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`branches_id\`) REFERENCES \`branches\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`buyers_id\`) REFERENCES \`buyers\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`plans_id\`) REFERENCES \`plans\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`makes_id\`) REFERENCES \`makes\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`models_id\`) REFERENCES \`models\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`variants_id\`) REFERENCES \`variants\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`body_types_id\`) REFERENCES \`body_types\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`fuel_types_id\`) REFERENCES \`fuel_types\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`transmissions_id\`) REFERENCES \`transmissions\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`drivetrains_id\`) REFERENCES \`drivetrains\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`colours_id\`) REFERENCES \`colours\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`feature_categories_id\`) REFERENCES \`feature_categories\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`features_id\`) REFERENCES \`features\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`provinces_id\`) REFERENCES \`provinces\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`cities_id\`) REFERENCES \`cities\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`franchises_id\`) REFERENCES \`franchises\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`dealer_groups_id\`) REFERENCES \`dealer_groups\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`accreditations_id\`) REFERENCES \`accreditations\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`consent_records_id\`) REFERENCES \`consent_records\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`social_accounts_id\`) REFERENCES \`social_accounts\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`social_posts_id\`) REFERENCES \`social_posts\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_payload_locked_documents_rels\`("id", "order", "parent_id", "path", "vehicles_id", "dealers_id", "leads_id", "previews_id", "branches_id", "media_id", "users_id", "buyers_id", "plans_id", "makes_id", "models_id", "variants_id", "body_types_id", "fuel_types_id", "transmissions_id", "drivetrains_id", "colours_id", "feature_categories_id", "features_id", "provinces_id", "cities_id", "franchises_id", "dealer_groups_id", "accreditations_id", "consent_records_id", "social_accounts_id", "social_posts_id") SELECT "id", "order", "parent_id", "path", "vehicles_id", "dealers_id", "leads_id", "previews_id", "branches_id", "media_id", "users_id", "buyers_id", "plans_id", "makes_id", "models_id", "variants_id", "body_types_id", "fuel_types_id", "transmissions_id", "drivetrains_id", "colours_id", "feature_categories_id", "features_id", "provinces_id", "cities_id", "franchises_id", "dealer_groups_id", "accreditations_id", "consent_records_id", "social_accounts_id", "social_posts_id" FROM \`payload_locked_documents_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents_rels\`;`)
  await db.run(sql`ALTER TABLE \`__new_payload_locked_documents_rels\` RENAME TO \`payload_locked_documents_rels\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_order_idx\` ON \`payload_locked_documents_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_parent_idx\` ON \`payload_locked_documents_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_path_idx\` ON \`payload_locked_documents_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_vehicles_id_idx\` ON \`payload_locked_documents_rels\` (\`vehicles_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_dealers_id_idx\` ON \`payload_locked_documents_rels\` (\`dealers_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_leads_id_idx\` ON \`payload_locked_documents_rels\` (\`leads_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_previews_id_idx\` ON \`payload_locked_documents_rels\` (\`previews_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_branches_id_idx\` ON \`payload_locked_documents_rels\` (\`branches_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_media_id_idx\` ON \`payload_locked_documents_rels\` (\`media_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_users_id_idx\` ON \`payload_locked_documents_rels\` (\`users_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_buyers_id_idx\` ON \`payload_locked_documents_rels\` (\`buyers_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_plans_id_idx\` ON \`payload_locked_documents_rels\` (\`plans_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_makes_id_idx\` ON \`payload_locked_documents_rels\` (\`makes_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_models_id_idx\` ON \`payload_locked_documents_rels\` (\`models_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_variants_id_idx\` ON \`payload_locked_documents_rels\` (\`variants_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_body_types_id_idx\` ON \`payload_locked_documents_rels\` (\`body_types_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_fuel_types_id_idx\` ON \`payload_locked_documents_rels\` (\`fuel_types_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_transmissions_id_idx\` ON \`payload_locked_documents_rels\` (\`transmissions_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_drivetrains_id_idx\` ON \`payload_locked_documents_rels\` (\`drivetrains_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_colours_id_idx\` ON \`payload_locked_documents_rels\` (\`colours_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_feature_categories_id_idx\` ON \`payload_locked_documents_rels\` (\`feature_categories_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_features_id_idx\` ON \`payload_locked_documents_rels\` (\`features_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_provinces_id_idx\` ON \`payload_locked_documents_rels\` (\`provinces_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_cities_id_idx\` ON \`payload_locked_documents_rels\` (\`cities_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_franchises_id_idx\` ON \`payload_locked_documents_rels\` (\`franchises_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_dealer_groups_id_idx\` ON \`payload_locked_documents_rels\` (\`dealer_groups_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_accreditations_id_idx\` ON \`payload_locked_documents_rels\` (\`accreditations_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_consent_records_id_idx\` ON \`payload_locked_documents_rels\` (\`consent_records_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_social_accounts_id_idx\` ON \`payload_locked_documents_rels\` (\`social_accounts_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_social_posts_id_idx\` ON \`payload_locked_documents_rels\` (\`social_posts_id\`);`)
  await db.run(sql`CREATE TABLE \`__new_social_accounts\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`dealer_id\` integer NOT NULL,
  	\`network\` text NOT NULL,
  	\`display_name\` text NOT NULL,
  	\`external_id\` text NOT NULL,
  	\`page_id\` text,
  	\`token\` text,
  	\`state\` text DEFAULT 'pending' NOT NULL,
  	\`auto_post\` integer DEFAULT false,
  	\`connected_by_id\` integer,
  	\`connected_at\` text,
  	\`last_posted_at\` text,
  	\`last_error\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`dealer_id\`) REFERENCES \`dealers\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`connected_by_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`INSERT INTO \`__new_social_accounts\`("id", "dealer_id", "network", "display_name", "external_id", "page_id", "token", "state", "auto_post", "connected_by_id", "connected_at", "last_posted_at", "last_error", "updated_at", "created_at") SELECT "id", "dealer_id", "network", "display_name", "external_id", "page_id", "token", "state", "auto_post", "connected_by_id", "connected_at", "last_posted_at", "last_error", "updated_at", "created_at" FROM \`social_accounts\`;`)
  await db.run(sql`DROP TABLE \`social_accounts\`;`)
  await db.run(sql`ALTER TABLE \`__new_social_accounts\` RENAME TO \`social_accounts\`;`)
  await db.run(sql`CREATE INDEX \`social_accounts_dealer_idx\` ON \`social_accounts\` (\`dealer_id\`);`)
  await db.run(sql`CREATE INDEX \`social_accounts_external_id_idx\` ON \`social_accounts\` (\`external_id\`);`)
  await db.run(sql`CREATE INDEX \`social_accounts_page_id_idx\` ON \`social_accounts\` (\`page_id\`);`)
  await db.run(sql`CREATE INDEX \`social_accounts_state_idx\` ON \`social_accounts\` (\`state\`);`)
  await db.run(sql`CREATE INDEX \`social_accounts_connected_by_idx\` ON \`social_accounts\` (\`connected_by_id\`);`)
  await db.run(sql`CREATE INDEX \`social_accounts_updated_at_idx\` ON \`social_accounts\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`social_accounts_created_at_idx\` ON \`social_accounts\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`__new_social_posts\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`dealer_id\` integer NOT NULL,
  	\`account_id\` integer,
  	\`network\` text NOT NULL,
  	\`kind\` text DEFAULT 'manual' NOT NULL,
  	\`vehicle_id\` integer,
  	\`caption\` text NOT NULL,
  	\`image_file\` text NOT NULL,
  	\`status\` text DEFAULT 'queued' NOT NULL,
  	\`run_after\` text,
  	\`attempts\` numeric DEFAULT 0,
  	\`started_at\` text,
  	\`posted_at\` text,
  	\`external_post_id\` text,
  	\`permalink\` text,
  	\`error\` text,
  	\`created_by_id\` integer,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`dealer_id\`) REFERENCES \`dealers\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`account_id\`) REFERENCES \`social_accounts\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`vehicle_id\`) REFERENCES \`vehicles\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`created_by_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`INSERT INTO \`__new_social_posts\`("id", "dealer_id", "account_id", "network", "kind", "vehicle_id", "caption", "image_file", "status", "run_after", "attempts", "started_at", "posted_at", "external_post_id", "permalink", "error", "created_by_id", "updated_at", "created_at") SELECT "id", "dealer_id", "account_id", "network", "kind", "vehicle_id", "caption", "image_file", "status", "run_after", "attempts", "started_at", "posted_at", "external_post_id", "permalink", "error", "created_by_id", "updated_at", "created_at" FROM \`social_posts\`;`)
  await db.run(sql`DROP TABLE \`social_posts\`;`)
  await db.run(sql`ALTER TABLE \`__new_social_posts\` RENAME TO \`social_posts\`;`)
  await db.run(sql`CREATE INDEX \`social_posts_dealer_idx\` ON \`social_posts\` (\`dealer_id\`);`)
  await db.run(sql`CREATE INDEX \`social_posts_account_idx\` ON \`social_posts\` (\`account_id\`);`)
  await db.run(sql`CREATE INDEX \`social_posts_vehicle_idx\` ON \`social_posts\` (\`vehicle_id\`);`)
  await db.run(sql`CREATE INDEX \`social_posts_status_idx\` ON \`social_posts\` (\`status\`);`)
  await db.run(sql`CREATE INDEX \`social_posts_run_after_idx\` ON \`social_posts\` (\`run_after\`);`)
  await db.run(sql`CREATE INDEX \`social_posts_created_by_idx\` ON \`social_posts\` (\`created_by_id\`);`)
  await db.run(sql`CREATE INDEX \`social_posts_updated_at_idx\` ON \`social_posts\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`social_posts_created_at_idx\` ON \`social_posts\` (\`created_at\`);`)
  await db.run(sql`ALTER TABLE \`dealers\` DROP COLUMN \`email_opt_out\`;`)
}
