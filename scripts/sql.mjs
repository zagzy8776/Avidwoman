// ------------------------------------------------------------------
// Runs a .sql file against the project database.
//
//   node scripts/sql.mjs scripts/sql/inspect-auth.sql
//
// Prints the resulting rows as JSON. Read-only usage recommended; use
// scripts/db-setup.mjs for the schema.
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
  // optional
}

const connectionString = env.DIRECT_URL || env.DATABASE_URL
if (!connectionString) {
  console.error('Missing DIRECT_URL / DATABASE_URL.')
  process.exit(1)
}

const target = process.argv[2]
if (!target) {
  console.error('Usage: node scripts/sql.mjs <file.sql>')
  process.exit(1)
}

const sql = await readFile(path.resolve(root, target), 'utf8')
const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } })

await client.connect()
try {
  const result = await client.query(sql)
  const rows = Array.isArray(result) ? result[result.length - 1].rows : result.rows
  console.log(JSON.stringify(rows ?? [], null, 2))
} finally {
  await client.end()
}
