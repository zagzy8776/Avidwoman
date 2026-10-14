import Link from 'next/link'
import { removeProductAction, setProductArchived } from '@/app/admin/actions'
import SetupNotice from '@/components/admin/setup-notice'
import { listProducts } from '@/lib/data/products'
import { FABRICS } from '@/lib/data/types'
import { money } from '@/lib/format'
import { isSupabaseConfigured } from '@/lib/supabase/server'

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; fabric?: string; show?: string; saved?: string }>
}) {
  const params = await searchParams

  if (!isSupabaseConfigured()) {
    return (
      <>
        <Header />
        <SetupNotice area="the product catalogue" />
      </>
    )
  }

  const query = (params.q ?? '').trim().toLowerCase()
  const fabric = params.fabric ?? ''
  // Archived pieces are hidden by default; the owner opts in to see them.
  const showArchived = params.show === 'archived'

  const all = await listProducts({ includeArchived: true })
  const activeCount = all.filter((product) => !product.archived).length
  const archivedCount = all.length - activeCount

  const products = all.filter((product) => {
    if ((product.archived ?? false) !== showArchived) return false
    const matchesQuery =
      !query ||
      product.name.toLowerCase().includes(query) ||
      (product.sku ?? '').toLowerCase().includes(query)
    const matchesFabric = !fabric || product.fabric === fabric
    return matchesQuery && matchesFabric
  })

  /** One place that builds a filter link, so no chip ever drops another filter. */
  const filterQuery = (next: { q?: string; fabric?: string; show?: string }) => {
    const search = new URLSearchParams()
    const q = next.q === undefined ? query : next.q
    const cloth = next.fabric === undefined ? fabric : next.fabric
    const show = next.show === undefined ? (showArchived ? 'archived' : '') : next.show
    if (q) search.set('q', q)
    if (cloth) search.set('fabric', cloth)
    if (show) search.set('show', show)
    const value = search.toString()
    return `/admin/products${value ? `?${value}` : ''}`
  }

  return (
    <>
      <Header />

      {/* Saving returns here with ?saved=… — say so, rather than leaving the
          owner to wonder whether the write landed. */}
      {params.saved ? (
        <p className="admin-saved" role="status">
          Saved “{decodeURIComponent(params.saved)}”. It is live on the site already.
        </p>
      ) : null}

      <div className="admin-toolbar">
        <form method="get" action="/admin/products">
          <input type="search" name="q" defaultValue={query} placeholder="Search product or SKU" aria-label="Search products" />
          {fabric ? <input type="hidden" name="fabric" value={fabric} /> : null}
          {showArchived ? <input type="hidden" name="show" value="archived" /> : null}
          <button type="submit">Search</button>
        </form>
        <Link className={fabric ? '' : 'active'} href={filterQuery({ fabric: '' })}>
          All fabrics
        </Link>
        {FABRICS.map((option) => (
          <Link
            key={option}
            className={fabric === option ? 'active' : ''}
            href={filterQuery({ fabric: option })}
          >
            {option}
          </Link>
        ))}
      </div>

      <div className="admin-toolbar">
        <span className="admin-toolbar-label">
          {showArchived ? `Archived · ${archivedCount}` : `Live · ${activeCount}`}
        </span>
        <Link className={showArchived ? '' : 'active'} href={filterQuery({ show: '' })}>
          Live pieces
        </Link>
        <Link className={showArchived ? 'active' : ''} href={filterQuery({ show: 'archived' })}>
          Archived{archivedCount ? ` · ${archivedCount}` : ''}
        </Link>
      </div>

      <article className="management-panel">
        {products.length === 0 ? (
          <div className="empty-state">
            No products match this filter. <Link href="/admin/products/new">Add a product</Link> or
            clear the filter.
          </div>
        ) : (
          <div className="product-admin-list">
            {products.map((product) => {
              const colourCount = product.variants.length
              const photographed = product.variants.filter((variant) => variant.images.length > 0).length
              return (
                <div className="admin-product-row" key={product.id}>
                  <img src={product.image} alt="" />
                  <span>
                    <strong>
                      {product.name}
                      {product.tag ? <em className="product-badge">{product.tag}</em> : null}
                    </strong>
                    <small>
                      {product.sku ?? `AVW-${String(product.id).padStart(4, '0')}`} · {product.collection}
                      {product.fabric ? ` · ${product.fabric}` : ''}
                      {product.archived ? ' · archived' : ''}
                    </small>
                  </span>
                  <b>{money(product.price, product.currency)}</b>
                  <span className="inventory">
                    {/* Colour photo status: a colour with no shots renders greyed
                        on the storefront, so the owner needs to see the gap. */}
                    {colourCount
                      ? `${photographed} of ${colourCount} colours photographed`
                      : 'No colours yet'}
                  </span>
                  <span className="inventory">{product.inventory} in stock</span>
                  <Link href={`/admin/products/${product.id}`}>Edit</Link>
                  <form action={setProductArchived}>
                    <input type="hidden" name="id" value={product.id} />
                    <input type="hidden" name="archived" value={product.archived ? 'false' : 'true'} />
                    <button type="submit">{product.archived ? 'Restore' : 'Archive'}</button>
                  </form>
                  <form action={removeProductAction}>
                    <input type="hidden" name="id" value={product.id} />
                    <button className="danger-action" type="submit">
                      Delete
                    </button>
                  </form>
                </div>
              )
            })}
          </div>
        )}
      </article>
    </>
  )
}

function Header() {
  return (
    <header className="admin-header">
      <div>
        <p className="eyebrow">CATALOGUE</p>
        <h1>Products</h1>
      </div>
      <Link className="gold-button" href="/admin/products/new">
        + Add product
      </Link>
    </header>
  )
}
