import { createClient, isSupabaseConfigured } from '@/lib/supabase/server'
import type {
  BankDetails,
  CheckoutInput,
  Order,
  OrderItem,
  OrderStatus,
  OrderType,
  PaymentMethod,
  PaymentStatus,
} from './types'

/**
 * Full read — requires scripts/sql/orders-payment.sql (payment columns, items
 * and the bank-details snapshot).
 */
const SELECT =
  'id, reference, customer, email, phone, address, note, product, status, payment_status, payment_method, bank_details, items, subtotal, shipping, total, currency, type, qty, created_at'

/**
 * What the console read before the bank-transfer phase. listOrders falls back
 * to this when the migration has not been applied yet, so an unmigrated
 * database still shows its orders instead of taking /admin/orders down.
 */
const LEGACY_SELECT = 'id, reference, customer, email, product, status, total, currency, type, qty, created_at'

type OrderRow = {
  id: number
  reference: string
  customer: string
  email: string | null
  phone?: string | null
  address?: string | null
  note?: string | null
  product: string | null
  status: string
  payment_status?: string | null
  payment_method?: string | null
  bank_details?: BankDetails | null
  items?: OrderItem[] | null
  subtotal?: number | string | null
  shipping?: number | string | null
  total: number | string
  currency: string
  type: string
  qty: number
  created_at: string
}

function toOrder(row: OrderRow): Order {
  const total = Number(row.total)
  return {
    id: Number(row.id),
    reference: row.reference,
    customer: row.customer,
    email: row.email,
    phone: row.phone ?? null,
    address: row.address ?? null,
    note: row.note ?? null,
    product: row.product,
    status: row.status as OrderStatus,
    // A row written before the payment columns existed has never been settled
    // through this flow — pending-payment is the truthful reading of it, and
    // the atelier can still mark it paid from the order list.
    paymentStatus: (row.payment_status as PaymentStatus) ?? 'pending-payment',
    paymentMethod: (row.payment_method as PaymentMethod) ?? 'bank-transfer',
    bankDetails: row.bank_details ?? null,
    items: row.items ?? [],
    subtotal: row.subtotal === undefined || row.subtotal === null ? total : Number(row.subtotal),
    shipping: row.shipping === undefined || row.shipping === null ? 0 : Number(row.shipping),
    total,
    currency: row.currency,
    type: row.type as OrderType,
    qty: row.qty,
    createdAt: row.created_at,
  }
}

/**
 * Admin order feed. `type` narrows to the wholesale book, which reuses the
 * same table with different pricing rules rather than a parallel flow.
 */
export async function listOrders(type?: OrderType): Promise<Order[]> {
  if (!isSupabaseConfigured()) return []
  const supabase = await createClient()

  const read = async (columns: string) => {
    let query = supabase.from('orders').select(columns).order('created_at', { ascending: false })
    if (type) query = query.eq('type', type)
    return query
  }

  const full = await read(SELECT)
  if (!full.error) return (full.data as unknown as OrderRow[]).map(toOrder)

  const legacy = await read(LEGACY_SELECT)
  if (legacy.error) throw new Error(`listOrders: ${legacy.error.message}`)
  console.warn(
    'listOrders: reading the pre-payment columns. Run scripts/sql/orders-payment.sql to store the bank-transfer fields.',
    full.error.message,
  )
  return (legacy.data as unknown as OrderRow[]).map(toOrder)
}

/**
 * A reference a client can quote in the bank app: AVW-<date>-<suffix>.
 * Generated here rather than by the database so the checkout page can show the
 * number immediately without needing the row back — which matters, because
 * there is no anon SELECT policy on `orders`.
 */
export function newOrderReference(): string {
  const now = new Date()
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `AVW-${date}-${suffix}`
}

/** Human summary for the admin table's existing Product column. */
function summarise(items: OrderItem[]): string | null {
  if (!items.length) return null
  const [first] = items
  return items.length === 1 ? first.name : `${first.name} +${items.length - 1} more`
}

/**
 * Write the order. No payment provider is called — payment happens by bank
 * transfer — so the row is created 'pending-payment' and stays that way,
 * indefinitely, until the atelier confirms the transfer and marks it paid.
 *
 * The insert deliberately does not call .select(): the storefront has no anon
 * read policy on `orders` (a shopper must never be able to read another
 * shopper's order), and the checkout route already knows the reference, the
 * totals and the bank details it stored.
 */
export async function createOrder(input: CheckoutInput): Promise<{ reference: string }> {
  if (!isSupabaseConfigured()) throw new Error('createOrder: Supabase is not configured')
  const supabase = await createClient()

  const row = {
    reference: newOrderReference(),
    customer: input.customer.name,
    email: input.customer.email,
    phone: input.customer.phone,
    address: input.customer.address,
    note: input.customer.note,
    product: summarise(input.items),
    status: 'Processing' satisfies OrderStatus,
    payment_status: 'pending-payment' satisfies PaymentStatus,
    payment_method: 'bank-transfer' satisfies PaymentMethod,
    bank_details: input.bankDetails,
    items: input.items,
    subtotal: input.subtotal,
    shipping: input.shipping,
    total: input.total,
    currency: input.currency,
    type: 'retail' satisfies OrderType,
    qty: input.items.reduce((total, item) => total + item.qty, 0),
  }

  const { error } = await supabase.from('orders').insert(row)
  if (!error) return { reference: row.reference }

  // 23505 = unique_violation on the reference. Retry once with a fresh suffix
  // rather than losing a real order to a one-in-a-million collision.
  if (error.code === '23505') {
    const retry = { ...row, reference: newOrderReference() }
    const second = await supabase.from('orders').insert(retry)
    if (!second.error) return { reference: retry.reference }
    throw new Error(`createOrder: ${second.error.message}`)
  }

  throw new Error(`createOrder: ${error.message}`)
}

/**
 * The atelier confirms the transfer landed, then clicks once:
 * paymentStatus → paid AND orderStatus → Processing. One click, because
 * "the money is in" and "start making it" are the same moment in a one-woman
 * atelier; her status dropdown still allows any other combination afterwards.
 * (Flagged with the client: split into two clicks if she prefers.)
 */
export async function markOrderPaid(id: number): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('orders')
    .update({ payment_status: 'paid', status: 'Processing' })
    .eq('id', id)
  if (error) throw new Error(`markOrderPaid: ${error.message}`)
}

export async function updateOrderStatus(id: number, status: OrderStatus): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('orders').update({ status }).eq('id', id)
  if (error) throw new Error(`updateOrderStatus: ${error.message}`)
}

export async function updateOrderQuantity(id: number, qty: number): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('orders').update({ qty }).eq('id', id)
  if (error) throw new Error(`updateOrderQuantity: ${error.message}`)
}
