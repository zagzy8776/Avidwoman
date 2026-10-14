import type { Metadata } from 'next'
import StorefrontRoute from '@/components/storefront-route'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Book an Appointment | Fittings & Made to Measure | AVID WOMAN VOGUE Owerri',
  description:
    'Book a private fitting at our Owerri studio, or send your measurements from anywhere in Nigeria. Made to measure, adjustments and re-sizing by the best tailors in Imo State.',
  alternates: { canonical: '/fitting' },
}

export default function FittingPage() {
  return <StorefrontRoute view="fitting" />
}
