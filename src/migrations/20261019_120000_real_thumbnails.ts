import { existsSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'

import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-sqlite'
import sharp from 'sharp'

/**
 * A real 320px thumbnail for every imported photograph.
 *
 * The stock importer used to register the 640px card copy as the thumbnail as well, which was
 * harmless while only admin lists asked for thumbnails. The home page floor now lays eighty of
 * them at once, and at four times the bytes per tile the floor cost a throttled phone more than
 * the rest of the page. The importer makes its own thumbnail from now on (photos.ts); this makes
 * one for every photograph imported before it did.
 *
 * DATA ONLY, AND ADDITIVE. No column changes. Each thumbnail is a new file beside the card copy,
 * and the row's thumbnail fields point at it. A build from before this still reads the row, it
 * simply gets the smaller picture. One photograph at a time, never in parallel: the host's process
 * limit (see photos.ts). A photograph whose card copy is not on this disk is left as it was, and
 * so is everything when media lives in the cloud bucket rather than on disk.
 */

type Row = { id: number; card: string | null }

export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  const upload = payload.collections.media?.config.upload
  if (!upload || typeof upload !== 'object' || upload.disableLocalStorage) {
    payload.logger.info('real thumbnails: media is not on this disk, nothing to do')
    return
  }
  const dir = path.resolve(process.cwd(), upload.staticDir ?? 'media')

  const result = await db.run(
    sql`SELECT id, sizes_card_filename AS card FROM media WHERE sizes_card_filename IS NOT NULL AND sizes_thumbnail_filename = sizes_card_filename`,
  )
  const rows = (result.rows ?? []) as unknown as Row[]

  let made = 0
  for (const row of rows) {
    if (!row.card) continue
    const source = path.join(dir, row.card)
    if (!existsSync(source)) continue
    const filename = row.card.replace(/-card\.webp$/, '-thumb.webp')
    if (filename === row.card) continue

    try {
      const output = await sharp(source)
        .resize({ width: 320, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer({ resolveWithObject: true })
      await writeFile(path.join(dir, filename), output.data)
      await db.run(sql`UPDATE media SET
        sizes_thumbnail_url = ${`/api/media/file/${filename}`},
        sizes_thumbnail_filename = ${filename},
        sizes_thumbnail_width = ${output.info.width},
        sizes_thumbnail_height = ${output.info.height},
        sizes_thumbnail_filesize = ${output.data.byteLength},
        sizes_thumbnail_mime_type = 'image/webp'
        WHERE id = ${row.id}`)
      made += 1
    } catch (error) {
      payload.logger.warn(`real thumbnails: skipped media ${row.id}: ${String(error)}`)
    }
  }
  payload.logger.info(`real thumbnails: made ${made} of ${rows.length}`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Point the thumbnail back at the card copy. The thumbnail files stay on disk, unused.
  await db.run(sql`UPDATE media SET
    sizes_thumbnail_url = sizes_card_url,
    sizes_thumbnail_filename = sizes_card_filename,
    sizes_thumbnail_width = sizes_card_width,
    sizes_thumbnail_height = sizes_card_height,
    sizes_thumbnail_filesize = sizes_card_filesize
    WHERE sizes_thumbnail_filename LIKE '%-thumb.webp'`)
}
