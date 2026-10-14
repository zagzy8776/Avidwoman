import { NextResponse } from 'next/server'
import { listProducts } from '@/lib/data/products'
import { getSettings } from '@/lib/data/settings'
import { createOrder, newOrderReference } from '@/lib/data/orders'
import { isSupabaseConfigured } from '@/lib/supabase/server'
import {
  FLAT_SHIPPING,
  hasBankDetails,
  type BankDetails,
  type CheckoutCustomer,
  type CheckoutInput,
  type OrderItem,
} from '@/lib/data/types'

/**
 * POST /api/checkout — place an order for manual bank transfer.
 *
 * No payment provider is called and nothing is charged: the order is written
 * with paymentStatus 'pending-payment' plus a SNAPSHOT of the bank details the
 * customer was shown, and the confirmation screen hands her the reference and
 * the total to transfer. The atelier marks it paid later.
 *
 * PRICES ARE RESOLVED SERVER-SIDE. The browser sends what it thinks each line
 * costs and that is ignored: every unit price, the subtotal and the total are
 * read from the catalogue here, so a tampered bag cannot invent a price.
 *
 * With no Supabase configured the route logs the payload and answers with a
 * stub reference, so the checkout UI can be reviewed before the backend lands.
 */
export const runtime = 'nodejs'

type IncomingItem = {
  productId?: unknown
  variantId?: unknown
  size?: unknown
  qty?: unknown
}

type IncomingBody = {
  customer?: Partial<CheckoutCustomer>
  items?: IncomingItem[]
  /** Only read on the log-only stub path (no database) — never trusted for a real order. */
  subtotal?: unknown
}

function bad(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status })
}

export async function POST(request: Request) {
  let body: IncomingBody
  try {
    body = (await request.json()) as IncomingBody
  } catch {
    return bad('We could not read that order. Please try again.')
  }

  const customer: CheckoutCustomer = {
    name: String(body.customer?.name ?? '').trim(),
    email: String(body.customer?.email ?? '').trim(),
    phone: String(body.customer?.phone ?? '').trim() || null,
    address: String(body.customer?.address ?? '').trim(),
    note: String(body.customer?.note ?? '').trim() || null,
  }

  if (!customer.name || !customer.email || !customer.address) {
    return bad('We need your name, email and delivery address before we can take the order.')
  }

  const incoming = Array.isArray(body.items) ? body.items : []
  if (incoming.length === 0) {
    return bad('Your bag is empty — nothing to order yet.')
  }

  const settings = await getSettings()
  const bankDetails: BankDetails | null = hasBankDetails(settings.bankDetails) ? settings.bankDetails : null

  /* ----------------------------------------------------------------
     No database yet: log the order and answer with a stub reference.
     TODO(backend): this branch disappears the moment Supabase is
     configured — createOrder below is the real path.
  ---------------------------------------------------------------- */
  if (!isSupabaseConfigured()) {
    const reference = newOrderReference()
    // The stub echoes the bag's own numbers back so the review build's
    // confirmation screen reads sensibly. This is NOT a total anyone is
    // charged: the real path below re-resolves every price from the catalogue.
    const stubSubtotal = Number(body.subtotal) || 0
    console.log('[checkout] stub — Supabase is not configured, so this order was only logged:', {
      reference,
      customer,
      items: incoming,
      currency: settings.currency,
      bankDetails,
    })
    return NextResponse.json({
      ok: true,
      stub: true,
      reference,
      subtotal: stubSubtotal,
      shipping: FLAT_SHIPPING,
      total: stubSubtotal + FLAT_SHIPPING,
      currency: settings.currency,
      bankDetails,
    })
  }

  // Resolve every line against the live catalogue.
  let products
  try {
    products = await listProducts()
  } catch (error) {
    console.error('[checkout] could not read the catalogue', error)
    return bad('We could not reach the atelier just now. Your bag is safe — please try again.', 503)
  }

  const items: OrderItem[] = []
  for (const line of incoming) {
    const productId = Number(line.productId)
    const product = products.find((candidate) => candidate.id === productId)
    if (!product) return bad('One of the pieces in your bag is no longer in the collection.')

    // Wholesale / bulk pieces are an enquiry, not a checkout order.
    if (product.inquiryOnly) {
      return bad(`${product.name} is ordered by enquiry — email the atelier and we will quote you.`)
    }

    const variantId = line.variantId === null || line.variantId === undefined ? null : Number(line.variantId)
    const variant = variantId
      ? product.variants.find((candidate) => candidate.id === variantId && !candidate.hidden)
      : undefined
    if (variantId && !variant) return bad('One of the colours in your bag is no longer available.')

    const size = String(line.size ?? '').trim()
    const offered = variant?.sizes.length ? variant.sizes : ['XS', 'S', 'M', 'L', 'XL']
    if (!offered.includes(size)) return bad(`Size ${size || '—'} is not offered in that colour.`)

    const qty = Math.max(1, Math.min(99, Math.floor(Number(line.qty) || 1)))
    items.push({
      productId: product.id,
      variantId: variant?.id ?? null,
      name: product.name,
      collection: product.collection,
      colorName: variant?.colorName ?? null,
      colorHex: variant?.colorHex ?? null,
      size,
      qty,
      // The price comes from here, never from the request body.
      unitPrice: variant?.price ?? product.price,
      image: variant?.images[0] ?? product.image,
    })
  }

  const subtotal = items.reduce((total, item) => total + item.unitPrice * item.qty, 0)
  // Complimentary delivery, and no duty/tax line: no rate has been agreed, so
  // none is charged rather than one being invented (see FLAT_SHIPPING).
  const shipping = FLAT_SHIPPING
  const total = subtotal + shipping

  const input: CheckoutInput = {
    customer,
    items,
    subtotal,
    shipping,
    total,
    currency: settings.currency,
    bankDetails,
  }

  try {
    const { reference } = await createOrder(input)
    return NextResponse.json({
      ok: true,
      stub: false,
      reference,
      subtotal,
      shipping,
      total,
      currency: settings.currency,
      bankDetails,
    })
  } catch (error) {
    console.error('[checkout] the order could not be saved', error, input)
    return bad(
      'We could not save that order just now, and we would rather not lose it. Try again, or email the atelier your bag and we will take it by hand.',
      500,
    )
  }
}

