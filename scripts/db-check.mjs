// ------------------------------------------------------------------
// One-off: verify DB connectivity + print current catalogue state.
//   node scripts/db-check.mjs
// ------------------------------------------------------------------
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import pg from 'pg'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const raw = await readFile(path.join(root, '.env.local'), 'utf8')
const url = (raw.match(/DIRECT_URL="([^"]+)"/) ?? [])[1]
if (!url) { console.error('DIRECT_URL missing'); process.exit(1) }

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
await client.connect()
try {
  const tables = await client.query(
    "select tablename from pg_tables where schemaname='public' order by 1",
  )
  console.log('tables:', tables.rows.map((r) => r.tablename).join(', '))
  const products = await client.query('select id, name, image is not null as has_img from products order by id')
  console.table(products.rows)
  const variants = await client.query(
    'select product_id, color_name, stock, array_length(images, 1) as imgs, hidden from product_variants order by product_id, position',
  )
  console.table(variants.rows)
  console.log('variant count:', variants.rows.length)

  // Fitting requests — the atelier's appointment book (scripts/sql/fittings.sql).
  try {
    const fittings = await client.query(
      'select status, count(*)::int as requests from public.fitting_requests group by status order by status',
    )
    console.table(fittings.rows)
    console.log('fitting requests:', fittings.rows.reduce((total, row) => total + row.requests, 0))
  } catch {
    console.log('fitting_requests: table missing — run scripts/sql/fittings.sql')
  }
} finally {
  await client.end()
}
