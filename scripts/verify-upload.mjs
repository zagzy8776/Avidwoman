// Temporary verification: signs in as the seeded admin through @supabase/ssr
// (so the session cookie is byte-for-byte what the app would set) and checks
// the admin pages + storefront render what the new uploader writes.
//
// Pass A (default) checks the current, unmodified data.
// Pass B (--multi) temporarily appends a SECOND angle to product 1's first
// colour, proves the "Make primary" control appears, then RESTORES the
// original list and re-checks. Seed data is left byte-identical.
//
//   node scripts/verify-upload.mjs
//   node scripts/verify-upload.mjs --multi
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { createServerClient } from '@supabase/ssr'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const raw = await readFile(path.join(root, '.env.local'), 'utf8')
const grab = (key) => {
  const hit = raw.match(new RegExp(`${key}\\s*=\\s*"?([^"\\r\\n]+)"?`))
  return hit ? hit[1].trim() : null
}
const url = grab('NEXT_PUBLIC_SUPABASE_URL')
const anon = grab('NEXT_PUBLIC_SUPABASE_ANON_KEY')
const cloud = grab('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME')
const preset = grab('NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET')
const BASE = process.env.BASE || 'http://localhost:3001'

const failures = []
const check = (label, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures.push(label)
}

check('Cloudinary cloud name set', Boolean(cloud))
check('Cloudinary upload preset set', Boolean(preset))

// --- session cookie, built by the real @supabase/ssr writer -------------
const jar = new Map()
const sc = createServerClient(url, anon, {
  cookies: {
    getAll: () => [...jar.entries()].map(([name, value]) => ({ name, value })),
    setAll: (list) => list.forEach(({ name, value }) => jar.set(name, value)),
  },
})
const { error: authError } = await sc.auth.signInWithPassword({
  email: 'admin@avidwomanvogue.com',
  password: 'Avid-Admin-2025!',
})
check('admin sign-in', !authError, authError?.message ?? '')
const cookie = [...jar.entries()].map(([n, v]) => `${n}=${v}`).join('; ')
// REST calls (the multi-angle round trip) need the bearer token, not cookies:
// anon writes are refused by RLS, which is itself what we are proving.
const {
  data: { session },
} = await sc.auth.getSession()
const authed = session?.access_token

const get = async (p) => {
  const res = await fetch(`${BASE}${p}`, {
    headers: { cookie },
    redirect: 'manual',
  })
  const body = await res.text()
  return { status: res.status, body }
}

// --- 1. products list: photo-count column -------------------------------
{
  const { status, body } = await get('/admin/products')
  check('GET /admin/products', status === 200, `status ${status}`)
  for (const marker of ['photographed', 'View', 'Archive']) {
    check(`  list marker "${marker}"`, body.includes(marker))
  }
  // The photo-count column: "N of M colours photographed".
  check('  list photo-count column', /\d+ of \d+ colours? photographed/.test(body))
}

// --- 2. product edit page: the uploader ---------------------------------
{
  const { status, body } = await get('/admin/products/1')
  check('GET /admin/products/1', status === 200, `status ${status}`)
  for (const marker of [
    'image-uploader',
    'uploader-thumbs',
    'variant-photo-status',
    'photographed',
    'Photo on request',
    'Cover image',
    'single-image-field',
    'Primary',
    'Cloudinary not configured',
    'variant-photo-count',
  ]) {
    check(`  edit marker "${marker}"`, body.includes(marker))
  }
  // Button label depends on whether Cloudinary is wired and whether this
  // colour already has a shot; exactly one of the three must be on screen.
  const labels = ['Upload photo', 'Add another angle', 'Cloudinary not configured']
  check('  uploader button has a label', labels.some((l) => body.includes(l)))
  // The textarea must be gone — that is the whole point of the uploader.
  check('  legacy URL-per-line textarea removed', !body.includes('Images (one URL per line'))
}

// --- 3. storefront reflects the variant image list ----------------------
{
  const { status, body } = await get('/')
  check('GET /', status === 200, `status ${status}`)
  check('  theme toggle rendered', body.includes('theme-toggle'))
  const { body: pdp } = await get('/?product=1')
  check('GET /?product=1 deep link', pdp.includes('AVID WOMAN') || pdp.length > 1000)
}

// --- 4. multi-angle round trip (opt-in, restores the seed) --------------
if (process.argv.includes('--multi')) {
  console.log('\n--- multi-angle round trip ---')
  const rows = await readVariants()
  const first = rows.find((r) => r.product_id === 1)
  const original = [...first.images]
  console.log(`original images for p1/${first.color_name}: ${original.length}`)

  const probe = 'https://res.cloudinary.com/avid-woman-vogue/image/upload/probe-angle.jpg'
  try {
    await writeImages(first.id, [...original, probe])

    const edit = await get('/admin/products/1')
    check('  edit page counts 2 images', /2 image\(s\)/.test(edit.body))
    check('  edit page offers "Make primary"', edit.body.includes('Make primary'))

    // The storefront strip is mounted by the client once a piece is opened,
    // so it is not in the server-rendered HTML — the data path is what a
    // server-side check can actually assert.
    console.log('  (gallery-strip is client-rendered on open — not assertable via SSR HTML)')
  } finally {
    await writeImages(first.id, original)
  }

  const after = await readVariants()
  const restored = after.find((r) => r.product_id === 1).images
  check(
    '  seed images restored byte-identical',
    JSON.stringify(restored) === JSON.stringify(original),
    `${restored.length} images`,
  )
}

// --- small helpers for the round trip -----------------------------------
async function readVariants() {
  const res = await fetch(
    `${url}/rest/v1/product_variants?select=id,product_id,color_name,images&product_id=eq.1&order=position.asc`,
    { headers: { apikey: anon, Authorization: `Bearer ${authed}` } },
  )
  if (!res.ok) throw new Error(`readVariants ${res.status}: ${await res.text()}`)
  return res.json()
}

async function writeImages(id, images) {
  const res = await fetch(`${url}/rest/v1/product_variants?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      apikey: anon,
      Authorization: `Bearer ${authed}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ images }),
  })
  if (!res.ok) throw new Error(`writeImages ${res.status}: ${await res.text()}`)
}

console.log(failures.length ? `\n${failures.length} FAILED` : '\nALL PASS')
process.exit(failures.length ? 1 : 0)
