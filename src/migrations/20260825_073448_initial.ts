import { type MigrateDownArgs, type MigrateUpArgs, sql } from "@payloadcms/db-sqlite";

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`vehicles_price_history\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`price\` numeric,
  	\`changed_at\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`vehicles\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(
    sql`CREATE INDEX \`vehicles_price_history_order_idx\` ON \`vehicles_price_history\` (\`_order\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`vehicles_price_history_parent_id_idx\` ON \`vehicles_price_history\` (\`_parent_id\`);`,
  );
  await db.run(sql`CREATE TABLE \`vehicles_gallery\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`image_id\` integer,
  	\`alt\` text,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`vehicles\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(
    sql`CREATE INDEX \`vehicles_gallery_order_idx\` ON \`vehicles_gallery\` (\`_order\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`vehicles_gallery_parent_id_idx\` ON \`vehicles_gallery\` (\`_parent_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`vehicles_gallery_image_idx\` ON \`vehicles_gallery\` (\`image_id\`);`,
  );
  await db.run(sql`CREATE TABLE \`vehicles\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text,
  	\`public_ref\` text,
  	\`dealer_id\` integer,
  	\`branch_id\` integer,
  	\`status\` text DEFAULT 'draft',
  	\`condition\` text DEFAULT 'pre_owned',
  	\`make_id\` integer,
  	\`model_id\` integer,
  	\`variant_id\` integer,
  	\`derivative\` text,
  	\`model_year\` numeric,
  	\`registration_year\` numeric,
  	\`mileage_km\` numeric,
  	\`body_type_id\` integer,
  	\`fuel_type_id\` integer,
  	\`transmission_id\` integer,
  	\`drivetrain_id\` integer,
  	\`engine_capacity_cc\` numeric,
  	\`cylinders\` numeric,
  	\`power_kw\` numeric,
  	\`torque_nm\` numeric,
  	\`exterior_colour_id\` integer,
  	\`interior_colour_id\` integer,
  	\`doors\` numeric,
  	\`seats\` numeric,
  	\`description\` text,
  	\`price\` numeric,
  	\`price_type\` text DEFAULT 'retail',
  	\`vat_status\` text DEFAULT 'vat_inclusive',
  	\`previous_price\` numeric,
  	\`monthly_estimate\` numeric,
  	\`vin\` text,
  	\`stock_number\` text,
  	\`service_history\` text,
  	\`warranty_remaining_months\` numeric,
  	\`warranty_remaining_km\` numeric,
  	\`warranty_remaining_provider\` text,
  	\`roadworthy\` text,
  	\`licence_expiry\` text,
  	\`video_url\` text,
  	\`video_provider\` text,
  	\`published_at\` text,
  	\`sold_at\` text,
  	\`view_count\` numeric DEFAULT 0,
  	\`lead_count\` numeric DEFAULT 0,
  	\`is_demonstration\` integer DEFAULT false,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`_status\` text DEFAULT 'draft',
  	FOREIGN KEY (\`dealer_id\`) REFERENCES \`dealers\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`branch_id\`) REFERENCES \`branches\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`make_id\`) REFERENCES \`makes\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`model_id\`) REFERENCES \`models\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`variant_id\`) REFERENCES \`variants\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`body_type_id\`) REFERENCES \`body_types\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`fuel_type_id\`) REFERENCES \`fuel_types\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`transmission_id\`) REFERENCES \`transmissions\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`drivetrain_id\`) REFERENCES \`drivetrains\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`exterior_colour_id\`) REFERENCES \`colours\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`interior_colour_id\`) REFERENCES \`colours\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `);
  await db.run(
    sql`CREATE UNIQUE INDEX \`vehicles_public_ref_idx\` ON \`vehicles\` (\`public_ref\`);`,
  );
  await db.run(sql`CREATE INDEX \`vehicles_dealer_idx\` ON \`vehicles\` (\`dealer_id\`);`);
  await db.run(sql`CREATE INDEX \`vehicles_branch_idx\` ON \`vehicles\` (\`branch_id\`);`);
  await db.run(sql`CREATE INDEX \`vehicles_status_idx\` ON \`vehicles\` (\`status\`);`);
  await db.run(sql`CREATE INDEX \`vehicles_condition_idx\` ON \`vehicles\` (\`condition\`);`);
  await db.run(sql`CREATE INDEX \`vehicles_make_idx\` ON \`vehicles\` (\`make_id\`);`);
  await db.run(sql`CREATE INDEX \`vehicles_model_idx\` ON \`vehicles\` (\`model_id\`);`);
  await db.run(sql`CREATE INDEX \`vehicles_variant_idx\` ON \`vehicles\` (\`variant_id\`);`);
  await db.run(sql`CREATE INDEX \`vehicles_model_year_idx\` ON \`vehicles\` (\`model_year\`);`);
  await db.run(sql`CREATE INDEX \`vehicles_mileage_km_idx\` ON \`vehicles\` (\`mileage_km\`);`);
  await db.run(sql`CREATE INDEX \`vehicles_body_type_idx\` ON \`vehicles\` (\`body_type_id\`);`);
  await db.run(sql`CREATE INDEX \`vehicles_fuel_type_idx\` ON \`vehicles\` (\`fuel_type_id\`);`);
  await db.run(
    sql`CREATE INDEX \`vehicles_transmission_idx\` ON \`vehicles\` (\`transmission_id\`);`,
  );
  await db.run(sql`CREATE INDEX \`vehicles_drivetrain_idx\` ON \`vehicles\` (\`drivetrain_id\`);`);
  await db.run(
    sql`CREATE INDEX \`vehicles_exterior_colour_idx\` ON \`vehicles\` (\`exterior_colour_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`vehicles_interior_colour_idx\` ON \`vehicles\` (\`interior_colour_id\`);`,
  );
  await db.run(sql`CREATE INDEX \`vehicles_price_idx\` ON \`vehicles\` (\`price\`);`);
  await db.run(sql`CREATE INDEX \`vehicles_stock_number_idx\` ON \`vehicles\` (\`stock_number\`);`);
  await db.run(sql`CREATE INDEX \`vehicles_published_at_idx\` ON \`vehicles\` (\`published_at\`);`);
  await db.run(sql`CREATE INDEX \`vehicles_sold_at_idx\` ON \`vehicles\` (\`sold_at\`);`);
  await db.run(sql`CREATE INDEX \`vehicles_updated_at_idx\` ON \`vehicles\` (\`updated_at\`);`);
  await db.run(sql`CREATE INDEX \`vehicles_created_at_idx\` ON \`vehicles\` (\`created_at\`);`);
  await db.run(sql`CREATE INDEX \`vehicles__status_idx\` ON \`vehicles\` (\`_status\`);`);
  await db.run(sql`CREATE TABLE \`vehicles_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`features_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`vehicles\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`features_id\`) REFERENCES \`features\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(sql`CREATE INDEX \`vehicles_rels_order_idx\` ON \`vehicles_rels\` (\`order\`);`);
  await db.run(
    sql`CREATE INDEX \`vehicles_rels_parent_idx\` ON \`vehicles_rels\` (\`parent_id\`);`,
  );
  await db.run(sql`CREATE INDEX \`vehicles_rels_path_idx\` ON \`vehicles_rels\` (\`path\`);`);
  await db.run(
    sql`CREATE INDEX \`vehicles_rels_features_id_idx\` ON \`vehicles_rels\` (\`features_id\`);`,
  );
  await db.run(sql`CREATE TABLE \`_vehicles_v_version_price_history\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`price\` numeric,
  	\`changed_at\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_vehicles_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(
    sql`CREATE INDEX \`_vehicles_v_version_price_history_order_idx\` ON \`_vehicles_v_version_price_history\` (\`_order\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_vehicles_v_version_price_history_parent_id_idx\` ON \`_vehicles_v_version_price_history\` (\`_parent_id\`);`,
  );
  await db.run(sql`CREATE TABLE \`_vehicles_v_version_gallery\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`image_id\` integer,
  	\`alt\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_vehicles_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(
    sql`CREATE INDEX \`_vehicles_v_version_gallery_order_idx\` ON \`_vehicles_v_version_gallery\` (\`_order\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_vehicles_v_version_gallery_parent_id_idx\` ON \`_vehicles_v_version_gallery\` (\`_parent_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_vehicles_v_version_gallery_image_idx\` ON \`_vehicles_v_version_gallery\` (\`image_id\`);`,
  );
  await db.run(sql`CREATE TABLE \`_vehicles_v\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`parent_id\` integer,
  	\`version_title\` text,
  	\`version_public_ref\` text,
  	\`version_dealer_id\` integer,
  	\`version_branch_id\` integer,
  	\`version_status\` text DEFAULT 'draft',
  	\`version_condition\` text DEFAULT 'pre_owned',
  	\`version_make_id\` integer,
  	\`version_model_id\` integer,
  	\`version_variant_id\` integer,
  	\`version_derivative\` text,
  	\`version_model_year\` numeric,
  	\`version_registration_year\` numeric,
  	\`version_mileage_km\` numeric,
  	\`version_body_type_id\` integer,
  	\`version_fuel_type_id\` integer,
  	\`version_transmission_id\` integer,
  	\`version_drivetrain_id\` integer,
  	\`version_engine_capacity_cc\` numeric,
  	\`version_cylinders\` numeric,
  	\`version_power_kw\` numeric,
  	\`version_torque_nm\` numeric,
  	\`version_exterior_colour_id\` integer,
  	\`version_interior_colour_id\` integer,
  	\`version_doors\` numeric,
  	\`version_seats\` numeric,
  	\`version_description\` text,
  	\`version_price\` numeric,
  	\`version_price_type\` text DEFAULT 'retail',
  	\`version_vat_status\` text DEFAULT 'vat_inclusive',
  	\`version_previous_price\` numeric,
  	\`version_monthly_estimate\` numeric,
  	\`version_vin\` text,
  	\`version_stock_number\` text,
  	\`version_service_history\` text,
  	\`version_warranty_remaining_months\` numeric,
  	\`version_warranty_remaining_km\` numeric,
  	\`version_warranty_remaining_provider\` text,
  	\`version_roadworthy\` text,
  	\`version_licence_expiry\` text,
  	\`version_video_url\` text,
  	\`version_video_provider\` text,
  	\`version_published_at\` text,
  	\`version_sold_at\` text,
  	\`version_view_count\` numeric DEFAULT 0,
  	\`version_lead_count\` numeric DEFAULT 0,
  	\`version_is_demonstration\` integer DEFAULT false,
  	\`version_updated_at\` text,
  	\`version_created_at\` text,
  	\`version__status\` text DEFAULT 'draft',
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`latest\` integer,
  	\`autosave\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`vehicles\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_dealer_id\`) REFERENCES \`dealers\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_branch_id\`) REFERENCES \`branches\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_make_id\`) REFERENCES \`makes\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_model_id\`) REFERENCES \`models\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_variant_id\`) REFERENCES \`variants\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_body_type_id\`) REFERENCES \`body_types\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_fuel_type_id\`) REFERENCES \`fuel_types\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_transmission_id\`) REFERENCES \`transmissions\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_drivetrain_id\`) REFERENCES \`drivetrains\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_exterior_colour_id\`) REFERENCES \`colours\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_interior_colour_id\`) REFERENCES \`colours\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `);
  await db.run(sql`CREATE INDEX \`_vehicles_v_parent_idx\` ON \`_vehicles_v\` (\`parent_id\`);`);
  await db.run(
    sql`CREATE INDEX \`_vehicles_v_version_version_public_ref_idx\` ON \`_vehicles_v\` (\`version_public_ref\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_vehicles_v_version_version_dealer_idx\` ON \`_vehicles_v\` (\`version_dealer_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_vehicles_v_version_version_branch_idx\` ON \`_vehicles_v\` (\`version_branch_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_vehicles_v_version_version_status_idx\` ON \`_vehicles_v\` (\`version_status\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_vehicles_v_version_version_condition_idx\` ON \`_vehicles_v\` (\`version_condition\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_vehicles_v_version_version_make_idx\` ON \`_vehicles_v\` (\`version_make_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_vehicles_v_version_version_model_idx\` ON \`_vehicles_v\` (\`version_model_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_vehicles_v_version_version_variant_idx\` ON \`_vehicles_v\` (\`version_variant_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_vehicles_v_version_version_model_year_idx\` ON \`_vehicles_v\` (\`version_model_year\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_vehicles_v_version_version_mileage_km_idx\` ON \`_vehicles_v\` (\`version_mileage_km\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_vehicles_v_version_version_body_type_idx\` ON \`_vehicles_v\` (\`version_body_type_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_vehicles_v_version_version_fuel_type_idx\` ON \`_vehicles_v\` (\`version_fuel_type_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_vehicles_v_version_version_transmission_idx\` ON \`_vehicles_v\` (\`version_transmission_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_vehicles_v_version_version_drivetrain_idx\` ON \`_vehicles_v\` (\`version_drivetrain_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_vehicles_v_version_version_exterior_colour_idx\` ON \`_vehicles_v\` (\`version_exterior_colour_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_vehicles_v_version_version_interior_colour_idx\` ON \`_vehicles_v\` (\`version_interior_colour_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_vehicles_v_version_version_price_idx\` ON \`_vehicles_v\` (\`version_price\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_vehicles_v_version_version_stock_number_idx\` ON \`_vehicles_v\` (\`version_stock_number\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_vehicles_v_version_version_published_at_idx\` ON \`_vehicles_v\` (\`version_published_at\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_vehicles_v_version_version_sold_at_idx\` ON \`_vehicles_v\` (\`version_sold_at\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_vehicles_v_version_version_updated_at_idx\` ON \`_vehicles_v\` (\`version_updated_at\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_vehicles_v_version_version_created_at_idx\` ON \`_vehicles_v\` (\`version_created_at\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_vehicles_v_version_version__status_idx\` ON \`_vehicles_v\` (\`version__status\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_vehicles_v_created_at_idx\` ON \`_vehicles_v\` (\`created_at\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_vehicles_v_updated_at_idx\` ON \`_vehicles_v\` (\`updated_at\`);`,
  );
  await db.run(sql`CREATE INDEX \`_vehicles_v_latest_idx\` ON \`_vehicles_v\` (\`latest\`);`);
  await db.run(sql`CREATE INDEX \`_vehicles_v_autosave_idx\` ON \`_vehicles_v\` (\`autosave\`);`);
  await db.run(sql`CREATE TABLE \`_vehicles_v_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`features_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`_vehicles_v\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`features_id\`) REFERENCES \`features\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(
    sql`CREATE INDEX \`_vehicles_v_rels_order_idx\` ON \`_vehicles_v_rels\` (\`order\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_vehicles_v_rels_parent_idx\` ON \`_vehicles_v_rels\` (\`parent_id\`);`,
  );
  await db.run(sql`CREATE INDEX \`_vehicles_v_rels_path_idx\` ON \`_vehicles_v_rels\` (\`path\`);`);
  await db.run(
    sql`CREATE INDEX \`_vehicles_v_rels_features_id_idx\` ON \`_vehicles_v_rels\` (\`features_id\`);`,
  );
  await db.run(sql`CREATE TABLE \`dealers_email_routing\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`lead_type\` text NOT NULL,
  	\`to_address\` text NOT NULL,
  	\`branch_id\` integer,
  	FOREIGN KEY (\`branch_id\`) REFERENCES \`branches\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`dealers\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(
    sql`CREATE INDEX \`dealers_email_routing_order_idx\` ON \`dealers_email_routing\` (\`_order\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`dealers_email_routing_parent_id_idx\` ON \`dealers_email_routing\` (\`_parent_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`dealers_email_routing_branch_idx\` ON \`dealers_email_routing\` (\`branch_id\`);`,
  );
  await db.run(sql`CREATE TABLE \`dealers_social_profiles\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`platform\` text,
  	\`url\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`dealers\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(
    sql`CREATE INDEX \`dealers_social_profiles_order_idx\` ON \`dealers_social_profiles\` (\`_order\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`dealers_social_profiles_parent_id_idx\` ON \`dealers_social_profiles\` (\`_parent_id\`);`,
  );
  await db.run(sql`CREATE TABLE \`dealers\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`trading_name\` text NOT NULL,
  	\`legal_name\` text NOT NULL,
  	\`slug\` text NOT NULL,
  	\`logo_id\` integer,
  	\`about_rich_text\` text,
  	\`founded_year\` numeric,
  	\`group_id\` integer,
  	\`verification_status\` text DEFAULT 'pending' NOT NULL,
  	\`registration_number\` text,
  	\`vat_number\` text,
  	\`motor_trade_number\` text,
  	\`verification_notes\` text,
  	\`principal_name\` text,
  	\`principal_email\` text,
  	\`principal_phone\` text,
  	\`whatsapp_number\` text,
  	\`theme_accent\` text,
  	\`theme_hero_layout\` text DEFAULT 'standard',
  	\`plan_id\` integer,
  	\`listing_limit\` numeric DEFAULT 25,
  	\`listing_count\` numeric DEFAULT 0,
  	\`review_score\` numeric,
  	\`review_count\` numeric DEFAULT 0,
  	\`is_demonstration\` integer DEFAULT false,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`logo_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`group_id\`) REFERENCES \`dealer_groups\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`plan_id\`) REFERENCES \`plans\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `);
  await db.run(sql`CREATE INDEX \`dealers_trading_name_idx\` ON \`dealers\` (\`trading_name\`);`);
  await db.run(sql`CREATE UNIQUE INDEX \`dealers_slug_idx\` ON \`dealers\` (\`slug\`);`);
  await db.run(sql`CREATE INDEX \`dealers_logo_idx\` ON \`dealers\` (\`logo_id\`);`);
  await db.run(sql`CREATE INDEX \`dealers_group_idx\` ON \`dealers\` (\`group_id\`);`);
  await db.run(
    sql`CREATE INDEX \`dealers_verification_status_idx\` ON \`dealers\` (\`verification_status\`);`,
  );
  await db.run(sql`CREATE INDEX \`dealers_plan_idx\` ON \`dealers\` (\`plan_id\`);`);
  await db.run(sql`CREATE INDEX \`dealers_updated_at_idx\` ON \`dealers\` (\`updated_at\`);`);
  await db.run(sql`CREATE INDEX \`dealers_created_at_idx\` ON \`dealers\` (\`created_at\`);`);
  await db.run(sql`CREATE TABLE \`dealers_rels\` (
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
  `);
  await db.run(sql`CREATE INDEX \`dealers_rels_order_idx\` ON \`dealers_rels\` (\`order\`);`);
  await db.run(sql`CREATE INDEX \`dealers_rels_parent_idx\` ON \`dealers_rels\` (\`parent_id\`);`);
  await db.run(sql`CREATE INDEX \`dealers_rels_path_idx\` ON \`dealers_rels\` (\`path\`);`);
  await db.run(sql`CREATE INDEX \`dealers_rels_media_id_idx\` ON \`dealers_rels\` (\`media_id\`);`);
  await db.run(
    sql`CREATE INDEX \`dealers_rels_franchises_id_idx\` ON \`dealers_rels\` (\`franchises_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`dealers_rels_accreditations_id_idx\` ON \`dealers_rels\` (\`accreditations_id\`);`,
  );
  await db.run(sql`CREATE TABLE \`branches_trading_hours\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`day\` text NOT NULL,
  	\`closed\` integer DEFAULT false,
  	\`opens_at\` text,
  	\`closes_at\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`branches\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(
    sql`CREATE INDEX \`branches_trading_hours_order_idx\` ON \`branches_trading_hours\` (\`_order\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`branches_trading_hours_parent_id_idx\` ON \`branches_trading_hours\` (\`_parent_id\`);`,
  );
  await db.run(sql`CREATE TABLE \`branches_holiday_overrides\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`date\` text NOT NULL,
  	\`label\` text,
  	\`closed\` integer DEFAULT true,
  	\`opens_at\` text,
  	\`closes_at\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`branches\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(
    sql`CREATE INDEX \`branches_holiday_overrides_order_idx\` ON \`branches_holiday_overrides\` (\`_order\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`branches_holiday_overrides_parent_id_idx\` ON \`branches_holiday_overrides\` (\`_parent_id\`);`,
  );
  await db.run(sql`CREATE TABLE \`branches\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`slug\` text NOT NULL,
  	\`dealer_id\` integer NOT NULL,
  	\`is_primary\` integer DEFAULT false,
  	\`address_line1\` text NOT NULL,
  	\`address_line2\` text,
  	\`suburb\` text,
  	\`city_id\` integer NOT NULL,
  	\`province_id\` integer NOT NULL,
  	\`postal_code\` text,
  	\`latitude\` numeric,
  	\`longitude\` numeric,
  	\`directions_note\` text,
  	\`phone\` text,
  	\`whatsapp\` text,
  	\`email\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`dealer_id\`) REFERENCES \`dealers\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`city_id\`) REFERENCES \`cities\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`province_id\`) REFERENCES \`provinces\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `);
  await db.run(sql`CREATE INDEX \`branches_slug_idx\` ON \`branches\` (\`slug\`);`);
  await db.run(sql`CREATE INDEX \`branches_dealer_idx\` ON \`branches\` (\`dealer_id\`);`);
  await db.run(sql`CREATE INDEX \`branches_city_idx\` ON \`branches\` (\`city_id\`);`);
  await db.run(sql`CREATE INDEX \`branches_province_idx\` ON \`branches\` (\`province_id\`);`);
  await db.run(sql`CREATE INDEX \`branches_updated_at_idx\` ON \`branches\` (\`updated_at\`);`);
  await db.run(sql`CREATE INDEX \`branches_created_at_idx\` ON \`branches\` (\`created_at\`);`);
  await db.run(sql`CREATE TABLE \`branches_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`media_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`branches\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(sql`CREATE INDEX \`branches_rels_order_idx\` ON \`branches_rels\` (\`order\`);`);
  await db.run(
    sql`CREATE INDEX \`branches_rels_parent_idx\` ON \`branches_rels\` (\`parent_id\`);`,
  );
  await db.run(sql`CREATE INDEX \`branches_rels_path_idx\` ON \`branches_rels\` (\`path\`);`);
  await db.run(
    sql`CREATE INDEX \`branches_rels_media_id_idx\` ON \`branches_rels\` (\`media_id\`);`,
  );
  await db.run(sql`CREATE TABLE \`plans_included_features\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`label\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`plans\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(
    sql`CREATE INDEX \`plans_included_features_order_idx\` ON \`plans_included_features\` (\`_order\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`plans_included_features_parent_id_idx\` ON \`plans_included_features\` (\`_parent_id\`);`,
  );
  await db.run(sql`CREATE TABLE \`plans\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`slug\` text NOT NULL,
  	\`monthly_price\` numeric NOT NULL,
  	\`listing_limit\` numeric DEFAULT 25 NOT NULL,
  	\`branch_limit\` numeric DEFAULT 1 NOT NULL,
  	\`user_limit\` numeric DEFAULT 3 NOT NULL,
  	\`allows_microsite_theming\` integer DEFAULT false,
  	\`allows_feed_import\` integer DEFAULT false,
  	\`summary\` text,
  	\`is_public\` integer DEFAULT false,
  	\`sort_order\` numeric DEFAULT 0,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `);
  await db.run(sql`CREATE UNIQUE INDEX \`plans_slug_idx\` ON \`plans\` (\`slug\`);`);
  await db.run(sql`CREATE INDEX \`plans_updated_at_idx\` ON \`plans\` (\`updated_at\`);`);
  await db.run(sql`CREATE INDEX \`plans_created_at_idx\` ON \`plans\` (\`created_at\`);`);
  await db.run(sql`CREATE TABLE \`leads_notes\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`body\` text NOT NULL,
  	\`author_id\` integer,
  	\`created_at\` text,
  	FOREIGN KEY (\`author_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`leads\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(sql`CREATE INDEX \`leads_notes_order_idx\` ON \`leads_notes\` (\`_order\`);`);
  await db.run(
    sql`CREATE INDEX \`leads_notes_parent_id_idx\` ON \`leads_notes\` (\`_parent_id\`);`,
  );
  await db.run(sql`CREATE INDEX \`leads_notes_author_idx\` ON \`leads_notes\` (\`author_id\`);`);
  await db.run(sql`CREATE TABLE \`leads\` (
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
  `);
  await db.run(sql`CREATE INDEX \`leads_type_idx\` ON \`leads\` (\`type\`);`);
  await db.run(sql`CREATE INDEX \`leads_vehicle_idx\` ON \`leads\` (\`vehicle_id\`);`);
  await db.run(sql`CREATE INDEX \`leads_dealer_idx\` ON \`leads\` (\`dealer_id\`);`);
  await db.run(sql`CREATE INDEX \`leads_branch_idx\` ON \`leads\` (\`branch_id\`);`);
  await db.run(sql`CREATE INDEX \`leads_status_idx\` ON \`leads\` (\`status\`);`);
  await db.run(sql`CREATE INDEX \`leads_assigned_to_idx\` ON \`leads\` (\`assigned_to_id\`);`);
  await db.run(sql`CREATE INDEX \`leads_consent_idx\` ON \`leads\` (\`consent_id\`);`);
  await db.run(sql`CREATE INDEX \`leads_updated_at_idx\` ON \`leads\` (\`updated_at\`);`);
  await db.run(sql`CREATE INDEX \`leads_created_at_idx\` ON \`leads\` (\`created_at\`);`);
  await db.run(sql`CREATE TABLE \`consent_records\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`purpose\` text NOT NULL,
  	\`subject_email\` text,
  	\`subject_phone\` text,
  	\`policy_version\` text NOT NULL,
  	\`granted_at\` text NOT NULL,
  	\`withdrawn_at\` text,
  	\`evidence\` text,
  	\`ip_hash\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `);
  await db.run(
    sql`CREATE INDEX \`consent_records_purpose_idx\` ON \`consent_records\` (\`purpose\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`consent_records_subject_email_idx\` ON \`consent_records\` (\`subject_email\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`consent_records_updated_at_idx\` ON \`consent_records\` (\`updated_at\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`consent_records_created_at_idx\` ON \`consent_records\` (\`created_at\`);`,
  );
  await db.run(sql`CREATE TABLE \`makes\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`slug\` text NOT NULL,
  	\`is_active\` integer DEFAULT true,
  	\`sort_order\` numeric DEFAULT 0,
  	\`merged_into_id\` integer,
  	\`logo_id\` integer,
  	\`is_popular\` integer DEFAULT false,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`merged_into_id\`) REFERENCES \`makes\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`logo_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `);
  await db.run(sql`CREATE INDEX \`makes_name_idx\` ON \`makes\` (\`name\`);`);
  await db.run(sql`CREATE UNIQUE INDEX \`makes_slug_idx\` ON \`makes\` (\`slug\`);`);
  await db.run(sql`CREATE INDEX \`makes_is_active_idx\` ON \`makes\` (\`is_active\`);`);
  await db.run(sql`CREATE INDEX \`makes_merged_into_idx\` ON \`makes\` (\`merged_into_id\`);`);
  await db.run(sql`CREATE INDEX \`makes_logo_idx\` ON \`makes\` (\`logo_id\`);`);
  await db.run(sql`CREATE INDEX \`makes_updated_at_idx\` ON \`makes\` (\`updated_at\`);`);
  await db.run(sql`CREATE INDEX \`makes_created_at_idx\` ON \`makes\` (\`created_at\`);`);
  await db.run(sql`CREATE TABLE \`makes_texts\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`text\` text,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`makes\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(
    sql`CREATE INDEX \`makes_texts_order_parent\` ON \`makes_texts\` (\`order\`,\`parent_id\`);`,
  );
  await db.run(sql`CREATE TABLE \`models\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`slug\` text NOT NULL,
  	\`is_active\` integer DEFAULT true,
  	\`sort_order\` numeric DEFAULT 0,
  	\`merged_into_id\` integer,
  	\`make_id\` integer NOT NULL,
  	\`body_type_id\` integer,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`merged_into_id\`) REFERENCES \`models\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`make_id\`) REFERENCES \`makes\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`body_type_id\`) REFERENCES \`body_types\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `);
  await db.run(sql`CREATE INDEX \`models_name_idx\` ON \`models\` (\`name\`);`);
  await db.run(sql`CREATE UNIQUE INDEX \`models_slug_idx\` ON \`models\` (\`slug\`);`);
  await db.run(sql`CREATE INDEX \`models_is_active_idx\` ON \`models\` (\`is_active\`);`);
  await db.run(sql`CREATE INDEX \`models_merged_into_idx\` ON \`models\` (\`merged_into_id\`);`);
  await db.run(sql`CREATE INDEX \`models_make_idx\` ON \`models\` (\`make_id\`);`);
  await db.run(sql`CREATE INDEX \`models_body_type_idx\` ON \`models\` (\`body_type_id\`);`);
  await db.run(sql`CREATE INDEX \`models_updated_at_idx\` ON \`models\` (\`updated_at\`);`);
  await db.run(sql`CREATE INDEX \`models_created_at_idx\` ON \`models\` (\`created_at\`);`);
  await db.run(sql`CREATE TABLE \`models_texts\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`text\` text,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`models\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(
    sql`CREATE INDEX \`models_texts_order_parent\` ON \`models_texts\` (\`order\`,\`parent_id\`);`,
  );
  await db.run(sql`CREATE TABLE \`variants\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`slug\` text NOT NULL,
  	\`is_active\` integer DEFAULT true,
  	\`sort_order\` numeric DEFAULT 0,
  	\`merged_into_id\` integer,
  	\`model_id\` integer NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`merged_into_id\`) REFERENCES \`variants\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`model_id\`) REFERENCES \`models\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `);
  await db.run(sql`CREATE INDEX \`variants_name_idx\` ON \`variants\` (\`name\`);`);
  await db.run(sql`CREATE UNIQUE INDEX \`variants_slug_idx\` ON \`variants\` (\`slug\`);`);
  await db.run(sql`CREATE INDEX \`variants_is_active_idx\` ON \`variants\` (\`is_active\`);`);
  await db.run(
    sql`CREATE INDEX \`variants_merged_into_idx\` ON \`variants\` (\`merged_into_id\`);`,
  );
  await db.run(sql`CREATE INDEX \`variants_model_idx\` ON \`variants\` (\`model_id\`);`);
  await db.run(sql`CREATE INDEX \`variants_updated_at_idx\` ON \`variants\` (\`updated_at\`);`);
  await db.run(sql`CREATE INDEX \`variants_created_at_idx\` ON \`variants\` (\`created_at\`);`);
  await db.run(sql`CREATE TABLE \`variants_texts\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`text\` text,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`variants\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(
    sql`CREATE INDEX \`variants_texts_order_parent\` ON \`variants_texts\` (\`order\`,\`parent_id\`);`,
  );
  await db.run(sql`CREATE TABLE \`body_types\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`slug\` text NOT NULL,
  	\`is_active\` integer DEFAULT true,
  	\`sort_order\` numeric DEFAULT 0,
  	\`merged_into_id\` integer,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`merged_into_id\`) REFERENCES \`body_types\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `);
  await db.run(sql`CREATE INDEX \`body_types_name_idx\` ON \`body_types\` (\`name\`);`);
  await db.run(sql`CREATE UNIQUE INDEX \`body_types_slug_idx\` ON \`body_types\` (\`slug\`);`);
  await db.run(sql`CREATE INDEX \`body_types_is_active_idx\` ON \`body_types\` (\`is_active\`);`);
  await db.run(
    sql`CREATE INDEX \`body_types_merged_into_idx\` ON \`body_types\` (\`merged_into_id\`);`,
  );
  await db.run(sql`CREATE INDEX \`body_types_updated_at_idx\` ON \`body_types\` (\`updated_at\`);`);
  await db.run(sql`CREATE INDEX \`body_types_created_at_idx\` ON \`body_types\` (\`created_at\`);`);
  await db.run(sql`CREATE TABLE \`body_types_texts\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`text\` text,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`body_types\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(
    sql`CREATE INDEX \`body_types_texts_order_parent\` ON \`body_types_texts\` (\`order\`,\`parent_id\`);`,
  );
  await db.run(sql`CREATE TABLE \`fuel_types\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`slug\` text NOT NULL,
  	\`is_active\` integer DEFAULT true,
  	\`sort_order\` numeric DEFAULT 0,
  	\`merged_into_id\` integer,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`merged_into_id\`) REFERENCES \`fuel_types\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `);
  await db.run(sql`CREATE INDEX \`fuel_types_name_idx\` ON \`fuel_types\` (\`name\`);`);
  await db.run(sql`CREATE UNIQUE INDEX \`fuel_types_slug_idx\` ON \`fuel_types\` (\`slug\`);`);
  await db.run(sql`CREATE INDEX \`fuel_types_is_active_idx\` ON \`fuel_types\` (\`is_active\`);`);
  await db.run(
    sql`CREATE INDEX \`fuel_types_merged_into_idx\` ON \`fuel_types\` (\`merged_into_id\`);`,
  );
  await db.run(sql`CREATE INDEX \`fuel_types_updated_at_idx\` ON \`fuel_types\` (\`updated_at\`);`);
  await db.run(sql`CREATE INDEX \`fuel_types_created_at_idx\` ON \`fuel_types\` (\`created_at\`);`);
  await db.run(sql`CREATE TABLE \`fuel_types_texts\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`text\` text,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`fuel_types\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(
    sql`CREATE INDEX \`fuel_types_texts_order_parent\` ON \`fuel_types_texts\` (\`order\`,\`parent_id\`);`,
  );
  await db.run(sql`CREATE TABLE \`transmissions\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`slug\` text NOT NULL,
  	\`is_active\` integer DEFAULT true,
  	\`sort_order\` numeric DEFAULT 0,
  	\`merged_into_id\` integer,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`merged_into_id\`) REFERENCES \`transmissions\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `);
  await db.run(sql`CREATE INDEX \`transmissions_name_idx\` ON \`transmissions\` (\`name\`);`);
  await db.run(
    sql`CREATE UNIQUE INDEX \`transmissions_slug_idx\` ON \`transmissions\` (\`slug\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`transmissions_is_active_idx\` ON \`transmissions\` (\`is_active\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`transmissions_merged_into_idx\` ON \`transmissions\` (\`merged_into_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`transmissions_updated_at_idx\` ON \`transmissions\` (\`updated_at\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`transmissions_created_at_idx\` ON \`transmissions\` (\`created_at\`);`,
  );
  await db.run(sql`CREATE TABLE \`transmissions_texts\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`text\` text,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`transmissions\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(
    sql`CREATE INDEX \`transmissions_texts_order_parent\` ON \`transmissions_texts\` (\`order\`,\`parent_id\`);`,
  );
  await db.run(sql`CREATE TABLE \`drivetrains\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`slug\` text NOT NULL,
  	\`is_active\` integer DEFAULT true,
  	\`sort_order\` numeric DEFAULT 0,
  	\`merged_into_id\` integer,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`merged_into_id\`) REFERENCES \`drivetrains\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `);
  await db.run(sql`CREATE INDEX \`drivetrains_name_idx\` ON \`drivetrains\` (\`name\`);`);
  await db.run(sql`CREATE UNIQUE INDEX \`drivetrains_slug_idx\` ON \`drivetrains\` (\`slug\`);`);
  await db.run(sql`CREATE INDEX \`drivetrains_is_active_idx\` ON \`drivetrains\` (\`is_active\`);`);
  await db.run(
    sql`CREATE INDEX \`drivetrains_merged_into_idx\` ON \`drivetrains\` (\`merged_into_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`drivetrains_updated_at_idx\` ON \`drivetrains\` (\`updated_at\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`drivetrains_created_at_idx\` ON \`drivetrains\` (\`created_at\`);`,
  );
  await db.run(sql`CREATE TABLE \`drivetrains_texts\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`text\` text,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`drivetrains\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(
    sql`CREATE INDEX \`drivetrains_texts_order_parent\` ON \`drivetrains_texts\` (\`order\`,\`parent_id\`);`,
  );
  await db.run(sql`CREATE TABLE \`colours\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`slug\` text NOT NULL,
  	\`is_active\` integer DEFAULT true,
  	\`sort_order\` numeric DEFAULT 0,
  	\`merged_into_id\` integer,
  	\`family\` text NOT NULL,
  	\`swatch\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`merged_into_id\`) REFERENCES \`colours\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `);
  await db.run(sql`CREATE INDEX \`colours_name_idx\` ON \`colours\` (\`name\`);`);
  await db.run(sql`CREATE UNIQUE INDEX \`colours_slug_idx\` ON \`colours\` (\`slug\`);`);
  await db.run(sql`CREATE INDEX \`colours_is_active_idx\` ON \`colours\` (\`is_active\`);`);
  await db.run(sql`CREATE INDEX \`colours_merged_into_idx\` ON \`colours\` (\`merged_into_id\`);`);
  await db.run(sql`CREATE INDEX \`colours_family_idx\` ON \`colours\` (\`family\`);`);
  await db.run(sql`CREATE INDEX \`colours_updated_at_idx\` ON \`colours\` (\`updated_at\`);`);
  await db.run(sql`CREATE INDEX \`colours_created_at_idx\` ON \`colours\` (\`created_at\`);`);
  await db.run(sql`CREATE TABLE \`colours_texts\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`text\` text,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`colours\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(
    sql`CREATE INDEX \`colours_texts_order_parent\` ON \`colours_texts\` (\`order\`,\`parent_id\`);`,
  );
  await db.run(sql`CREATE TABLE \`feature_categories\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`slug\` text NOT NULL,
  	\`is_active\` integer DEFAULT true,
  	\`sort_order\` numeric DEFAULT 0,
  	\`merged_into_id\` integer,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`merged_into_id\`) REFERENCES \`feature_categories\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `);
  await db.run(
    sql`CREATE INDEX \`feature_categories_name_idx\` ON \`feature_categories\` (\`name\`);`,
  );
  await db.run(
    sql`CREATE UNIQUE INDEX \`feature_categories_slug_idx\` ON \`feature_categories\` (\`slug\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`feature_categories_is_active_idx\` ON \`feature_categories\` (\`is_active\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`feature_categories_merged_into_idx\` ON \`feature_categories\` (\`merged_into_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`feature_categories_updated_at_idx\` ON \`feature_categories\` (\`updated_at\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`feature_categories_created_at_idx\` ON \`feature_categories\` (\`created_at\`);`,
  );
  await db.run(sql`CREATE TABLE \`feature_categories_texts\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`text\` text,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`feature_categories\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(
    sql`CREATE INDEX \`feature_categories_texts_order_parent\` ON \`feature_categories_texts\` (\`order\`,\`parent_id\`);`,
  );
  await db.run(sql`CREATE TABLE \`features\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`slug\` text NOT NULL,
  	\`is_active\` integer DEFAULT true,
  	\`sort_order\` numeric DEFAULT 0,
  	\`merged_into_id\` integer,
  	\`category_id\` integer NOT NULL,
  	\`is_highlight\` integer DEFAULT false,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`merged_into_id\`) REFERENCES \`features\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`category_id\`) REFERENCES \`feature_categories\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `);
  await db.run(sql`CREATE INDEX \`features_name_idx\` ON \`features\` (\`name\`);`);
  await db.run(sql`CREATE UNIQUE INDEX \`features_slug_idx\` ON \`features\` (\`slug\`);`);
  await db.run(sql`CREATE INDEX \`features_is_active_idx\` ON \`features\` (\`is_active\`);`);
  await db.run(
    sql`CREATE INDEX \`features_merged_into_idx\` ON \`features\` (\`merged_into_id\`);`,
  );
  await db.run(sql`CREATE INDEX \`features_category_idx\` ON \`features\` (\`category_id\`);`);
  await db.run(sql`CREATE INDEX \`features_updated_at_idx\` ON \`features\` (\`updated_at\`);`);
  await db.run(sql`CREATE INDEX \`features_created_at_idx\` ON \`features\` (\`created_at\`);`);
  await db.run(sql`CREATE TABLE \`features_texts\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`text\` text,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`features\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(
    sql`CREATE INDEX \`features_texts_order_parent\` ON \`features_texts\` (\`order\`,\`parent_id\`);`,
  );
  await db.run(sql`CREATE TABLE \`provinces\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`slug\` text NOT NULL,
  	\`is_active\` integer DEFAULT true,
  	\`sort_order\` numeric DEFAULT 0,
  	\`merged_into_id\` integer,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`merged_into_id\`) REFERENCES \`provinces\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `);
  await db.run(sql`CREATE INDEX \`provinces_name_idx\` ON \`provinces\` (\`name\`);`);
  await db.run(sql`CREATE UNIQUE INDEX \`provinces_slug_idx\` ON \`provinces\` (\`slug\`);`);
  await db.run(sql`CREATE INDEX \`provinces_is_active_idx\` ON \`provinces\` (\`is_active\`);`);
  await db.run(
    sql`CREATE INDEX \`provinces_merged_into_idx\` ON \`provinces\` (\`merged_into_id\`);`,
  );
  await db.run(sql`CREATE INDEX \`provinces_updated_at_idx\` ON \`provinces\` (\`updated_at\`);`);
  await db.run(sql`CREATE INDEX \`provinces_created_at_idx\` ON \`provinces\` (\`created_at\`);`);
  await db.run(sql`CREATE TABLE \`provinces_texts\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`text\` text,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`provinces\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(
    sql`CREATE INDEX \`provinces_texts_order_parent\` ON \`provinces_texts\` (\`order\`,\`parent_id\`);`,
  );
  await db.run(sql`CREATE TABLE \`cities\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`slug\` text NOT NULL,
  	\`is_active\` integer DEFAULT true,
  	\`sort_order\` numeric DEFAULT 0,
  	\`merged_into_id\` integer,
  	\`province_id\` integer NOT NULL,
  	\`latitude\` numeric,
  	\`longitude\` numeric,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`merged_into_id\`) REFERENCES \`cities\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`province_id\`) REFERENCES \`provinces\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `);
  await db.run(sql`CREATE INDEX \`cities_name_idx\` ON \`cities\` (\`name\`);`);
  await db.run(sql`CREATE UNIQUE INDEX \`cities_slug_idx\` ON \`cities\` (\`slug\`);`);
  await db.run(sql`CREATE INDEX \`cities_is_active_idx\` ON \`cities\` (\`is_active\`);`);
  await db.run(sql`CREATE INDEX \`cities_merged_into_idx\` ON \`cities\` (\`merged_into_id\`);`);
  await db.run(sql`CREATE INDEX \`cities_province_idx\` ON \`cities\` (\`province_id\`);`);
  await db.run(sql`CREATE INDEX \`cities_updated_at_idx\` ON \`cities\` (\`updated_at\`);`);
  await db.run(sql`CREATE INDEX \`cities_created_at_idx\` ON \`cities\` (\`created_at\`);`);
  await db.run(sql`CREATE TABLE \`cities_texts\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`text\` text,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`cities\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(
    sql`CREATE INDEX \`cities_texts_order_parent\` ON \`cities_texts\` (\`order\`,\`parent_id\`);`,
  );
  await db.run(sql`CREATE TABLE \`franchises\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`slug\` text NOT NULL,
  	\`is_active\` integer DEFAULT true,
  	\`sort_order\` numeric DEFAULT 0,
  	\`merged_into_id\` integer,
  	\`make_id\` integer,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`merged_into_id\`) REFERENCES \`franchises\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`make_id\`) REFERENCES \`makes\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `);
  await db.run(sql`CREATE INDEX \`franchises_name_idx\` ON \`franchises\` (\`name\`);`);
  await db.run(sql`CREATE UNIQUE INDEX \`franchises_slug_idx\` ON \`franchises\` (\`slug\`);`);
  await db.run(sql`CREATE INDEX \`franchises_is_active_idx\` ON \`franchises\` (\`is_active\`);`);
  await db.run(
    sql`CREATE INDEX \`franchises_merged_into_idx\` ON \`franchises\` (\`merged_into_id\`);`,
  );
  await db.run(sql`CREATE INDEX \`franchises_make_idx\` ON \`franchises\` (\`make_id\`);`);
  await db.run(sql`CREATE INDEX \`franchises_updated_at_idx\` ON \`franchises\` (\`updated_at\`);`);
  await db.run(sql`CREATE INDEX \`franchises_created_at_idx\` ON \`franchises\` (\`created_at\`);`);
  await db.run(sql`CREATE TABLE \`franchises_texts\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`text\` text,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`franchises\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(
    sql`CREATE INDEX \`franchises_texts_order_parent\` ON \`franchises_texts\` (\`order\`,\`parent_id\`);`,
  );
  await db.run(sql`CREATE TABLE \`dealer_groups\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`slug\` text NOT NULL,
  	\`is_active\` integer DEFAULT true,
  	\`sort_order\` numeric DEFAULT 0,
  	\`merged_into_id\` integer,
  	\`logo_id\` integer,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`merged_into_id\`) REFERENCES \`dealer_groups\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`logo_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `);
  await db.run(sql`CREATE INDEX \`dealer_groups_name_idx\` ON \`dealer_groups\` (\`name\`);`);
  await db.run(
    sql`CREATE UNIQUE INDEX \`dealer_groups_slug_idx\` ON \`dealer_groups\` (\`slug\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`dealer_groups_is_active_idx\` ON \`dealer_groups\` (\`is_active\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`dealer_groups_merged_into_idx\` ON \`dealer_groups\` (\`merged_into_id\`);`,
  );
  await db.run(sql`CREATE INDEX \`dealer_groups_logo_idx\` ON \`dealer_groups\` (\`logo_id\`);`);
  await db.run(
    sql`CREATE INDEX \`dealer_groups_updated_at_idx\` ON \`dealer_groups\` (\`updated_at\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`dealer_groups_created_at_idx\` ON \`dealer_groups\` (\`created_at\`);`,
  );
  await db.run(sql`CREATE TABLE \`dealer_groups_texts\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`text\` text,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`dealer_groups\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(
    sql`CREATE INDEX \`dealer_groups_texts_order_parent\` ON \`dealer_groups_texts\` (\`order\`,\`parent_id\`);`,
  );
  await db.run(sql`CREATE TABLE \`accreditations\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`slug\` text NOT NULL,
  	\`is_active\` integer DEFAULT true,
  	\`sort_order\` numeric DEFAULT 0,
  	\`merged_into_id\` integer,
  	\`badge_id\` integer,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`merged_into_id\`) REFERENCES \`accreditations\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`badge_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `);
  await db.run(sql`CREATE INDEX \`accreditations_name_idx\` ON \`accreditations\` (\`name\`);`);
  await db.run(
    sql`CREATE UNIQUE INDEX \`accreditations_slug_idx\` ON \`accreditations\` (\`slug\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`accreditations_is_active_idx\` ON \`accreditations\` (\`is_active\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`accreditations_merged_into_idx\` ON \`accreditations\` (\`merged_into_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`accreditations_badge_idx\` ON \`accreditations\` (\`badge_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`accreditations_updated_at_idx\` ON \`accreditations\` (\`updated_at\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`accreditations_created_at_idx\` ON \`accreditations\` (\`created_at\`);`,
  );
  await db.run(sql`CREATE TABLE \`accreditations_texts\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`text\` text,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`accreditations\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(
    sql`CREATE INDEX \`accreditations_texts_order_parent\` ON \`accreditations_texts\` (\`order\`,\`parent_id\`);`,
  );
  await db.run(sql`CREATE TABLE \`media\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`alt\` text,
  	\`is_decorative\` integer DEFAULT false,
  	\`credit\` text,
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
  `);
  await db.run(sql`CREATE INDEX \`media_folder_idx\` ON \`media\` (\`folder\`);`);
  await db.run(sql`CREATE INDEX \`media_updated_at_idx\` ON \`media\` (\`updated_at\`);`);
  await db.run(sql`CREATE INDEX \`media_created_at_idx\` ON \`media\` (\`created_at\`);`);
  await db.run(sql`CREATE UNIQUE INDEX \`media_filename_idx\` ON \`media\` (\`filename\`);`);
  await db.run(
    sql`CREATE INDEX \`media_sizes_thumbnail_sizes_thumbnail_filename_idx\` ON \`media\` (\`sizes_thumbnail_filename\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`media_sizes_card_sizes_card_filename_idx\` ON \`media\` (\`sizes_card_filename\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`media_sizes_gallery_sizes_gallery_filename_idx\` ON \`media\` (\`sizes_gallery_filename\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`media_sizes_hero_sizes_hero_filename_idx\` ON \`media\` (\`sizes_hero_filename\`);`,
  );
  await db.run(sql`CREATE TABLE \`users_sessions\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`created_at\` text,
  	\`expires_at\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(sql`CREATE INDEX \`users_sessions_order_idx\` ON \`users_sessions\` (\`_order\`);`);
  await db.run(
    sql`CREATE INDEX \`users_sessions_parent_id_idx\` ON \`users_sessions\` (\`_parent_id\`);`,
  );
  await db.run(sql`CREATE TABLE \`users\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`role\` text DEFAULT 'dealer_sales' NOT NULL,
  	\`dealer_id\` integer,
  	\`phone\` text,
  	\`status\` text DEFAULT 'invited' NOT NULL,
  	\`two_factor_enabled\` integer DEFAULT false,
  	\`last_login_at\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`email\` text NOT NULL,
  	\`reset_password_token\` text,
  	\`reset_password_expiration\` text,
  	\`salt\` text,
  	\`hash\` text,
  	\`login_attempts\` numeric DEFAULT 0,
  	\`lock_until\` text,
  	FOREIGN KEY (\`dealer_id\`) REFERENCES \`dealers\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `);
  await db.run(sql`CREATE INDEX \`users_dealer_idx\` ON \`users\` (\`dealer_id\`);`);
  await db.run(sql`CREATE INDEX \`users_updated_at_idx\` ON \`users\` (\`updated_at\`);`);
  await db.run(sql`CREATE INDEX \`users_created_at_idx\` ON \`users\` (\`created_at\`);`);
  await db.run(sql`CREATE UNIQUE INDEX \`users_email_idx\` ON \`users\` (\`email\`);`);
  await db.run(sql`CREATE TABLE \`buyers_sessions\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`created_at\` text,
  	\`expires_at\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`buyers\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(
    sql`CREATE INDEX \`buyers_sessions_order_idx\` ON \`buyers_sessions\` (\`_order\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`buyers_sessions_parent_id_idx\` ON \`buyers_sessions\` (\`_parent_id\`);`,
  );
  await db.run(sql`CREATE TABLE \`buyers\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`phone\` text,
  	\`province_id\` integer,
  	\`city_id\` integer,
  	\`alert_frequency\` text DEFAULT 'daily' NOT NULL,
  	\`marketing_consent\` integer DEFAULT false,
  	\`status\` text DEFAULT 'active' NOT NULL,
  	\`deletion_requested_at\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`email\` text NOT NULL,
  	\`reset_password_token\` text,
  	\`reset_password_expiration\` text,
  	\`salt\` text,
  	\`hash\` text,
  	\`login_attempts\` numeric DEFAULT 0,
  	\`lock_until\` text,
  	FOREIGN KEY (\`province_id\`) REFERENCES \`provinces\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`city_id\`) REFERENCES \`cities\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `);
  await db.run(sql`CREATE INDEX \`buyers_province_idx\` ON \`buyers\` (\`province_id\`);`);
  await db.run(sql`CREATE INDEX \`buyers_city_idx\` ON \`buyers\` (\`city_id\`);`);
  await db.run(sql`CREATE INDEX \`buyers_updated_at_idx\` ON \`buyers\` (\`updated_at\`);`);
  await db.run(sql`CREATE INDEX \`buyers_created_at_idx\` ON \`buyers\` (\`created_at\`);`);
  await db.run(sql`CREATE UNIQUE INDEX \`buyers_email_idx\` ON \`buyers\` (\`email\`);`);
  await db.run(sql`CREATE TABLE \`payload_kv\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`key\` text NOT NULL,
  	\`data\` text NOT NULL
  );
  `);
  await db.run(sql`CREATE UNIQUE INDEX \`payload_kv_key_idx\` ON \`payload_kv\` (\`key\`);`);
  await db.run(sql`CREATE TABLE \`payload_locked_documents\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`global_slug\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `);
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_global_slug_idx\` ON \`payload_locked_documents\` (\`global_slug\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_updated_at_idx\` ON \`payload_locked_documents\` (\`updated_at\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_created_at_idx\` ON \`payload_locked_documents\` (\`created_at\`);`,
  );
  await db.run(sql`CREATE TABLE \`payload_locked_documents_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`vehicles_id\` integer,
  	\`dealers_id\` integer,
  	\`branches_id\` integer,
  	\`plans_id\` integer,
  	\`leads_id\` integer,
  	\`consent_records_id\` integer,
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
  	\`media_id\` integer,
  	\`users_id\` integer,
  	\`buyers_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_locked_documents\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`vehicles_id\`) REFERENCES \`vehicles\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`dealers_id\`) REFERENCES \`dealers\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`branches_id\`) REFERENCES \`branches\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`plans_id\`) REFERENCES \`plans\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`leads_id\`) REFERENCES \`leads\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`consent_records_id\`) REFERENCES \`consent_records\`(\`id\`) ON UPDATE no action ON DELETE cascade,
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
  	FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`buyers_id\`) REFERENCES \`buyers\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_order_idx\` ON \`payload_locked_documents_rels\` (\`order\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_parent_idx\` ON \`payload_locked_documents_rels\` (\`parent_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_path_idx\` ON \`payload_locked_documents_rels\` (\`path\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_vehicles_id_idx\` ON \`payload_locked_documents_rels\` (\`vehicles_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_dealers_id_idx\` ON \`payload_locked_documents_rels\` (\`dealers_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_branches_id_idx\` ON \`payload_locked_documents_rels\` (\`branches_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_plans_id_idx\` ON \`payload_locked_documents_rels\` (\`plans_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_leads_id_idx\` ON \`payload_locked_documents_rels\` (\`leads_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_consent_records_id_idx\` ON \`payload_locked_documents_rels\` (\`consent_records_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_makes_id_idx\` ON \`payload_locked_documents_rels\` (\`makes_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_models_id_idx\` ON \`payload_locked_documents_rels\` (\`models_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_variants_id_idx\` ON \`payload_locked_documents_rels\` (\`variants_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_body_types_id_idx\` ON \`payload_locked_documents_rels\` (\`body_types_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_fuel_types_id_idx\` ON \`payload_locked_documents_rels\` (\`fuel_types_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_transmissions_id_idx\` ON \`payload_locked_documents_rels\` (\`transmissions_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_drivetrains_id_idx\` ON \`payload_locked_documents_rels\` (\`drivetrains_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_colours_id_idx\` ON \`payload_locked_documents_rels\` (\`colours_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_feature_categories_id_idx\` ON \`payload_locked_documents_rels\` (\`feature_categories_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_features_id_idx\` ON \`payload_locked_documents_rels\` (\`features_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_provinces_id_idx\` ON \`payload_locked_documents_rels\` (\`provinces_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_cities_id_idx\` ON \`payload_locked_documents_rels\` (\`cities_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_franchises_id_idx\` ON \`payload_locked_documents_rels\` (\`franchises_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_dealer_groups_id_idx\` ON \`payload_locked_documents_rels\` (\`dealer_groups_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_accreditations_id_idx\` ON \`payload_locked_documents_rels\` (\`accreditations_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_media_id_idx\` ON \`payload_locked_documents_rels\` (\`media_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_users_id_idx\` ON \`payload_locked_documents_rels\` (\`users_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_buyers_id_idx\` ON \`payload_locked_documents_rels\` (\`buyers_id\`);`,
  );
  await db.run(sql`CREATE TABLE \`payload_preferences\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`key\` text,
  	\`value\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `);
  await db.run(
    sql`CREATE INDEX \`payload_preferences_key_idx\` ON \`payload_preferences\` (\`key\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_preferences_updated_at_idx\` ON \`payload_preferences\` (\`updated_at\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_preferences_created_at_idx\` ON \`payload_preferences\` (\`created_at\`);`,
  );
  await db.run(sql`CREATE TABLE \`payload_preferences_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`users_id\` integer,
  	\`buyers_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_preferences\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`buyers_id\`) REFERENCES \`buyers\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(
    sql`CREATE INDEX \`payload_preferences_rels_order_idx\` ON \`payload_preferences_rels\` (\`order\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_preferences_rels_parent_idx\` ON \`payload_preferences_rels\` (\`parent_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_preferences_rels_path_idx\` ON \`payload_preferences_rels\` (\`path\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_preferences_rels_users_id_idx\` ON \`payload_preferences_rels\` (\`users_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_preferences_rels_buyers_id_idx\` ON \`payload_preferences_rels\` (\`buyers_id\`);`,
  );
  await db.run(sql`CREATE TABLE \`payload_migrations\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text,
  	\`batch\` numeric,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `);
  await db.run(
    sql`CREATE INDEX \`payload_migrations_updated_at_idx\` ON \`payload_migrations\` (\`updated_at\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_migrations_created_at_idx\` ON \`payload_migrations\` (\`created_at\`);`,
  );
  await db.run(sql`CREATE TABLE \`finance_defaults\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`prime_rate_percent\` numeric DEFAULT 10.5 NOT NULL,
  	\`default_rate_offset_percent\` numeric DEFAULT 1.5 NOT NULL,
  	\`default_term_months\` numeric DEFAULT 72 NOT NULL,
  	\`default_deposit_percent\` numeric DEFAULT 10 NOT NULL,
  	\`default_balloon_percent\` numeric DEFAULT 0 NOT NULL,
  	\`initiation_fee\` numeric DEFAULT 1207.5 NOT NULL,
  	\`monthly_service_fee\` numeric DEFAULT 69 NOT NULL,
  	\`disclaimer\` text DEFAULT 'REQUIRES LEGAL REVIEW. This calculator gives an estimate only and is not a quotation, an offer of credit, or a pre-approval. The actual instalment depends on a credit assessment by a registered credit provider and on the rate you are offered. Rynet is not a credit provider and does not arrange credit.' NOT NULL,
  	\`last_reviewed_at\` text,
  	\`updated_at\` text,
  	\`created_at\` text
  );
  `);
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`vehicles_price_history\`;`);
  await db.run(sql`DROP TABLE \`vehicles_gallery\`;`);
  await db.run(sql`DROP TABLE \`vehicles\`;`);
  await db.run(sql`DROP TABLE \`vehicles_rels\`;`);
  await db.run(sql`DROP TABLE \`_vehicles_v_version_price_history\`;`);
  await db.run(sql`DROP TABLE \`_vehicles_v_version_gallery\`;`);
  await db.run(sql`DROP TABLE \`_vehicles_v\`;`);
  await db.run(sql`DROP TABLE \`_vehicles_v_rels\`;`);
  await db.run(sql`DROP TABLE \`dealers_email_routing\`;`);
  await db.run(sql`DROP TABLE \`dealers_social_profiles\`;`);
  await db.run(sql`DROP TABLE \`dealers\`;`);
  await db.run(sql`DROP TABLE \`dealers_rels\`;`);
  await db.run(sql`DROP TABLE \`branches_trading_hours\`;`);
  await db.run(sql`DROP TABLE \`branches_holiday_overrides\`;`);
  await db.run(sql`DROP TABLE \`branches\`;`);
  await db.run(sql`DROP TABLE \`branches_rels\`;`);
  await db.run(sql`DROP TABLE \`plans_included_features\`;`);
  await db.run(sql`DROP TABLE \`plans\`;`);
  await db.run(sql`DROP TABLE \`leads_notes\`;`);
  await db.run(sql`DROP TABLE \`leads\`;`);
  await db.run(sql`DROP TABLE \`consent_records\`;`);
  await db.run(sql`DROP TABLE \`makes\`;`);
  await db.run(sql`DROP TABLE \`makes_texts\`;`);
  await db.run(sql`DROP TABLE \`models\`;`);
  await db.run(sql`DROP TABLE \`models_texts\`;`);
  await db.run(sql`DROP TABLE \`variants\`;`);
  await db.run(sql`DROP TABLE \`variants_texts\`;`);
  await db.run(sql`DROP TABLE \`body_types\`;`);
  await db.run(sql`DROP TABLE \`body_types_texts\`;`);
  await db.run(sql`DROP TABLE \`fuel_types\`;`);
  await db.run(sql`DROP TABLE \`fuel_types_texts\`;`);
  await db.run(sql`DROP TABLE \`transmissions\`;`);
  await db.run(sql`DROP TABLE \`transmissions_texts\`;`);
  await db.run(sql`DROP TABLE \`drivetrains\`;`);
  await db.run(sql`DROP TABLE \`drivetrains_texts\`;`);
  await db.run(sql`DROP TABLE \`colours\`;`);
  await db.run(sql`DROP TABLE \`colours_texts\`;`);
  await db.run(sql`DROP TABLE \`feature_categories\`;`);
  await db.run(sql`DROP TABLE \`feature_categories_texts\`;`);
  await db.run(sql`DROP TABLE \`features\`;`);
  await db.run(sql`DROP TABLE \`features_texts\`;`);
  await db.run(sql`DROP TABLE \`provinces\`;`);
  await db.run(sql`DROP TABLE \`provinces_texts\`;`);
  await db.run(sql`DROP TABLE \`cities\`;`);
  await db.run(sql`DROP TABLE \`cities_texts\`;`);
  await db.run(sql`DROP TABLE \`franchises\`;`);
  await db.run(sql`DROP TABLE \`franchises_texts\`;`);
  await db.run(sql`DROP TABLE \`dealer_groups\`;`);
  await db.run(sql`DROP TABLE \`dealer_groups_texts\`;`);
  await db.run(sql`DROP TABLE \`accreditations\`;`);
  await db.run(sql`DROP TABLE \`accreditations_texts\`;`);
  await db.run(sql`DROP TABLE \`media\`;`);
  await db.run(sql`DROP TABLE \`users_sessions\`;`);
  await db.run(sql`DROP TABLE \`users\`;`);
  await db.run(sql`DROP TABLE \`buyers_sessions\`;`);
  await db.run(sql`DROP TABLE \`buyers\`;`);
  await db.run(sql`DROP TABLE \`payload_kv\`;`);
  await db.run(sql`DROP TABLE \`payload_locked_documents\`;`);
  await db.run(sql`DROP TABLE \`payload_locked_documents_rels\`;`);
  await db.run(sql`DROP TABLE \`payload_preferences\`;`);
  await db.run(sql`DROP TABLE \`payload_preferences_rels\`;`);
  await db.run(sql`DROP TABLE \`payload_migrations\`;`);
  await db.run(sql`DROP TABLE \`finance_defaults\`;`);
}
