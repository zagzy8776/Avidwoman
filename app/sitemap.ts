import { MetadataRoute } from 'next'
import { LOCATIONS } from '@/lib/data/locations'
import { listProducts } from '@/lib/data/products'
import { serverOrigin } from '@/lib/server-origin'

/**
 * The sitemap reads the catalogue through the cookie-aware server client, so it
 * must render per request rather than be frozen at build time.
 */
export const dynamic = 'force-dynamic'

/**
 * Dynamic sitemap — every public page, every active product, and every city we
 * deliver to. Every URL here is a real route.
 *
 * The origin comes from lib/server-origin, which follows the host actually
 * serving this file. Google rejects every entry in a sitemap whose URLs do not
 * sit under that host ("This url is not allowed for a Sitemap at this
 * location"), which is what happened while the site ran on a vercel.app address
 * and the file listed a domain that did not exist yet.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = await serverOrigin()
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

  // Service-area pages, one per city we deliver to. Each carries its own
  // delivery window, measuring route and local note, so they are genuinely
  // different pages rather than one template with the city swapped.
  const locationPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/locations`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    ...LOCATIONS.map((place) => ({
      url: `${baseUrl}/locations/${place.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ]

  return [...staticPages, ...productPages, ...locationPages]
}