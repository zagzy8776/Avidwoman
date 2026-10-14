import type { Metadata } from 'next'
import StorefrontRoute from '@/components/storefront-route'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Thrift Store | Pre-loved Clothes in Owerri | AVID WOMAN VOGUE',
  description:
    'Shop our thrift store in Owerri, Imo State. Quality pre-loved and second-hand clothes, hand-picked and checked before they reach you. Delivery across Nigeria.',
  alternates: { canonical: '/thrift' },
}

export default function ThriftPage() {
  return <StorefrontRoute view="shop" collection="THRIFT" />
}
