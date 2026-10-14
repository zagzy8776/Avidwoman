import type { Metadata } from 'next'
import StorefrontRoute from '@/components/storefront-route'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Our Story | An Owerri Fashion House | AVID WOMAN VOGUE',
  description:
    'AVID WOMAN VOGUE is a Nigerian fashion house making well-made clothes in small numbers. Cut and sewn by hand in Owerri, Imo State, and finished to last for years.',
  alternates: { canonical: '/about' },
}

export default function AboutPage() {
  return <StorefrontRoute view="about" />
}
