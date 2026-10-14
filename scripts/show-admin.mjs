// Prints a readable extract of the two admin screens so the uploader can be
// inspected without a browser:  node scripts/show-admin.mjs [productId]
import { readFile } from 'node:fs/promises'
import { createServerClient } from '@supabase/ssr'

const raw = await readFile('.env.local', 'utf8')
const g = (k) => {
  const m = raw.match(new RegExp(`${k}\\s*=\\s*"?([^"\\r\\n]+)"?`))
  return m ? m[1].trim() : null
}

const jar = new Map()
const sc = createServerClient(g('NEXT_PUBLIC_SUPABASE_URL'), g('NEXT_PUBLIC_SUPABASE_ANON_KEY'), {
  cookies: {
    getAll: () => [...jar.entries()].map(([name, value]) => ({ name, value })),
    setAll: (list) => list.forEach(({ name, value }) => jar.set(name, value)),
  },
})
const { error } = await sc.auth.signInWithPassword({
  email: 'admin@avidwomanvogue.com',
  password: 'Avid-Admin-2025!',
})
if (error) throw error
const cookie = [...jar.entries()].map(([n, v]) => `${n}=${v}`).join('; ')

const BASE = 'http://localhost:3001'
const strip = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&apos;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()

const fetchText = async (p) => {
  const res = await fetch(`${BASE}${p}`, { headers: { cookie } })
  const html = await res.text()
  return { status: res.status, html, text: strip(html) }
}

const id = process.argv[2] ?? '1'

// --- 1. Products list ----------------------------------------------------
{
  const { status, html, text } = await fetchText('/admin/products')
  console.log('='.repeat(72))
  console.log(`1) /admin/products  (HTTP ${status})`)
  console.log('='.repeat(72))
  const counts = [...html.matchAll(/(\d+ of \d+ colours? photographed|No colours yet)/g)].map((m) => m[1])
  console.log('photo-count column, one entry per row:')
  counts.forEach((c, i) => console.log(`   row ${i + 1}: ${c}`))
  const badges = [...text.matchAll(/(New|Exclusive|Limited|Last pieces)/g)].map((m) => m[1])
  console.log(`badges rendered: ${badges.length ? badges.join(', ') : '(none)'}`)
}

// --- 2. Product edit page ------------------------------------------------
{
  const { status, text } = await fetchText(`/admin/products/${id}`)
  console.log('\n' + '='.repeat(72))
  console.log(`2) /admin/products/${id}  (HTTP ${status})`)
  console.log('='.repeat(72))

  const cover = text.indexOf('Cover image')
  console.log('\n[cover image field]')
  console.log('   ' + text.slice(cover, cover + 240))

  const statusLine = text.indexOf('photographed')
  console.log('\n[colour photo status]')
  console.log('   ' + text.slice(Math.max(0, statusLine - 40), statusLine + 200))

  const photos = text.indexOf('Photography')
  console.log('\n[per-colour uploader]')
  console.log('   ' + text.slice(photos, photos + 330))
}
