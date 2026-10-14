// ------------------------------------------------------------------
// One-off: put the variant photography into an HONEST state.
//
//   node scripts/photography-reset.mjs
//
// The original variant seed pointed every colour at an unrelated Unsplash
// photo (different model / garment / pose), which made a swatch click look
// like a different product. This marks the truth instead:
//
//   * the default colour (Noir) keeps ONE real image — the product's own
//     catalogue shot, which is genuinely that garment;
//   * every other colour is left with NO images, so the storefront greys the
//     swatch as "photography pending" and never substitutes a photo.
//
// Re-runnable and safe: it only ever sets images, never deletes rows. Real
// per-colour photography should replace the empty arrays — same shoot, same
// angle, same framing — as it becomes available.
// ------------------------------------------------------------------
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import pg from 'pg'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const raw = await readFile(path.join(root, '.env.local'), 'utf8')
const url = (raw.match(/DIRECT_URL="?([^"\r\n]+)"?/) ?? [])[1]
if (!url) {
  console.error('DIRECT_URL missing from .env.local')
  process.exit(1)
}

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
await client.connect()
try {
  const before = await client.query(
    `select v.color_name,
            coalesce(array_length(v.images, 1), 0) as imgs
       from product_variants v
      order by v.product_id, v.position`,
  )
  console.log(`before — photographed colours: ${before.rows.filter((r) => r.imgs > 0).length}/${before.rows.length}`)

  const after = await client.query(
    `update public.product_variants v
        set images = case
              when v.color_name = 'Noir' then array[p.image]
              else '{}'::text[]
            end
       from public.products p
      where p.id = v.product_id
      returning v.product_id, v.color_name,
                coalesce(array_length(v.images, 1), 0) as imgs`,
  )

  const photographed = after.rows.filter((r) => r.imgs > 0)
  const pending = after.rows.filter((r) => r.imgs === 0)
  console.log(`after  — photographed colours: ${photographed.length}/${after.rows.length}`)
  console.log('photographed:', photographed.map((r) => `p${r.product_id} ${r.color_name}`).join(', '))
  console.log('photography pending:', pending.map((r) => `p${r.product_id} ${r.color_name}`).join(', '))
} finally {
  await client.end()
}
