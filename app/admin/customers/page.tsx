import Link from 'next/link'
import SetupNotice from '@/components/admin/setup-notice'
import { listOrders } from '@/lib/data/orders'
import { money } from '@/lib/format'
import { isSupabaseConfigured } from '@/lib/supabase/server'

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export default async function AdminCustomersPage() {
  if (!isSupabaseConfigured()) {
    return (
      <>
        <Header />
        <SetupNotice area="customers" />
      </>
    )
  }

  const orders = await listOrders()
  const directory = new Map<
    string,
    { name: string; email: string | null; orders: number; spend: number }
  >()

  for (const order of orders) {
    const current = directory.get(order.customer) ?? {
      name: order.customer,
      email: order.email,
      orders: 0,
      spend: 0,
    }
    current.orders += 1
    current.spend += order.total
    current.email = current.email ?? order.email
    directory.set(order.customer, current)
  }

  const customers = [...directory.values()].sort((a, b) => b.spend - a.spend)

  return (
    <>
      <Header />

      <article className="management-panel">
        <div className="card-head">
          <span>Customer directory</span>
          <span>{customers.length} customers</span>
        </div>

        <div className="customer-list">
          {customers.map((customer) => (
            <div className="customer-row" key={customer.name}>
              <i>{initials(customer.name)}</i>
              <span>
                <strong>{customer.name}</strong>
                <small>{customer.email ?? '—'}</small>
              </span>
              <b>{customer.orders} orders</b>
              <em>{money(customer.spend)}</em>
              <Link href="/admin/orders">View orders</Link>
            </div>
          ))}

          {customers.length === 0 ? (
            <div className="empty-state">No customers yet — they appear once orders exist.</div>
          ) : null}
        </div>
      </article>
    </>
  )
}

function Header() {
  return (
    <header className="admin-header">
      <div>
        <p className="eyebrow">CRM</p>
        <h1>Customers</h1>
      </div>
    </header>
  )
}
