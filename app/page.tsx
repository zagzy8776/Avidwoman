import Storefront from '@/components/avid-app'
import { contentWithDefaults } from '@/lib/data/content'
import { listLookbook } from '@/lib/data/lookbook'
import { listProducts } from '@/lib/data/products'
import { getSettings } from '@/lib/data/settings'
import { DEFAULT_SETTINGS, type StoreSettings } from '@/lib/data/types'

// The storefront stays a single client component; this shell is the only part
// that talks to Supabase for it. Products, lookbook, page copy and the footer's
// social links all come from the same typed data module the admin console
// writes to, so an edit in /admin shows up on the storefront.
//
// Archived pieces are excluded by listProducts, so they leave the shop, the
// home page, search and related rows in one write.
//
// A transient database outage must never show a visitor a 500 page. Each read
// falls back to its empty/default value and the storefront renders what it can,
// which is the same posture `contentWithDefaults` already takes. The admin
// console keeps the strict versions, because there an error is worth seeing.
async function safe<T>(read: () => Promise<T>, fallback: T, label: string): Promise<T> {
  try {
    return await read()
  } catch (error) {
    console.warn(`storefront: ${label} could not be read, using the fallback.`, error)
    return fallback
  }
}

export default async function HomePage() {
  const [products, lookbook, settings, content] = await Promise.all([
    safe(listProducts, [], 'products'),
    safe(listLookbook, [], 'lookbook'),
    safe<StoreSettings>(getSettings, DEFAULT_SETTINGS, 'settings'),
    contentWithDefaults(),
  ])

  return (
    <Storefront
      products={products}
      lookbook={lookbook}
      social={settings.social}
      contactEmail={settings.contactEmail}
      // Payment is a manual bank transfer: the checkout page and every order
      // confirmation show this, and it is snapshotted onto each order.
      bankDetails={settings.bankDetails}
      // The owner's words for the hero, house, fittings, mailing list,
      // heritage and footer blocks (Admin → Content → Page copy).
      content={content}
    />
  )
}

