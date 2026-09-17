import path from "node:path";
import { fileURLToPath } from "node:url";

import { postgresAdapter } from "@payloadcms/db-postgres";
import { sqliteAdapter } from "@payloadcms/db-sqlite";
import { nodemailerAdapter } from "@payloadcms/email-nodemailer";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { s3Storage } from "@payloadcms/storage-s3";
import { buildConfig, type CollectionConfig, type Config } from "payload";
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
import { withPlainPickers } from "./lib/admin-pickers";
import { migrateOnBoot } from "./lib/migrate-on-boot";

/**
 * Heads every new record "New car", "New dealership" and so on instead of Payload's "[Untitled]".
 * Presentation only; see src/components/admin/brand/new-record-title.tsx.
 */
function withNewRecordTitle(collections: CollectionConfig[]): CollectionConfig[] {
  const component = "/components/admin/brand/new-record-title#NewRecordTitle";
  return collections.map((collection) => {
    const components = collection.admin?.components ?? {};
    const edit = components.edit ?? {};
    return {
      ...collection,
      admin: {
        ...collection.admin,
        components: {
          ...components,
          edit: {
            ...edit,
            beforeDocumentControls: [...(edit.beforeDocumentControls ?? []), component],
          },
        },
      },
    };
  });
}

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

const serverURL = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000";

/**
 * The origins allowed to authenticate with the session COOKIE.
 *
 * Payload compares the request's Origin header against this list and, when it does not match,
 * quietly drops the cookie. The request still succeeds, it simply arrives with no user on it.
 * That is the right defence against a cross-site request riding somebody's session, and it
 * stays.
 *
 * It is also the most misleading failure in the system, because nothing reports it. A wrong
 * entry here reads as a broken sign-in page: the login endpoint returns a token, the cookie is
 * set, and every page after it says you are not signed in. It cost this project eight failing
 * tests that looked like a broken enrolment screen and were an app running on port 3100 while
 * this list named port 3000.
 *
 * NEXT_PUBLIC_SERVER_URL is fixed at build time, so it cannot answer for a build that is run
 * on more than one origin. SERVER_URL and TRUSTED_ORIGINS are read at run time and can.
 * An attacker's page cannot forge an Origin header, so naming a second origin here does not
 * let anybody in; it only says which of our own front doors count as ours.
 */
const trustedOrigins = Array.from(
  new Set(
    [serverURL, process.env.SERVER_URL, ...(process.env.TRUSTED_ORIGINS ?? "").split(",")]
      .map((value) => value?.trim().replace(/\/$/, ""))
      .filter((value): value is string => Boolean(value)),
  ),
);

/**
 * Media storage.
 *
 * Local disk unless the R2 credentials are present, then Cloudflare R2 through the S3
 * adapter. A switch rather than a code change, because the two have different right answers
 * at different points and the changeover should not need a deploy of new code.
 *
 * Local disk is correct while the platform has no photography: it is one fewer service and
 * the whole site state is then two things, `rynet.db` and `media/`.
 *
 * It stops being correct the moment real stock arrives. Twenty photos per listing across a
 * few hundred vehicles is tens of thousands of small files, and shared hosting caps inodes
 * long before it caps disk. Set the R2 variables before the first dealer uploads, not after
 * the account hits its file limit.
 */
const r2Configured = Boolean(
  process.env.R2_BUCKET && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY,
);

const storagePlugins = r2Configured
  ? [
      s3Storage({
        collections: { media: true },
        bucket: process.env.R2_BUCKET ?? "",
        config: {
          endpoint: process.env.R2_ENDPOINT,
          // R2 ignores the region but the S3 client insists on one.
          region: "auto",
          credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
          },
        },
      }),
    ]
  : [];

