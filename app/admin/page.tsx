import Link from 'next/link'
import SetupNotice from '@/components/admin/setup-notice'
import { listOrders } from '@/lib/data/orders'
import { listProducts } from '@/lib/data/products'
import { money } from '@/lib/format'
import { isSupabaseConfigured } from '@/lib/supabase/server'

export default async function AdminOverviewPage() {
  if (!isSupabaseConfigured()) {
    return (
      <>
        <header className="admin-header">
          <div>
            <p className="eyebrow">ADMINISTRATION</p>
            <h1>Overview</h1>
          </div>
        </header>
        <SetupNotice area="the overview" />
      </>
    )
  }

  const [products, orders] = await Promise.all([listProducts(), listOrders()])
  const revenue = orders.reduce((sum, order) => sum + order.total, 0)
  const wholesale = orders.filter((order) => order.type === 'wholesale').length
  const lowStock = products.filter((product) => product.inventory < 12).length
  const customers = new Set(orders.map((order) => order.customer)).size

  const metrics: Array<[string, string, string]> = [
    ['Revenue', money(revenue), `${orders.length} orders logged`],
    ['Orders', String(orders.length), `${wholesale} wholesale`],
    ['Products', String(products.length), `${lowStock} low stock`],
    ['Customers', String(customers), 'unique buyers'],
  ]

  return (
    <>
      <header className="admin-header">
        <div>
          <p className="eyebrow">ADMINISTRATION</p>
          <h1>Overview</h1>
        </div>
        <Link className="gold-button" href="/admin/products/new">
          + Add product
        </Link>
      </header>

      <div className="metric-grid">
        {metrics.map(([label, value, delta]) => (
          <article className="metric-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{delta}</small>
          </article>
        ))}
      </div>

      <article className="orders-table">
        <div className="card-head">
          <span>Recent orders</span>
          <Link href="/admin/orders">View all orders</Link>
        </div>
        <div className="table-row table-head">
          <span>Order</span>
          <span>Customer</span>
          <span>Product</span>
          <span>Status</span>
          <span>Total</span>
        </div>
        {orders.slice(0, 6).map((order) => (
          <div className="table-row" key={order.id}>
            <span>{order.reference}</span>
            <span>{order.customer}</span>
            <span>{order.product ?? '—'}</span>
            <span className="status">{order.status}</span>
            <span>{money(order.total)}</span>
          </div>
        ))}
        {orders.length === 0 ? (
          <div className="empty-state" style={{ marginTop: 18 }}>
            No orders yet. Run <code>supabase/schema.sql</code> to load the seed catalogue, then
            place a test order or add one from <Link href="/admin/orders">Orders</Link>.
          </div>
        ) : null}
      </article>
    </>
  )
}
