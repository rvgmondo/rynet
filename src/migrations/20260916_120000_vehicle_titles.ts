import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-sqlite'

import { vehicleTitle } from '../lib/vehicle-title'

/**
 * Recomputes every stored car title from its year, make, model and variant.
 *
 * The title hook on vehicles read three keys that are not fields on a car, so every title ever
 * stored was the year alone ("2023" for a Toyota Corolla Cross 1.8 Xi). The public site builds its
 * own titles, so nobody outside the admin saw it, but the admin list, its search box and the car
 * picker on an enquiry all read the stored title.
 *
 * Plain SQL, so no hooks run and no new versions are written. The version rows are updated too,
 * because the admin list and edit screen read the latest version rather than the main row, and
 * a history that showed the old titles would look like somebody had renamed every car.
 *
 * Safe on an empty database: there is nothing to select, so nothing is written.
 */

type Row = Record<string, unknown>

const text = (value: unknown): string | null => (typeof value === 'string' ? value : null)
const year = (value: unknown): number | string | null =>
  typeof value === 'number' || typeof value === 'string' ? value : null

export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  const { rows: cars } = await db.run(sql`
    SELECT v.id AS id, v.title AS title, v.model_year AS model_year,
      mk.name AS make, md.name AS model, vr.name AS variant
    FROM vehicles v
    LEFT JOIN makes mk ON mk.id = v.make_id
    LEFT JOIN models md ON md.id = v.model_id
    LEFT JOIN variants vr ON vr.id = v.variant_id
  `)

  let carsUpdated = 0
  for (const row of cars as unknown as Row[]) {
    const title = vehicleTitle({
      modelYear: year(row.model_year),
      make: text(row.make),
      model: text(row.model),
      variant: text(row.variant),
    })
    if (title === row.title) continue
    await db.run(sql`UPDATE vehicles SET title = ${title} WHERE id = ${row.id}`)
    carsUpdated += 1
  }

  const { rows: versions } = await db.run(sql`
    SELECT v.id AS id, v.version_title AS title, v.version_model_year AS model_year,
      mk.name AS make, md.name AS model, vr.name AS variant
    FROM _vehicles_v v
    LEFT JOIN makes mk ON mk.id = v.version_make_id
    LEFT JOIN models md ON md.id = v.version_model_id
    LEFT JOIN variants vr ON vr.id = v.version_variant_id
  `)

  let versionsUpdated = 0
  for (const row of versions as unknown as Row[]) {
    const title = vehicleTitle({
      modelYear: year(row.model_year),
      make: text(row.make),
      model: text(row.model),
      variant: text(row.variant),
    })
    if (title === row.title) continue
    await db.run(sql`UPDATE _vehicles_v SET version_title = ${title} WHERE id = ${row.id}`)
    versionsUpdated += 1
  }

  payload.logger.info(
    `car titles recomputed: ${carsUpdated} of ${cars.length} cars, ${versionsUpdated} of ${versions.length} saved versions`,
  )
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // Nothing worth restoring: the old titles were only the year.
}
