import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-sqlite'

import { addDemoCardSizes } from '../seed/demo-photos'

/**
 * Gives the demonstration photographs already on the live site their 640px card copies.
 *
 * They went live as 1280px originals only, resized on request by next/image, and the first
 * browser to load a results page took the shared host down with image encodes. The site now
 * never resizes on request, so each photograph needs a card-sized file recorded on its media
 * row. A fresh install already writes them, so there this finds nothing to do.
 */
export async function up({ payload, req }: MigrateUpArgs): Promise<void> {
  const updated = await addDemoCardSizes(payload, { req })
  payload.logger.info(`demonstration photographs given card copies: ${updated}`)
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // Nothing to undo that would help anyone: removing the card copies only makes pages heavier.
}
