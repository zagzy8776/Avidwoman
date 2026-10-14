import { contentWithDefaults } from '@/lib/data/content'
import { listLookbook } from '@/lib/data/lookbook'
import { listProducts } from '@/lib/data/products'
import { getSettings } from '@/lib/data/settings'
import { DEFAULT_SETTINGS, type StoreSettings } from '@/lib/data/types'

/**
 * One loader for every storefront route.
 *
 * The site is a single client component driven by a `view` value, but each page
 * also has a real URL (/shop, /about, /fitting, /contact, /thrift) so it can be
 * linked, shared and indexed. Those routes all need the same catalogue, copy and
 * settings, so the read lives here rather than being repeated per route.
 *
 * A transient database outage must never show a visitor a 500 page. Each read
 * falls back to its empty/default value and the storefront renders what it can,
 * which is the same posture `contentWithDefaults` already takes. The admin
 * console keeps the strict versions, because there an error is worth seeing.
 */
async function safe<T>(read: () => Promise<T>, fallback: T, label: string): Promise<T> {
  try {
    return await read()
  } catch (error) {
    console.warn(`storefront: ${label} could not be read, using the fallback.`, error)
    return fallback
  }
}

export type StorefrontData = {
  products: Awaited<ReturnType<typeof listProducts>>
  lookbook: Awaited<ReturnType<typeof listLookbook>>
  settings: StoreSettings
  content: Awaited<ReturnType<typeof contentWithDefaults>>
}

export async function loadStorefront(): Promise<StorefrontData> {
  const [products, lookbook, settings, content] = await Promise.all([
    safe(listProducts, [], 'products'),
    safe(listLookbook, [], 'lookbook'),
    safe<StoreSettings>(getSettings, DEFAULT_SETTINGS, 'settings'),
    contentWithDefaults(),
  ])
  return { products, lookbook, settings, content }
}
