import type { Payload } from "payload";

import { migrations } from "../migrations";

/**
 * The live app applies its own pending migrations when it starts.
 *
 * WHY
 *
 * Until now a schema change needed somebody to open a terminal on the host and run
 * `npx payload migrate` between two deploy steps. Nobody did, so the build that added a column
 * to media could never have gone live: every page that shows a photograph would have asked the
 * database for a column it did not have, the health check would have failed, and the deploy
 * would have rolled itself back with no explanation anywhere a person looks. A deploy that
 * needs a ritual nobody performs is not a deploy.
 *
 * WHEN IT DOES NOT
 *
 * Outside production, where Payload pushes the schema itself.
 *
 * On a database that has ever been pushed in development mode. Payload marks those with a
 * migration row in batch -1, and its migrate command stops to ask a yes or no question about
 * data loss before touching one. A server has nobody to answer, so this logs a warning and
 * leaves the database alone rather than guessing. The live database was built by migrations
 * and has no such row.
 *
 * When RYNET_MIGRATE_ON_BOOT is "false", for a moment when a person wants to run one by hand.
 *
 * SAFETY
 *
 * host-deploy.sh copies the database aside before it restarts the app, so there is always a
 * copy from immediately before the first migration of a deploy. Each migration runs in its own
 * transaction. Every migration so far only adds, so if a deploy rolls its code back the older
 * build still reads the database, it simply ignores the new column.
 */
export async function migrateOnBoot(payload: Payload): Promise<void> {
  if (process.env.NODE_ENV !== "production") return;
  if (process.env.RYNET_MIGRATE_ON_BOOT === "false") return;

  let applied: { name?: string | null; batch?: number | null }[] = [];
  try {
    const found = await payload.find({
      collection: "payload-migrations",
      limit: 0,
      pagination: false,
      depth: 0,
      overrideAccess: true,
    });
    applied = found.docs as typeof applied;
  } catch {
    // No migrations table yet: a database nothing has ever been applied to.
    applied = [];
  }

  if (applied.some((row) => row.batch === -1)) {
    payload.logger.warn(
      "This database was pushed in development mode, so migrations are not applied automatically. Run `npx payload migrate` by hand.",
    );
    return;
  }

  const pending = migrations.filter(
    (migration) => !applied.some((row) => row.name === migration.name),
  );
  if (pending.length === 0) return;

  payload.logger.info(
    `Applying ${pending.length} pending migrations: ${pending.map((m) => m.name).join(", ")}`,
  );
  // Payload types each migration's arguments as unknown; the generated ones name their real type.
  await payload.db.migrate({ migrations: migrations as never });
}
