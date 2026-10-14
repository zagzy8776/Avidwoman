import Link from 'next/link'
import { notFound } from 'next/navigation'
import { removeProductAction } from '@/app/admin/actions'
import ProductForm from '@/components/admin/product-form'
import SetupNotice from '@/components/admin/setup-notice'
import { getProduct, listProducts } from '@/lib/data/products'
import { isSupabaseConfigured } from '@/lib/supabase/server'

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  if (!isSupabaseConfigured()) {
    return (
      <>
        <header className="admin-header">
          <div>
            <p className="eyebrow">CATALOGUE</p>
            <h1>Edit product</h1>
          </div>
        </header>
        <SetupNotice area="product editing" />
      </>
    )
  }

  const product = await getProduct(Number(id))
  if (!product) notFound()

  // Every other piece, for the related-pieces picker on the form.
  const allProducts = await listProducts({ includeArchived: true })

  return (
    <>
      <header className="admin-header">
        <div>
          <p className="eyebrow">{product.collection}{product.archived ? ' · ARCHIVED' : ''}</p>
          <h1>{product.name}</h1>
        </div>
        <div className="admin-header-actions">
          {/* Each piece has its own /product/[id] route, so the owner opens the
              real, shareable page rather than a client-side view. */}
          <Link className="text-link" href={`/product/${product.id}`} target="_blank">
            View on site ↗
          </Link>
          <Link className="text-link" href="/admin/products">
            ← Back to products
          </Link>
        </div>
      </header>

      <ProductForm product={product} allProducts={allProducts} />

      <form action={removeProductAction} style={{ marginTop: 28 }}>
        <input type="hidden" name="id" value={product.id} />
        <button className="danger-action" type="submit" style={{ color: 'var(--danger)', fontSize: 8, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          Delete this product
        </button>
      </form>
    </>
  )
}
