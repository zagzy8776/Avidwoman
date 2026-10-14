import { MetadataRoute } from 'next'

/**
 * Robots.txt configuration — allows all search engines to crawl the site.
 * Points to the dynamic sitemap for optimal indexing.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/login'],
    },
    sitemap: 'https://avidwomanvogue.com/sitemap.xml',
  }
}