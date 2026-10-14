import AdminShell from '@/components/admin/admin-shell'

/**
 * Every admin screen reads Supabase through the cookie-aware server client, so
 * the whole area renders per request. Declaring it here covers all nested
 * routes in one line, and stops the build trying to prerender pages that need
 * a signed-in session.
 */
export const dynamic = 'force-dynamic'

export const metadata = { title: 'Admin — AVID WOMAN VOGUE' }

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>
}
