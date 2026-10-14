import { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

/**
 * Robots.txt configuration — allows all search engines to crawl the site.
 * Points to the dynamic sitemap for optimal indexing.
 *
 * The origin comes from NEXT_PUBLIC_SITE_URL (see lib/site.ts), so the sitemap
 * line always names the domain this build is actually served from.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/login'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}