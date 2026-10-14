import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import StorefrontRoute from '@/components/storefront-route'
import { getProduct, listProducts } from '@/lib/data/products'
import { money } from '@/lib/format'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

/**
 * A real, shareable, indexable page for one piece.
 *
 * The storefront is a single client component, so a product used to be reachable
 * only as `/?product=<id>` — a URL a crawler has to run JavaScript to open, and
 * which therefore carried no Product structured data in the HTML. This route
 * server-renders the piece instead, so the schema, title and description are all
 * in the response Google actually reads.
 */
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params
  const product = await getProduct(Number(id)).catch(() => null)
  if (!product) return { title: 'Piece not found — AVID WOMAN VOGUE' }

  const price = money(product.price, product.currency)
  const description =
    product.description ??
    `${product.name} from the ${product.collection} collection — hand-cut and finished in our Owerri studio. ${price}.`

  return {
    title: `${product.name} — ${product.collection} | AVID WOMAN VOGUE Owerri`,
    description,
    alternates: { canonical: `/product/${product.id}` },
    openGraph: {
      title: `${product.name} — AVID WOMAN VOGUE`,
      description,
      images: product.image ? [{ url: product.image, alt: product.alt }] : undefined,
      type: 'website',
    },
  }
}

/** Pre-render the known pieces; new ones render on demand. */
export async function generateStaticParams() {
  const products = await listProducts().catch(() => [])
  return products.map((product) => ({ id: String(product.id) }))
}

export default async function ProductPage({ params }: Params) {
  const { id } = await params
  const numeric = Number(id)
  if (!Number.isInteger(numeric) || numeric <= 0) notFound()

  return <StorefrontRoute view="product" productId={numeric} />
}
