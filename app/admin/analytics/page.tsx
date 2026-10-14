import SetupNotice from '@/components/admin/setup-notice'
import { listOrders } from '@/lib/data/orders'
import { money } from '@/lib/format'
import { isSupabaseConfigured } from '@/lib/supabase/server'

export default async function AdminAnalyticsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <>
        <Header />
        <SetupNotice area="analytics" />
      </>
    )
  }

  const orders = await listOrders()
  const wholesale = orders.filter((order) => order.type === 'wholesale')
  const retail = orders.filter((order) => order.type === 'retail')

  const sum = (rows: typeof orders) => rows.reduce((total, order) => total + order.total, 0)
  const peak = Math.max(1, ...orders.map((order) => order.total))
  const bars = [...orders].slice(0, 12).reverse()

  return (
    <>
      <Header />

      <div className="metric-grid">
        {(
          [
            ['Total revenue', money(sum(orders)), `${orders.length} orders`],
            ['Retail', money(sum(retail)), `${retail.length} orders`],
            ['Wholesale', money(sum(wholesale)), `${wholesale.length} orders`],
            [
              'Avg. order',
              money(orders.length ? Math.round(sum(orders) / orders.length) : 0),
              'per order',
            ],
          ] as Array<[string, string, string]>
        ).map(([label, value, delta]) => (
          <article className="metric-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{delta}</small>
          </article>
        ))}
      </div>

      <div className="admin-grid">
        <article className="chart-card">
          <div className="card-head">
            <div>
              <span>Order values</span>
              <strong>{money(sum(orders))}</strong>
            </div>
            <span>{wholesale.length} wholesale</span>
          </div>
          <div className="bar-chart">
            {bars.map((order) => (
              <i key={order.id} style={{ height: `${Math.max(4, (order.total / peak) * 100)}%` }} />
            ))}
          </div>
          <div className="chart-labels">
            <span>oldest</span>
            <span>most recent</span>
          </div>
        </article>

        <article className="activity-card">
          <div className="card-head">
            <span>Top orders</span>
          </div>
          {[...orders]
            .sort((a, b) => b.total - a.total)
            .slice(0, 5)
            .map((order) => (
              <div className="activity-row" key={order.id}>
                <i />
                <span>
                  <strong>
                    {order.reference} · {order.customer}
                  </strong>
                  <small>{order.type}</small>
                </span>
                <b>{money(order.total)}</b>
              </div>
            ))}
        </article>
      </div>
    </>
  )
}

function Header() {
  return (
    <header className="admin-header">
      <div>
        <p className="eyebrow">PERFORMANCE</p>
        <h1>Analytics</h1>
      </div>
    </header>
  )
}
