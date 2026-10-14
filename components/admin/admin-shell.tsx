'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { signOut } from '@/app/login/actions'

const NAV = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/fittings', label: 'Fittings' },
  { href: '/admin/customers', label: 'Customers' },
  { href: '/admin/content', label: 'Media' },
  { href: '/admin/content/page-copy', label: 'Page copy' },
  { href: '/admin/analytics', label: 'Analytics' },
  { href: '/admin/settings', label: 'Settings' },
]

/**
 * Admin shell — reuses the existing .admin-shell / .admin-sidebar / .admin-nav
 * brand styling from avid-styles.css. Navigation is real routes now, not a
 * view switch inside the storefront.
 */
export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <Link href="/" className="wordmark" aria-label="Back to the storefront">
          <span>AVID WOMAN</span>
          <small>VOGUE</small>
        </Link>

        <nav className="admin-nav" aria-label="Admin sections">
          {NAV.map((item) => {
            // A section is active when the path matches it, but a longer entry
            // that shares the prefix (/admin/content/page-copy) owns the match —
            // otherwise two items would light up at once.
            const active =
              item.href === '/admin'
                ? pathname === '/admin'
                : pathname.startsWith(item.href) &&
                  !NAV.some(
                    (other) => other.href !== item.href && other.href.startsWith(item.href) && pathname.startsWith(other.href),
                  )
            return (
              <Link key={item.href} href={item.href} className={active ? 'active' : ''}>
                <i />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="admin-profile">
          <span>AM</span>
          <div>
            <strong>Amara Moore</strong>
            <small>Administrator</small>
          </div>
        </div>

        <form action={signOut} style={{ marginTop: 18 }}>
          <button type="submit" className="outline-button">
            Sign out
          </button>
        </form>
      </aside>

      <section className="admin-main">{children}</section>
    </main>
  )
}
