import path from "node:path";
import { fileURLToPath } from "node:url";

import { postgresAdapter } from "@payloadcms/db-postgres";
import { sqliteAdapter } from "@payloadcms/db-sqlite";
import { nodemailerAdapter } from "@payloadcms/email-nodemailer";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { buildConfig } from "payload";
import sharp from "sharp";

import { Branches } from "./collections/Branches";
import { Buyers } from "./collections/Buyers";
import { ConsentRecords } from "./collections/ConsentRecords";
import { Dealers } from "./collections/Dealers";
import { Leads } from "./collections/Leads";
import { Media } from "./collections/Media";
import { Plans } from "./collections/Plans";
import { TAXONOMY_COLLECTIONS } from "./collections/taxonomies";
import { Users } from "./collections/Users";
import { Vehicles } from "./collections/Vehicles";
import { FinanceDefaults } from "./globals/FinanceDefaults";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

const serverURL = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000";

export default buildConfig({
  admin: {
    // The Payload admin is for platform staff. Dealers use /portal, which is a normal
    // Next route group talking to Payload through the Local API. Bending this admin into
    // a lead pipeline and a feed mapper would mean fighting it on every screen.
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    meta: {
      titleSuffix: " | Rynet",
      description: "Rynet platform administration",
    },
  },

  collections: [
    // Stock
    Vehicles,
    Dealers,
    Branches,
    Plans,
    // Leads and compliance
    Leads,
    ConsentRecords,
    // Taxonomy, all built from one factory in collections/taxonomy.ts
    ...TAXONOMY_COLLECTIONS,
    // Content
    Media,
    // People. Two separate auth collections on purpose: a buyer has no role field and no
    // dealer field, so a private individual has no path to listing a vehicle.
    Users,
    Buyers,
  ],

  globals: [FinanceDefaults],

  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || "",
  serverURL,
  cors: [serverURL],
  csrf: [serverURL],

  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },

  /**
   * SQLite by default: a single file on the cPanel disk, which is the only option the host
   * supports. Its PostgreSQL is version 10, which Payload 3 does not accept, and Payload
   * has never supported MySQL or MariaDB.
   *
   * If DATABASE_URI is a postgres:// URL the adapter switches, with no code change. That is
   * the migration path, and it matters: SQLite serialises writes, and this is a marketplace
   * with many dealerships writing at once. The trigger to move is written down in
   * docs/ARCHITECTURE.md rather than left to a feeling.
   */
  db: (process.env.DATABASE_URI || "").startsWith("postgres")
    ? postgresAdapter({ pool: { connectionString: process.env.DATABASE_URI || "" } })
    : sqliteAdapter({
        client: { url: process.env.DATABASE_URI || "file:./rynet.db" },
        // Schema changes are applied deliberately rather than pushed automatically. The
        // live database is one file holding every dealership's stock.
        push: process.env.NODE_ENV !== "production",
      }),

  email: process.env.SMTP_HOST
    ? nodemailerAdapter({
        defaultFromAddress: process.env.EMAIL_FROM || "noreply@rynet.co.za",
        defaultFromName: "Rynet",
        transportOptions: {
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          secure: Number(process.env.SMTP_PORT || 587) === 465,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        },
      })
    : undefined,

  // Re-encodes every upload, which strips EXIF including the GPS coordinates a dealer's
  // phone writes into every photo of every car on their forecourt.
  sharp,

  telemetry: false,
});
