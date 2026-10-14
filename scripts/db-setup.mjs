// ------------------------------------------------------------------
// Applies supabase/schema.sql to the project Postgres.
// Idempotent — safe to run repeatedly.
//
//   node scripts/db-setup.mjs
//
// Reads DIRECT_URL (session-mode pooler, best for DDL) from .env.local,
// falling back to DATABASE_URL, then to the ambient environment.
// ------------------------------------------------------------------
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import pg from 'pg'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')

const env = { ...process.env }

try {
  const raw = await readFile(path.join(root, '.env.local'), 'utf8')
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (!match) continue
    let value = match[2]
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    env[match[1]] = value
  }
} catch {
  // .env.local is optional when the variables are already exported.
}

const connectionString = env.DIRECT_URL || env.DATABASE_URL
if (!connectionString) {
  console.error('Missing DIRECT_URL / DATABASE_URL (checked .env.local and the environment).')
  process.exit(1)
}

const sql = await readFile(path.join(root, 'supabase', 'schema.sql'), 'utf8')

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
})

console.log('Connecting to Postgres …')
await client.connect()

try {
  console.log('Applying supabase/schema.sql …')
  await client.query(sql)

  const { rows } = await client.query(`
    select
      (select count(*) from public.products)    as products,
      (select count(*) from public.lookbook)    as lookbook,
      (select count(*) from public.orders)      as orders,
      (select count(*) from public.settings)    as settings,
      (select count(*) from public.media_slots) as media_slots
  `)

  console.log('Schema applied. Row counts:', rows[0])
} finally {
  await client.end()
}
