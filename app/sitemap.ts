import { MetadataRoute } from 'next'
import { listProducts } from '@/lib/data/products'
import { SITE_URL } from '@/lib/site'

/**
 * The sitemap reads the catalogue through the cookie-aware server client, so it
 * must render per request rather than be frozen at build time.
 */
export const dynamic = 'force-dynamic'

/**
 * Dynamic sitemap — every public page plus one entry per active product.
 *
 * Every URL here is a real route. The storefront is one client component, but
 * /shop, /about, /fitting, /contact and /thrift are thin routes that open it on
 * the right page, so a crawler can reach and index each of them.
 *
 * The origin comes from NEXT_PUBLIC_SITE_URL (see lib/site.ts), so a Vercel
 * preview and the live domain each publish their own correct URLs.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_URL
  const now = new Date()

  // A brief database outage must not 500 the sitemap — Google would read that as
  // the whole site being gone. Without the catalogue the static pages are still
  // listed, and the products return on the next crawl.
  const products = await listProducts().catch((error) => {
    console.warn('sitemap: could not read the catalogue, listing pages only.', error)
    return []
  })
  const activeProducts = products.filter((p) => !p.archived)

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${baseUrl}/shop`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/thrift`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/fitting`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
  ]

  // Product pages. Each piece has a real /product/[id] route, so the schema and
  // title are in the HTML a crawler reads rather than behind client-side state.
  const productPages: MetadataRoute.Sitemap = activeProducts.map((product) => ({
    url: `${baseUrl}/product/${product.id}`,
    lastModified: new Date(product.createdAt),
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  return [...staticPages, ...productPages]
}