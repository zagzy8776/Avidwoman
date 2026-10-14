'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createProduct, deleteProduct, updateProduct } from '@/lib/data/products'
import { updateContentBlock } from '@/lib/data/content'
import { syncProductVariants } from '@/lib/data/variants'
import { markOrderPaid as markOrderPaidRecord, updateOrderQuantity, updateOrderStatus } from '@/lib/data/orders'
import { updateFrameImage } from '@/lib/data/lookbook'
import { updateSettings } from '@/lib/data/settings'
import { setSlotImage } from '@/lib/data/media'
import { updateFittingStatus } from '@/lib/data/fittings'
import {
  CONTENT_BLOCK_KEYS,
  FABRICS,
  FITTING_STATUSES,
  ORDER_STATUSES,
  type ContentKey,
  type Fabric,
  type FittingStatus,
  type OrderStatus,
  type ProductVariantInput,
} from '@/lib/data/types'

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '').trim()
}

function nullable(formData: FormData, key: string): string | null {
  const value = text(formData, key)
  return value.length ? value : null
}

function num(formData: FormData, key: string, fallback = 0): number {
  const value = Number(formData.get(key))
  return Number.isFinite(value) ? value : fallback
}

function readProductInput(formData: FormData) {
  const fabricRaw = text(formData, 'fabric')
  const fabric = (FABRICS as readonly string[]).includes(fabricRaw) ? (fabricRaw as Fabric) : null

  // Related pieces arrive from the multi-select as one id per selected option.
  const relatedIds = formData
    .getAll('relatedIds')
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0)

  return {
    name: text(formData, 'name'),
    collection: text(formData, 'collection'),
    price: num(formData, 'price'),
    currency: text(formData, 'currency') || 'USD',
    image: text(formData, 'image'),
    alt: text(formData, 'alt'),
    tag: nullable(formData, 'tag'),
    description: nullable(formData, 'description'),
    archived: formData.get('archived') === 'on',
    fabric,
    origin: nullable(formData, 'origin'),
    careNotes: nullable(formData, 'careNotes'),
    inventory: num(formData, 'inventory'),
    inquiryOnly: formData.get('inquiryOnly') === 'on',
    minQty: Math.max(1, num(formData, 'minQty', 1)),
    // Empty means "let the storefront compute its own related row".
    relatedIds: relatedIds.length ? relatedIds : null,
  }
}

/**
 * Create or update a product, sync its colour variants, then return to the
 * catalogue list. Variants arrive as JSON from the variant manager (one entry
 * per colour; id absent = new row).
 */
export async function saveProduct(formData: FormData) {
  const id = text(formData, 'id')
  const input = readProductInput(formData)

  let productId: number
  if (id) {
    await updateProduct(Number(id), input)
    productId = Number(id)
  } else {
    productId = (await createProduct(input)).id
  }

  const rawVariants = text(formData, 'variants')
  if (rawVariants) {
    try {
      const parsed = JSON.parse(rawVariants) as ProductVariantInput[]
      await syncProductVariants(productId, parsed)
    } catch (error) {
      console.error('saveProduct: variant sync failed', error)
    }
  }

  revalidatePath('/admin/products')
  revalidatePath('/admin')
  revalidatePath('/')

  // Back to the list with an explicit confirmation, so the owner sees that the
  // write landed instead of being dropped on the list with no feedback.
  redirect(`/admin/products?saved=${encodeURIComponent(input.name || 'product')}`)
}

/**
 * Archive / restore a piece. Archiving is the safe way to retire something: it
 * stays in the catalogue and in past orders, but leaves the shop, search, the
 * home page and related rows. Delete (removeProductAction) is permanent.
 */
export async function setProductArchived(formData: FormData) {
  const id = Number(text(formData, 'id'))
  const archived = text(formData, 'archived') === 'true'
  if (id) await updateProduct(id, { archived })
  revalidatePath('/admin/products')
  revalidatePath('/admin')
  revalidatePath('/')
}