export default buildConfig({
  // Pending migrations, applied by the live app to itself. See src/lib/migrate-on-boot.ts.
  onInit: migrateOnBoot,

  admin: {
    // The Payload admin is for platform staff. The plan is a separate dealer portal, a normal
    // Next route group talking to Payload through the Local API, because bending this admin into
    // a lead pipeline and a feed mapper would mean fighting it on every screen. No portal route
    // exists yet, so dealership staff have nowhere to manage stock but here.
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    meta: {
      // Payload joins this to the page title with a space of its own.
      titleSuffix: "| Rynet admin",
      description: "Rynet platform administration",
      // No generated share images for admin pages. Nobody shares an admin link, and "dynamic"
      // leaves /api/og open to anyone, rendering an image from whatever title it is sent.
      defaultOGImageType: "off",
      openGraph: { siteName: "Rynet", description: "Rynet platform administration" },
      // Payload ships its own favicon for the admin, and its metadata wins over the app's icon
      // files, so point it at the Rynet icons generated by src/app/icon.tsx and apple-icon.tsx.
      icons: [
        { rel: "icon", type: "image/png", sizes: "32x32", url: "/icon" },
        { rel: "apple-touch-icon", type: "image/png", sizes: "180x180", url: "/apple-icon" },
      ],
    },
    // The stock avatar is Gravatar, which sends a hash of every staff email address to a third
    // party each time the header draws.
    avatar: "default",
    // "16 Sep 2026, 14:05" rather than "September 16th 2026, 2:05 PM".
    dateFormat: "d MMM yyyy, HH:mm",
    /*
     * The Rynet look. Everything here is presentation: the mark and lockup, the menu, the home
     * screen and the words above the sign-in form. Styling is src/app/(payload)/custom.scss.
     * After adding or moving any of these, run `npm run generate:importmap`.
     */
    components: {
      graphics: {
        Logo: "/components/admin/brand/admin-logo#AdminLogo",
        Icon: "/components/admin/brand/admin-icon#AdminIcon",
      },
      Nav: "/components/admin/nav/admin-nav#AdminNav",
      beforeLogin: ["/components/admin/login/login-intro#LoginIntro"],
      views: {
        dashboard: { Component: "/components/admin/dashboard/owner-dashboard#OwnerDashboard" },
      },
    },
  },

  /*
   * Plain words for the few Payload labels a person reads on every screen. Deep-merged over
   * Payload's English, so anything not named here keeps Payload's wording.
   */
  i18n: {
    translations: {
      en: {
        general: {
          dashboard: "Home",
          backToDashboard: "Back to home",
          createNew: "Add new",
          // List column headings and the line under every record's title.
          createdAt: "Created",
          updatedAt: "Last changed",
          lastModified: "Last changed",
          // An empty value in a list read "<No Dealership>".
          noLabel: "None",
          selectValue: "Choose one",
          // "Search by Name, Stock number Or Listing reference", and title case elsewhere.
          or: "or",
          and: "and",
          addFilter: "Add filter",
          perPage: "Rows per page: {{limit}}",
          /*
           * The line under a new record's heading read "Creating new Car", and the toasts after a
           * save read "Car successfully created." and "Updated successfully.". The labels are
           * capitalised for headings, so these either start with the label or leave it out.
           */
          creatingNewLabel: "Not saved yet",
          successfullyCreated: "{{label}} added.",
          updatedSuccessfully: "Saved.",
          successfullyDuplicated: "{{label}} copied.",
          deletedSuccessfully: "Deleted.",
          titleDeleted: "Deleted: {{title}}",
          confirmDeletion: "Delete for good?",
          aboutToDelete: "<1>{{title}}</1> will be deleted. This cannot be undone.",
          confirmDuplication: "Make a copy?",
          duplicate: "Make a copy",
          saving: "Saving",
          deleting: "Deleting",
          submitting: "Sending",
          saveChanges: "Save changes",
          moveUp: "Move up",
          moveDown: "Move down",
          addBelow: "Add below",
          copyRow: "Copy row",
          pasteRow: "Paste row",
          copyField: "Copy field",
          pasteField: "Paste field",
          clearAll: "Clear all",
          applyChanges: "Apply changes",
          emailAddress: "Email address",
          newPassword: "New password",
          noResults: "Nothing to show. There are none yet, or none match the filters above.",
          noResultsFound: "Nothing found.",
          sorryNotFound: "Sorry, there is nothing here.",
          // The account screen: Payload's name for it, and title case.
          payloadSettings: "Screen settings",
          adminTheme: "Colour theme",
          automatic: "Same as this device",
          resetPreferences: "Reset screen settings",
          resetPreferencesDescription:
            "Puts columns, rows per page and folded sections back the way they started.",
          resettingPreferences: "Resetting screen settings.",
        },
        fields: {
          // Spoken by a screen reader on the button that folds a section or a row away.
          toggleBlock: "Open or close",
          collapseAll: "Collapse all",
          showAll: "Show all",
          chooseFromExisting: "Choose from the library",
          addLink: "Add link",
          editLink: "Edit link",
        },
        upload: {
          bulkUpload: "Upload several",
          fileName: "File name",
          fileSize: "File size",
          selectFile: "Choose a file",
          pasteURL: "Paste a web link",
          editImage: "Crop or adjust",
          previewSizes: "See sizes",
          focalPoint: "Focus point",
          filesToUpload: "Files to upload",
          fileToUpload: "File to upload",
          addFile: "Add a file",
          addFiles: "Add files",
        },
        authentication: {
          login: "Sign in",
          logOut: "Sign out",
          logout: "Sign out",
          loggingOut: "Signing out",
          loggedOutSuccessfully: "You are signed out.",
          loggedOutInactivity: "You were signed out because nothing happened for a while.",
          logBackIn: "Sign in again",
          stayLoggedIn: "Stay signed in",
          youAreInactive:
            "Nothing has happened here for a while, so you will be signed out soon to keep the account safe. Stay signed in?",
          changePassword: "Change password",
          confirmPassword: "Confirm password",
          newPassword: "New password",
          forgotPassword: "Forgot password",
          resetPassword: "Reset password",
          resetYourPassword: "Reset your password",
          // Unlocks an account locked by too many wrong passwords.
          forceUnlock: "Unlock account",
          successfullyUnlocked: "Account unlocked.",
          failedToUnlock: "The account could not be unlocked.",
        },
        error: {
          // Shown with the names of the fields after it.
          followingFieldsInvalid_one: "Fill in or fix this field first:",
          followingFieldsInvalid_other: "Fill in or fix these fields first:",
          correctInvalidFields: "Some fields need fixing before this can be saved.",
          autosaving: "Your latest changes could not be kept. Check the connection and save.",
          documentNotFound:
            "This record could not be found. It may have been deleted, or you may not have access to it.",
        },
        /*
         * Payload's save-state words, used only by collections with drafts (cars). "Publish" and
         * "Draft" read as whether a car is on the site, which is what its Listing status decides,
         * so these say what they actually do: save, and keep unsaved changes in the history.
         * "Draft" is avoided altogether, because a car's Listing status has a Draft too.
         */
        version: {
          publish: "Save",
          publishChanges: "Save changes",
          publishing: "Saving",
          versions: "History",
          draft: "Unsaved changes",
          published: "Saved",
          changed: "Unsaved changes",
          draftHasPublishedVersion: "Unsaved changes",
          currentDraft: "Current unsaved changes",
          currentlyPublished: "Saved now",
          currentPublishedVersion: "Saved version",
          previouslyPublished: "Previously saved",
          previouslyDraft: "Previously unsaved changes",
          lastSavedAgo: "Changes kept {{distance}} ago",
          autosavedSuccessfully: "Changes kept.",
          draftSavedSuccessfully: "Changes kept.",
          autosavedVersion: "Changes kept automatically",
          restoreThisVersion: "Go back to this version",
          compareVersions: "Compare versions",
        },
      },
    } as unknown as NonNullable<Config["i18n"]>["translations"],
  },

  /*
   * The ORDER here is the order of the admin menu: Payload draws its groups in the order their
   * first collection appears (see src/lib/admin-nav.ts for the groups). Cars, dealerships and
   * enquiries first, because they are the day's work; the lookup lists and records last.
   * Reordering changes no table, column or API.
   */
  collections: withPlainPickers(
    withNewRecordTitle([
      // Every day
      Vehicles,
      Dealers,
      Leads,
      // Details
      Branches,
      Media,
      // People. Two separate auth collections on purpose: a buyer has no role field and no
      // dealer field, so a private individual has no path to listing a vehicle.
      Users,
      Buyers,
      // Website settings (the finance calculator global joins this group)
      Plans,
      // Lists and records. The taxonomies are all built from one factory in
      // collections/taxonomy.ts.
      ...TAXONOMY_COLLECTIONS,
      ConsentRecords,
    ]),
  ),

  globals: [FinanceDefaults],

  /*
   * Rich text (a car's description, a dealership's "About"). No gutter, which was a faint line and
   * a wide indent that made the box look empty, and a placeholder without Payload's "press '/' for
   * commands", which means nothing to the people typing here.
   */
  editor: lexicalEditor({ admin: { hideGutter: true, placeholder: "Type here" } }),
  secret: process.env.PAYLOAD_SECRET || "",
  serverURL,
  cors: trustedOrigins,
  csrf: trustedOrigins,

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
        /**
         * Schema changes are applied deliberately rather than pushed automatically. The live
         * database is one file holding every dealership's stock.
         *
         * `CI` is in the condition because CI runs `payload migrate` and then seeds. With
         * push still on, Payload compares the migrated schema against the generated one and
         * tries to apply the difference, which failed with "index leads_type_idx already
         * exists" the first time a migration added a column. Two mechanisms writing the same
         * schema is the bug; CI uses migrations, the same as production, so push has no
         * business running there.
         *
         * Local development keeps push, which is what makes iterating on a collection quick.
         */
        push: process.env.NODE_ENV !== "production" && process.env.CI !== "true",
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

  plugins: [...storagePlugins],

  telemetry: false,
});
