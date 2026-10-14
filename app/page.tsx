import Storefront from '@/components/avid-app'
import { loadStorefront } from '@/lib/storefront'

/**
 * The storefront reads Supabase through the cookie-aware server client, so it
 * can never be prerendered at build time — Next.js would try, hit
 * DYNAMIC_SERVER_USAGE, and fail the build. Rendering per request is also what
 * the shop wants: an edit in /admin shows up on the next visit, with no
 * rebuild and no stale catalogue.
 */
export const dynamic = 'force-dynamic'

// The storefront stays a single client component; this shell is the only part
// that talks to Supabase for it. Products, lookbook, page copy and the footer's
// social links all come from the same typed data module the admin console
// writes to, so an edit in /admin shows up on the storefront.
//
// The other public pages (/shop, /about, /fitting, /contact, /thrift) are real
// routes that render the same component with a different opening view — see
// components/storefront-route.tsx.
export default async function HomePage() {
  const { products, lookbook, settings, content } = await loadStorefront()

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

