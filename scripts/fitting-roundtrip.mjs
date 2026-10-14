// ------------------------------------------------------------------
// Proves the fitting-request path end to end, without a browser:
//
//   1. INSERTs a request through PostgREST with the ANON key — exactly what
//      app/actions.ts::requestFitting does, so this exercises the RLS insert
//      policy in scripts/sql/fittings.sql.
//   2. Reads it back over the direct Postgres connection (DIRECT_URL) to prove
//      the row really landed. The anon role has NO select policy on purpose, so
//      the read has to go through a privileged connection.
//   3. Deletes the test row again, so the atelier's book is left clean.
//
//   node scripts/fitting-roundtrip.mjs
//
// Exits non-zero on the first failure, so it can be used as a pre-deploy check
// alongside scripts/variant-roundtrip.mjs.
// ------------------------------------------------------------------
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import pg from 'pg'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')

function readEnv(raw) {
  const env = {}
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (!match) continue
    let value = match[2]
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    env[match[1]] = value
  }
  return env
}

const env = readEnv(await readFile(path.join(root, '.env.local'), 'utf8'))
const url = env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const connectionString = env.DIRECT_URL || env.DATABASE_URL

if (!url || !anonKey) throw new Error('NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY missing')
if (!connectionString) throw new Error('DIRECT_URL / DATABASE_URL missing')

const marker = `roundtrip-${Date.now()}`
const payload = {
  name: 'Roundtrip Check',
  email: `${marker}@example.com`,
  phone: '+0000000000',
  service: 'Measurements only',
  preferred_date: null,
  notes: `Automated check ${marker}`,
}

const checks = []
const check = (label, ok, detail = '') => {
  checks.push({ label, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
}

// 1. Anonymous INSERT through PostgREST (the storefront's path).
const insert = await fetch(`${url}/rest/v1/fitting_requests`, {
  method: 'POST',
  headers: {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
  },
  body: JSON.stringify(payload),
})
check('anon INSERT via PostgREST returns 201', insert.status === 201, `status ${insert.status}`)

// 2. Read it back with a privileged connection, then 3. clean up.
const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } })
await client.connect()
try {
  const found = await client.query('select id, status, service from public.fitting_requests where email = $1', [
    payload.email,
  ])
  check('row is readable by the admin connection', found.rowCount === 1, `${found.rowCount} row(s)`)
  check('new request defaults to status "New"', found.rows[0]?.status === 'New', String(found.rows[0]?.status))

  const policies = await client.query(
    "select policyname from pg_policies where tablename = 'fitting_requests' order by policyname",
  )
  check(
    'three RLS policies are in place',
    policies.rowCount === 3,
    policies.rows.map((row) => row.policyname).join(', '),
  )

  const deleted = await client.query('delete from public.fitting_requests where email = $1', [payload.email])
  check('test row removed', deleted.rowCount === 1, `${deleted.rowCount} row(s)`)
} finally {
  await client.end()
}

const failed = checks.filter((entry) => !entry.ok)
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`)
if (failed.length) process.exit(1)
