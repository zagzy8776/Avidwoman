import StorefrontRoute from '@/components/storefront-route'

/**
 * The storefront reads Supabase through the cookie-aware server client, so it
 * can never be prerendered at build time — Next.js would try, hit
 * DYNAMIC_SERVER_USAGE, and fail the build. Rendering per request is also what
 * the shop wants: an edit in /admin shows up on the next visit, with no
 * rebuild and no stale catalogue.
 */
export const dynamic = 'force-dynamic'

// The storefront stays a single client component; StorefrontRoute is the shell
// that loads the shared catalogue/copy/settings and tells it which page to open.
//
// The other public pages (/shop, /about, /fitting, /contact, /thrift,
// /locations, /product/[id]) are real routes that render the same component
// with a different opening view.
export default function HomePage() {
  return <StorefrontRoute view="home" />
}

