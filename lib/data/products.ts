import { createClient } from '@/lib/supabase/server'
import { toVariant } from './variants'
import type { Fabric, Product, ProductInput, ProductVariant } from './types'

const SELECT =
  'id, sku, name, collection, price, currency, image, alt, tag, description, archived, fabric, origin, care_notes, inventory, inquiry_only, min_qty, related_ids, created_at, product_variants(id, product_id, color_name, color_hex, sku, stock, price, sizes, images, hidden, position)'

type ProductRow = {
  id: number
  sku: string | null
  name: string
  collection: string
  price: number | string
  currency: string
  image: string
  alt: string
  tag: string | null
  description: string | null
  archived: boolean | null
  fabric: string | null
  origin: string | null
  care_notes: string | null
  inventory: number
  inquiry_only: boolean
  min_qty: number
  related_ids: number[] | null
  created_at: string
  product_variants:
    | {
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
      }[]
    | null
}

/** Variants joined from the product row, display-ordered. Falls back to []. */
function variantsOf(row: ProductRow): ProductVariant[] {
  return (row.product_variants ?? []).map(toVariant).sort((a, b) => a.position - b.position)
}

function toProduct(row: ProductRow): Product {
  return {
    id: Number(row.id),
    sku: row.sku,
    name: row.name,
    collection: row.collection,
    price: Number(row.price),
    currency: row.currency,
    image: row.image,
    alt: row.alt,
    tag: row.tag,
    description: row.description,
    archived: row.archived ?? false,
    fabric: (row.fabric as Fabric | null) ?? null,
    origin: row.origin,
    careNotes: row.care_notes,
    inventory: row.inventory,
    inquiryOnly: row.inquiry_only,
    minQty: row.min_qty,
    relatedIds: row.related_ids ?? null,
    createdAt: row.created_at,
    variants: variantsOf(row),
  }
}

/** camelCase input -> snake_case column, only for the keys actually supplied. */
function toRow(input: Partial<ProductInput>): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  if (input.name !== undefined) row.name = input.name
  if (input.collection !== undefined) row.collection = input.collection
  if (input.price !== undefined) row.price = input.price
  if (input.currency !== undefined) row.currency = input.currency
  if (input.image !== undefined) row.image = input.image
  if (input.alt !== undefined) row.alt = input.alt
  if (input.tag !== undefined) row.tag = input.tag
  if (input.description !== undefined) row.description = input.description
  if (input.archived !== undefined) row.archived = input.archived
  if (input.fabric !== undefined) row.fabric = input.fabric
  if (input.origin !== undefined) row.origin = input.origin
  if (input.careNotes !== undefined) row.care_notes = input.careNotes
  if (input.inventory !== undefined) row.inventory = input.inventory
  if (input.inquiryOnly !== undefined) row.inquiry_only = input.inquiryOnly
  if (input.minQty !== undefined) row.min_qty = input.minQty
  if (input.relatedIds !== undefined) row.related_ids = input.relatedIds
  return row
}

/**
 * The catalogue, oldest first.
 *
 * Archived pieces are excluded by default: the storefront, search and the
 * checkout route all call this, and none of them should be able to sell or show
 * a retired piece. The admin console passes `includeArchived` so the owner can
 * still see, edit and restore what she has archived.
 */
export async function listProducts(options?: { includeArchived?: boolean }): Promise<Product[]> {
  const supabase = await createClient()
  let query = supabase.from('products').select(SELECT).order('id', { ascending: true })
  if (!options?.includeArchived) query = query.eq('archived', false)
  const { data, error } = await query
  if (error) throw new Error(`listProducts: ${error.message}`)
  return (data as unknown as ProductRow[]).map(toProduct)
}

export async function getProduct(id: number): Promise<Product | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('products').select(SELECT).eq('id', id).maybeSingle()
  if (error) throw new Error(`getProduct: ${error.message}`)
  return data ? toProduct(data as unknown as ProductRow) : null
}

export async function createProduct(input: ProductInput): Promise<Product> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('products')
    .insert(toRow(input))
    .select(SELECT)
    .single()
  if (error) throw new Error(`createProduct: ${error.message}`)
  return toProduct(data as unknown as ProductRow)
}

export async function updateProduct(id: number, input: Partial<ProductInput>): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('products').update(toRow(input)).eq('id', id)
  if (error) throw new Error(`updateProduct: ${error.message}`)
}

export async function deleteProduct(id: number): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw new Error(`deleteProduct: ${error.message}`)
}
