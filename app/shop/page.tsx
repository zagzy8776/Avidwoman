import type { Metadata } from 'next'
import StorefrontRoute from '@/components/storefront-route'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Shop | Handmade Dresses, Ankara & Thrift | AVID WOMAN VOGUE Owerri',
  description:
    'Shop handmade dresses, Ankara, Adire and Aso-Oke, plus our thrift store, from AVID WOMAN VOGUE in Owerri, Imo State. Small runs, made to measure, delivered across Nigeria.',
  alternates: { canonical: '/shop' },
}

export default function ShopPage() {
  return <StorefrontRoute view="shop" />
}
