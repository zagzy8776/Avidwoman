import { MetadataRoute } from 'next'
import { headers } from 'next/headers'
import { SITE_URL } from '@/lib/site'

/**
 * The origin robots.txt should publish.
 *
 * Same reasoning as the sitemap: the Sitemap line has to name a file on the host
 * that served this file, or a crawler cannot follow it. The request host wins
 * unless NEXT_PUBLIC_SITE_URL is explicitly configured.
 */
async function resolveOrigin(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return SITE_URL

  try {
    const requestHeaders = await headers()
    const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host')
    if (host) {
      const proto = requestHeaders.get('x-forwarded-proto') ?? 'https'
      return `${proto}://${host}`
    }
  } catch {
    // headers() is not available in every rendering context; fall through.
  }

  return SITE_URL
}

/**
 * Robots.txt configuration — allows all search engines to crawl the site and
 * points them at the sitemap.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const origin = await resolveOrigin()

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/login'],
    },
    sitemap: `${origin}/sitemap.xml`,
  }
}