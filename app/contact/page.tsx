import type { Metadata } from 'next'
import StorefrontRoute from '@/components/storefront-route'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Contact & Directions — Visit Our Owerri Studio | AVID WOMAN VOGUE',
  description:
    'Find AVID WOMAN VOGUE in Owerri, Imo State. Tap the map for directions to the shop, call or WhatsApp us, or send a message about fittings, trade and bulk orders.',
  alternates: { canonical: '/contact' },
}

export default function ContactPage() {
  return <StorefrontRoute view="contact" />
}
