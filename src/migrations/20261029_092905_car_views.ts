import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`car_views\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`vehicle_id\` integer NOT NULL,
  	\`dealer_id\` integer,
  	\`day\` text NOT NULL,
  	\`views\` numeric DEFAULT 0 NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`vehicle_id\`) REFERENCES \`vehicles\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`dealer_id\`) REFERENCES \`dealers\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`car_views_vehicle_idx\` ON \`car_views\` (\`vehicle_id\`);`)
  await db.run(sql`CREATE INDEX \`car_views_dealer_idx\` ON \`car_views\` (\`dealer_id\`);`)
  await db.run(sql`CREATE INDEX \`car_views_day_idx\` ON \`car_views\` (\`day\`);`)
  await db.run(sql`CREATE INDEX \`car_views_updated_at_idx\` ON \`car_views\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`car_views_created_at_idx\` ON \`car_views\` (\`created_at\`);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`car_views_id\` integer REFERENCES car_views(id);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_car_views_id_idx\` ON \`payload_locked_documents_rels\` (\`car_views_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`car_views\`;`)
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
  	\`email_templates_id\` integer,
  	\`mailings_id\` integer,
  	\`mail_deliveries_id\` integer,
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
  	FOREIGN KEY (\`social_posts_id\`) REFERENCES \`social_posts\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`email_templates_id\`) REFERENCES \`email_templates\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`mailings_id\`) REFERENCES \`mailings\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`mail_deliveries_id\`) REFERENCES \`mail_deliveries\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_payload_locked_documents_rels\`("id", "order", "parent_id", "path", "vehicles_id", "dealers_id", "leads_id", "previews_id", "branches_id", "media_id", "users_id", "buyers_id", "plans_id", "makes_id", "models_id", "variants_id", "body_types_id", "fuel_types_id", "transmissions_id", "drivetrains_id", "colours_id", "feature_categories_id", "features_id", "provinces_id", "cities_id", "franchises_id", "dealer_groups_id", "accreditations_id", "consent_records_id", "social_accounts_id", "social_posts_id", "email_templates_id", "mailings_id", "mail_deliveries_id") SELECT "id", "order", "parent_id", "path", "vehicles_id", "dealers_id", "leads_id", "previews_id", "branches_id", "media_id", "users_id", "buyers_id", "plans_id", "makes_id", "models_id", "variants_id", "body_types_id", "fuel_types_id", "transmissions_id", "drivetrains_id", "colours_id", "feature_categories_id", "features_id", "provinces_id", "cities_id", "franchises_id", "dealer_groups_id", "accreditations_id", "consent_records_id", "social_accounts_id", "social_posts_id", "email_templates_id", "mailings_id", "mail_deliveries_id" FROM \`payload_locked_documents_rels\`;`)
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
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_email_templates_id_idx\` ON \`payload_locked_documents_rels\` (\`email_templates_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_mailings_id_idx\` ON \`payload_locked_documents_rels\` (\`mailings_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_mail_deliveries_id_idx\` ON \`payload_locked_documents_rels\` (\`mail_deliveries_id\`);`)
}
