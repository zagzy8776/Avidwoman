import { MetadataRoute } from 'next'
import { listProducts } from '@/lib/data/products'
import { SITE_URL } from '@/lib/site'

/**
 * Dynamic sitemap generator — includes all public pages plus every active product.
 * Optimized for Nigerian search engines with city-specific keywords.
 *
 * The origin comes from NEXT_PUBLIC_SITE_URL (see lib/site.ts), so a Vercel
 * preview and the live domain each publish their own correct URLs.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_URL
  
  // Get all active (non-archived) products
  const products = await listProducts()
  const activeProducts = products.filter(p => !p.archived)

  // Static pages with priority
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/shop`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/fitting`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ]

  // Dynamic product pages
  const productPages: MetadataRoute.Sitemap = activeProducts.map((product) => ({
    url: `${baseUrl}/?product=${product.id}`,
    lastModified: new Date(product.createdAt),
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  return [...staticPages, ...productPages]
}