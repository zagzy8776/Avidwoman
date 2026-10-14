import Link from 'next/link'
import { markOrderPaid, setOrderQuantity, setOrderStatus } from '@/app/admin/actions'
import SetupNotice from '@/components/admin/setup-notice'
import { listOrders } from '@/lib/data/orders'
import { money } from '@/lib/format'
import {
  ORDER_STATUSES,
  ORDER_TYPES,
  PAYMENT_STATUSES,
  PAYMENT_STATUS_LABELS,
  type OrderType,
  type PaymentStatus,
} from '@/lib/data/types'
import { isSupabaseConfigured } from '@/lib/supabase/server'

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; status?: string; payment?: string }>
}) {
  const params = await searchParams

  if (!isSupabaseConfigured()) {
    return (
      <>
        <Header />
        <SetupNotice area="orders" />
      </>
    )
  }

  const typeFilter = (ORDER_TYPES as readonly string[]).includes(params.type ?? '')
    ? (params.type as OrderType)
    : undefined
  const statusFilter = params.status ?? ''
  const paymentFilter = (PAYMENT_STATUSES as readonly string[]).includes(params.payment ?? '')
    ? (params.payment as PaymentStatus)
    : undefined

  const all = await listOrders(typeFilter)
  const orders = all
    .filter((order) => (statusFilter ? order.status === statusFilter : true))
    .filter((order) => (paymentFilter ? order.paymentStatus === paymentFilter : true))

  /** One place that builds a filter link, so no chip ever drops another filter. */
  const link = (next: { type?: string; status?: string; payment?: string }) => {
    const search = new URLSearchParams()
    const type = next.type === undefined ? typeFilter : next.type
    const status = next.status === undefined ? statusFilter : next.status
    const payment = next.payment === undefined ? paymentFilter : next.payment
    if (type) search.set('type', type)
    if (status) search.set('status', status)
    if (payment) search.set('payment', payment)
    const value = search.toString()
    return `/admin/orders${value ? `?${value}` : ''}`
  }

  /** The day's job list: everything the bank app has not settled yet. */
  const awaitingPayment = all.filter((order) => order.paymentStatus !== 'paid').length

  return (
    <>
      <Header />

      <div className="admin-toolbar">
        <Link className={typeFilter ? '' : 'active'} href={link({ type: '' })}>
          All orders
        </Link>
        <Link className={typeFilter === 'retail' ? 'active' : ''} href={link({ type: 'retail' })}>
          Retail
        </Link>
        <Link
          className={typeFilter === 'wholesale' ? 'active' : ''}
          href={link({ type: 'wholesale' })}
        >
          Wholesale
        </Link>
        <Link className={statusFilter ? '' : 'active'} href={link({ status: '' })}>
          Any status
        </Link>
        {ORDER_STATUSES.map((status) => (
          <Link
            key={status}
            className={statusFilter === status ? 'active' : ''}
            href={link({ status })}
          >
            {status}
          </Link>
        ))}
      </div>

      {/* Payment gets its own row: it is the thing she actually works through,
          and the count is the day's job list. Orders sit here indefinitely —
          nothing expires or cancels them. */}
      <div className="admin-toolbar">
        <span className="admin-toolbar-label">
          Payment{awaitingPayment ? ` · ${awaitingPayment} awaiting` : ''}
        </span>
        <Link className={paymentFilter ? '' : 'active'} href={link({ payment: '' })}>
          Any payment
        </Link>
        {PAYMENT_STATUSES.map((status) => (
          <Link
            key={status}
            className={paymentFilter === status ? 'active' : ''}
            href={link({ payment: status })}
          >
            {PAYMENT_STATUS_LABELS[status]}
          </Link>
        ))}
      </div>

      <article className="orders-table expanded-table">
        <div className="table-row table-head">
          <span>Order</span>
          <span>Customer</span>
          <span>Product</span>
          <span>Payment</span>
          <span>Status</span>
          <span>Total</span>
        </div>

        {orders.map((order) => (
          <div className="table-row" key={order.id}>
            <span>
              {order.reference}
              <small style={{ display: 'block', color: 'var(--brand-muted)', fontSize: 6 }}>
                {order.type}
              </small>
            </span>
            <span>
              {order.customer}
              {order.email ? <small className="order-meta">{order.email}</small> : null}
              {order.phone ? <small className="order-meta">{order.phone}</small> : null}
              {order.address ? <small className="order-meta">{order.address}</small> : null}
              {order.note ? <small className="order-meta is-note">“{order.note}”</small> : null}
            </span>
            <span>
              {order.product ?? '—'}
              {/* Colour, size and quantity per line: without them she cannot
                  pick the right piece off the rail. The name is prefixed only
                  when there is more than one line. */}
              {order.items.length > 0 ? (
                <small className="order-meta">
                  {order.items
                    .map((item) =>
                      order.items.length === 1
                        ? `${item.colorName ?? 'house colour'} · ${item.size} ×${item.qty}`
                        : `${item.name} · ${item.colorName ?? 'house colour'} · ${item.size} ×${item.qty}`,
                    )
                    .join(' / ')}
                </small>
              ) : null}
              {order.type === 'wholesale' ? (
                <form className="qty-form" action={setOrderQuantity}>
                  <input type="hidden" name="id" value={order.id} />
                  <input
                    type="number"
                    name="qty"
                    min="1"
                    defaultValue={order.qty}
                    aria-label={`Bulk quantity for ${order.reference}`}
                  />
                  <button type="submit">Set qty</button>
                </form>
              ) : null}
            </span>
            <span className="payment-cell">
              <span
                className={`payment-badge ${
                  order.paymentStatus === 'paid'
                    ? 'is-paid'
                    : order.paymentStatus === 'refunded'
                      ? 'is-refunded'
                      : 'is-pending'
                }`}
              >
                {PAYMENT_STATUS_LABELS[order.paymentStatus]}
              </span>
              {order.paymentStatus !== 'paid' ? (
                <form className="status-form" action={markOrderPaid}>
                  <input type="hidden" name="id" value={order.id} />
                  {/* One click: paid + Processing together. Her status dropdown
                      below still allows any other combination. */}
                  <button type="submit">Mark as paid</button>
                </form>
              ) : null}
              {/* The account the customer was told to pay into, frozen at order
                  time — the record she matches against her bank app. */}
              {order.bankDetails ? (
                <small className="order-meta">
                  into {order.bankDetails.bankName} · {order.bankDetails.accountNumber}
                </small>
              ) : null}
            </span>
            <span>
              <form className="status-form" action={setOrderStatus}>
                <input type="hidden" name="id" value={order.id} />
                <select
                  className="status-select"
                  name="status"
                  defaultValue={order.status}
                  aria-label={`Status for ${order.reference}`}
                >
                  {ORDER_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <button type="submit">Save</button>
              </form>
            </span>
            <span>{money(order.total)}</span>
          </div>
        ))}

        {orders.length === 0 ? (
          <div className="empty-state" style={{ marginTop: 18 }}>
            No orders match this filter. Run <code>supabase/schema.sql</code> to seed the catalogue,
            then place a test order.
          </div>
        ) : null}
      </article>
    </>
  )
}

function Header() {
  return (
    <header className="admin-header">
      <div>
        <p className="eyebrow">COMMERCE</p>
        <h1>Orders</h1>
      </div>
    </header>
  )
}
