/**
 * The public address of this deployment.
 *
 * Read from NEXT_PUBLIC_SITE_URL so the same build works on a Vercel preview
 * URL, a vercel.app domain and the live custom domain without a code change.
 * Set it in Vercel → Settings → Environment Variables.
 *
 * The fallback is the live domain, so a build with the variable missing still
 * emits correct canonical / Open Graph / sitemap URLs rather than localhost.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://avidwomanvogue.com'
).replace(/\/+$/, '')

/** Absolute URL for a path, e.g. absoluteUrl('/shop') -> "https://…/shop". */
export function absoluteUrl(path = '/'): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}