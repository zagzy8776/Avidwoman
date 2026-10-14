import { MetadataRoute } from 'next'
import { serverOrigin } from '@/lib/server-origin'

/**
 * Robots.txt — allows all search engines to crawl the site and points them at
 * the sitemap.
 *
 * The Sitemap line has to name a file on the host that served this one, so the
 * origin comes from lib/server-origin rather than a hard-coded domain.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const origin = await serverOrigin()

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/login'],
    },
    sitemap: `${origin}/sitemap.xml`,
  }
}