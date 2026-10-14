import { createClient } from '@/lib/supabase/server'
import type { ProductVariant, ProductVariantInput } from './types'

const SELECT =
  'id, product_id, color_name, color_hex, sku, stock, price, sizes, images, hidden, position'

type VariantRow = {
  id: number
  product_id: number
  color_name: string
  color_hex: string
  sku: string | null
  stock: number
  price: number | string | null
  sizes: string[] | null
  images: string[] | null
  hidden: boolean
  position: number
}

export function toVariant(row: VariantRow): ProductVariant {
  return {
    id: Number(row.id),
    productId: Number(row.product_id),
    colorName: row.color_name,
    colorHex: row.color_hex,
    sku: row.sku,
    stock: Number(row.stock),
    price: row.price === null ? null : Number(row.price),
    sizes: row.sizes ?? [],
    images: row.images ?? [],
    hidden: row.hidden,
    position: Number(row.position),
  }
}

function toRow(input: Partial<ProductVariantInput>): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  if (input.colorName !== undefined) row.color_name = input.colorName
  if (input.colorHex !== undefined) row.color_hex = input.colorHex
  if (input.sku !== undefined) row.sku = input.sku
  if (input.stock !== undefined) row.stock = input.stock
  if (input.price !== undefined) row.price = input.price
  if (input.sizes !== undefined) row.sizes = input.sizes
  if (input.images !== undefined) row.images = input.images
  if (input.hidden !== undefined) row.hidden = input.hidden
  if (input.position !== undefined) row.position = input.position
  return row
}

/** All variants for one product, in display order. Admin sees hidden too. */
export async function listVariants(productId: number, includeHidden = false): Promise<ProductVariant[]> {
  const supabase = await createClient()
  let query = supabase.from('product_variants').select(SELECT).eq('product_id', productId)
  if (!includeHidden) query = query.eq('hidden', false)
  const { data, error } = await query.order('position', { ascending: true })
  if (error) throw new Error(`listVariants: ${error.message}`)
  return (data as unknown as VariantRow[]).map(toVariant)
}

export async function createVariant(productId: number, input: ProductVariantInput): Promise<ProductVariant> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('product_variants')
    .insert({ ...toRow(input), product_id: productId })
    .select(SELECT)
    .single()
  if (error) throw new Error(`createVariant: ${error.message}`)
  return toVariant(data as unknown as VariantRow)
}

export async function updateVariant(id: number, input: Partial<ProductVariantInput>): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('product_variants').update(toRow(input)).eq('id', id)
  if (error) throw new Error(`updateVariant: ${error.message}`)
}

export async function deleteVariant(id: number): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('product_variants').delete().eq('id', id)
  if (error) throw new Error(`deleteVariant: ${error.message}`)
}

/**
 * Replace a product's whole variant set in one pass (admin form save):
 * upsert rows that carry an id, insert the rest, delete anything removed.
 */
export async function syncProductVariants(productId: number, inputs: ProductVariantInput[]): Promise<void> {
  const existing = await listVariants(productId, true)
  const keepIds = new Set(inputs.filter((input) => input.id).map((input) => input.id))

  for (const variant of existing) {
    if (!keepIds.has(variant.id)) await deleteVariant(variant.id)
  }

  for (const [index, input] of inputs.entries()) {
    const payload = { ...input, position: index }
    if (input.id) {
      await updateVariant(input.id, payload)
    } else {
      await createVariant(productId, payload)
    }
  }
}