/** Save one editorial block (hero, house, fittings, mailing list, heritage, footer). */
export async function saveContentBlock(formData: FormData) {
  const key = text(formData, 'key') as ContentKey
  if (!CONTENT_BLOCK_KEYS.some((block) => block.key === key)) {
    throw new Error(`saveContentBlock: unknown block "${key}"`)
  }
  await updateContentBlock(key, {
    eyebrow: text(formData, 'eyebrow'),
    title: text(formData, 'title'),
    body: text(formData, 'body'),
    ctaLabel: text(formData, 'ctaLabel'),
    ctaHref: text(formData, 'ctaHref'),
    image: text(formData, 'image'),
    alt: text(formData, 'alt'),
  })
  revalidatePath('/admin/content/page-copy')
  revalidatePath('/')
}

export async function removeProductAction(formData: FormData) {
  const id = Number(text(formData, 'id'))
  if (id) await deleteProduct(id)
  revalidatePath('/admin/products')
  revalidatePath('/admin')
}

export async function setOrderStatus(formData: FormData) {
  const id = Number(text(formData, 'id'))
  const status = text(formData, 'status') as OrderStatus
  if (id && (ORDER_STATUSES as readonly string[]).includes(status)) {
    await updateOrderStatus(id, status)
  }
  revalidatePath('/admin/orders')
}

/** Wholesale book: adjust the bulk quantity on an existing order. */
export async function setOrderQuantity(formData: FormData) {
  const id = Number(text(formData, 'id'))
  const qty = Math.max(1, num(formData, 'qty', 1))
  if (id) await updateOrderQuantity(id, qty)
  revalidatePath('/admin/orders')
}

/** Fitting book: move an appointment through New → Confirmed → Completed. */
export async function setFittingStatus(formData: FormData) {
  const id = Number(text(formData, 'id'))
  const status = text(formData, 'status') as FittingStatus
  if (id && (FITTING_STATUSES as readonly string[]).includes(status)) {
    await updateFittingStatus(id, status)
  }
  revalidatePath('/admin/fittings')
}

export async function saveFrameImage(formData: FormData) {
  const id = Number(text(formData, 'id'))
  const image = text(formData, 'image')
  const alt = text(formData, 'alt')
  if (id && image) await updateFrameImage(id, image, alt || undefined)
  revalidatePath('/admin/content')
  revalidatePath('/')
}

export async function saveSettings(formData: FormData) {
  await updateSettings({
    storeName: text(formData, 'storeName'),
    contactEmail: nullable(formData, 'contactEmail'),
    orderNotifications: nullable(formData, 'orderNotifications'),
    currency: text(formData, 'currency') || 'USD',
    // Her bank account for manual transfers. Saved straight to settings and
    // live on the checkout page — no approval step.
    bankDetails: {
      bankName: text(formData, 'bankName'),
      accountNumber: text(formData, 'accountNumber'),
      accountName: text(formData, 'accountName'),
    },
    social: {
      instagram: nullable(formData, 'instagram'),
      facebook: nullable(formData, 'facebook'),
      tiktok: nullable(formData, 'tiktok'),
    },
  })
  revalidatePath('/admin/settings')
  revalidatePath('/')
}

/**
 * The atelier confirms the transfer in her bank app, then clicks once:
 * payment_status -> 'paid' AND status -> 'Processing' (see markOrderPaid).
 */
export async function markOrderPaid(formData: FormData) {
  const id = Number(text(formData, 'id'))
  if (id) await markOrderPaidRecord(id)
  revalidatePath('/admin/orders')
  revalidatePath('/admin')
}

/**
 * Banner / photo manager: persist the Cloudinary URL the upload widget
 * returned for a slot. The crop itself is enforced at delivery time via
 * slotImageUrl(), using the ratio declared in lib/media/slots.ts.
 */
export async function saveSlotImage(formData: FormData) {
  const slot = text(formData, 'slot')
  const image = text(formData, 'image')
  if (slot && image) await setSlotImage(slot, image, nullable(formData, 'alt'))
  revalidatePath('/admin/content')
  revalidatePath('/')
}
