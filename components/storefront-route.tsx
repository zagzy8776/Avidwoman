import Storefront from '@/components/avid-app'
import { loadStorefront } from '@/lib/storefront'

/**
 * Renders the storefront with a chosen page open.
 *
 * Every public page is the same client component; this wrapper loads the shared
 * catalogue/copy/settings and tells the storefront which view to show, so each
 * route is a real URL without duplicating the data read five times.
 */
export default async function StorefrontRoute({
  view,
  collection,
}: {
  view: 'home' | 'shop' | 'about' | 'fitting' | 'contact'
  /** Opens the shop on a single collection, e.g. THRIFT. */
  collection?: string
}) {
  const { products, lookbook, settings, content } = await loadStorefront()

  return (
    <Storefront
      products={products}
      lookbook={lookbook}
      social={settings.social}
      contactEmail={settings.contactEmail}
      bankDetails={settings.bankDetails}
      content={content}
      initialView={view}
      initialCollection={collection}
    />
  )
}
