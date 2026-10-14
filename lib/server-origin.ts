import { headers } from 'next/headers'

/**
 * The origin this deployment is actually served from — server side only.
 *
 * WHY THIS EXISTS: a canonical tag or a sitemap entry that names a domain which
 * does not serve the content is worse than having none at all. It tells Google
 * "the real copy of this page lives elsewhere", Google goes looking, finds
 * nothing, and can drop the page from the index entirely.
 *
 * That is exactly what was happening before the domain existed: every page
 * declared https://avidwomanvogue.com as its canonical while being served from
 * avidwoman.vercel.app.
 *
 * Resolution order, first match wins:
 *   1. NEXT_PUBLIC_SITE_URL  — set this once the real domain is connected.
 *   2. VERCEL_PROJECT_PRODUCTION_URL — Vercel's own production domain.
 *   3. VERCEL_URL            — the specific deployment (previews included).
 *   4. The request host      — whatever actually served this response.
 *   5. localhost             — development.
 *
 * Server-only: `next/headers` cannot be imported into a client component, so the
 * storefront reads its origin from the document instead.
 */
export async function serverOrigin(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, '')
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  try {
    const requestHeaders = await headers()
    const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host')
    if (host) {
      const proto = requestHeaders.get('x-forwarded-proto') ?? 'https'
      return `${proto}://${host}`
    }
  } catch {
    // headers() is unavailable outside a request scope; fall through.
  }

  return 'http://localhost:3001'
}
