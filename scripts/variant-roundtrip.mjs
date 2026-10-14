// ------------------------------------------------------------------
// End-to-end check of the colour-variant write path.
//
//   node scripts/variant-roundtrip.mjs
//
// Replays exactly what lib/data/variants.ts does on an admin save
// (updateVariant -> createVariant -> reorder -> deleteVariant) against
// product 1 through the SAME anon key + RLS the app uses, then restores
// the original rows. Also proves a signed-out visitor cannot write.
// ------------------------------------------------------------------
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const raw = await readFile(path.join(root, '.env.local'), 'utf8')
const grab = (key) => {
  const hit = raw.match(new RegExp(`${key}\\s*=\\s*"?([^"\\r\\n]+)"?`))
  return hit ? hit[1].trim() : null
}
const url = grab('NEXT_PUBLIC_SUPABASE_URL')
const anon = grab('NEXT_PUBLIC_SUPABASE_ANON_KEY')
if (!url || !anon) {
  console.error('NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY missing from .env.local')
  process.exit(1)
}

const SELECT =
  'id, product_id, color_name, color_hex, sku, stock, price, sizes, images, hidden, position'
const PRODUCT_ID = 1

const failures = []
const check = (label, condition, detail = '') => {
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
  if (!condition) failures.push(label)
}

const publicClient = createClient(url, anon, { auth: { persistSession: false } })

// --- 1. public (signed-out) read works: the storefront renders colours ---
const read = await publicClient
  .from('product_variants')
  .select(SELECT)
  .eq('product_id', PRODUCT_ID)
  .order('position', { ascending: true })
check('public read of variants', !read.error && (read.data?.length ?? 0) > 0, `${read.data?.length ?? 0} rows`)

const baseline = read.data ?? []
const first = baseline[0]
if (!first) {
  console.error('no variants seeded for product 1 — nothing to round-trip')
  process.exit(1)
}

// --- 2. signed-out write is refused (RLS) -------------------------------
const beforeStock = first.stock
await publicClient.from('product_variants').update({ stock: beforeStock + 99 }).eq('id', first.id)
const afterAnon = await publicClient.from('product_variants').select('stock').eq('id', first.id).single()
check(
  'anonymous write blocked by RLS',
  (afterAnon.data?.stock ?? -1) === beforeStock,
  `stock stayed ${afterAnon.data?.stock}`,
)


// --- 3. sign in as the seeded admin -------------------------------------
const db = createClient(url, anon, { auth: { persistSession: false } })
const { error: authError } = await db.auth.signInWithPassword({
  email: 'admin@avidwomanvogue.com',
  password: 'Avid-Admin-2025!',
})
check('admin sign-in', !authError, authError?.message ?? '')
if (authError) process.exit(1)

/** camelCase payload -> column names, mirroring lib/data/variants.ts toRow(). */
const asColumns = (row) => ({
  color_name: row.colorName,
  color_hex: row.colorHex,
  sku: row.sku,
  stock: row.stock,
  price: row.price,
  sizes: row.sizes,
  images: row.images,
  hidden: row.hidden,
  position: row.position,
})

// --- 4. updateVariant (editing an existing colour) ----------------------
const bumped = beforeStock + 1
const upd = await db
  .from('product_variants')
  .update(
    asColumns({
      colorName: first.color_name,
      colorHex: first.color_hex,
      sku: first.sku,
      stock: bumped,
      price: first.price,
      sizes: first.sizes ?? [],
      images: first.images ?? [],
      hidden: first.hidden,
      position: first.position,
    }),
  )
  .eq('id', first.id)
  .select(SELECT)
  .single()
check('admin update variant', !upd.error && upd.data?.stock === bumped, `stock -> ${upd.data?.stock}`)

// --- 5. createVariant (a new colour added in the manager) ---------------
const created = await db
  .from('product_variants')
  .insert({
    ...asColumns({
      colorName: 'ZZ Roundtrip',
      colorHex: '#123456',
      sku: 'AVW-TEST-RT',
      stock: 2,
      price: null,
      sizes: ['S', 'M'],
      images: ['https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800'],
      hidden: true,
      position: baseline.length,
    }),
    product_id: PRODUCT_ID,
  })
  .select(SELECT)
  .single()
check(
  'admin insert variant',
  !created.error && created.data?.color_name === 'ZZ Roundtrip',
  created.error?.message ?? '',
)

const newId = created.data?.id

// --- 6. reorder (the position patch the up/down arrows send) ------------
if (newId) {
  const moved = await db
    .from('product_variants')
    .update({ position: 0 })
    .eq('id', newId)
    .select('position')
    .single()
  check('admin reorder variant', !moved.error && moved.data?.position === 0, `position -> ${moved.data?.position}`)
}

// --- 7. hidden colours stay out of the public selection -----------------
const visible = await publicClient
  .from('product_variants')
  .select('id')
  .eq('product_id', PRODUCT_ID)
  .eq('hidden', false)
check(
  'hidden variant excluded from public list',
  !(visible.data ?? []).some((row) => row.id === newId),
  `${visible.data?.length ?? 0} visible`,
)

// --- 7b. admin *can* read hidden rows (syncProductVariants lists them) --
const adminAll = await db.from('product_variants').select('id, hidden').eq('product_id', PRODUCT_ID)
const adminVisible = await db
  .from('product_variants')
  .select('id')
  .eq('product_id', PRODUCT_ID)
  .eq('hidden', false)
check(
  'admin read includes hidden variant',
  (adminAll.data?.length ?? 0) === (adminVisible.data?.length ?? 0) + 1,
  `admin sees ${adminAll.data?.length}, public sees ${adminVisible.data?.length}`,
)

// --- 8. cleanup: deleteVariant + restore the original stock -------------
if (newId) {
  const del = await db.from('product_variants').delete().eq('id', newId)
  check('admin delete variant', !del.error, del.error?.message ?? '')
}
const restore = await db.from('product_variants').update({ stock: beforeStock }).eq('id', first.id).select('id')
check('restore original stock', !restore.error, restore.error?.message ?? '')

const final = await publicClient
  .from('product_variants')
  .select('id, color_name, stock')
  .eq('product_id', PRODUCT_ID)
  .order('position', { ascending: true })
check(
  'catalogue back to baseline',
  JSON.stringify(final.data) ===
    JSON.stringify(baseline.map((row) => ({ id: row.id, color_name: row.color_name, stock: row.stock }))),
  `${final.data?.length ?? 0} rows`,
)

console.log(failures.length ? `\n${failures.length} CHECK(S) FAILED` : '\nALL VARIANT ROUND-TRIP CHECKS PASSED')
process.exit(failures.length ? 1 : 0)
