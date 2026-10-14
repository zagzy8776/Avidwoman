import type { Metadata, Viewport } from 'next'
import { Cormorant_Garamond, Manrope } from 'next/font/google'
import './globals.css'

/* Brand type is self-hosted by next/font: the files are downloaded once at
   compile time and served from /_next/static/media, so the editorial pairing
   renders even when fonts.googleapis.com is slow or unreachable from the
   visitor's browser — which is what left the swatch / size / quantity controls
   falling back to a system font. */
const serif = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
})

const sans = Manrope({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-manrope',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'AVID WOMAN VOGUE — Best Fashion House in Lagos, Owerri, Port Harcourt Nigeria',
  description: 'AVID WOMAN VOGUE is the best luxury fashion house in Nigeria. Premium handmade clothes, best tailor in Lagos, Owerri, Port Harcourt, Abuja. Custom fittings, Ankara, Adire, Aso-Oke. Shop high-quality fashion online with delivery across Nigeria.',
  keywords: [
    'best fashion house in Nigeria',
    'best fashion house in Lagos',
    'best fashion house in Owerri',
    'best fashion house in Port Harcourt',
    'best fashion house in Abuja',
    'best tailor in Lagos',
    'best tailor in Owerri',
    'best tailor in Port Harcourt',
    'best tailor in Nigeria',
    'best cloth selling in Nigeria',
    'luxury fashion Nigeria',
    'Ankara dresses Lagos',
    'Adire fashion Owerri',
    'Aso-Oke Port Harcourt',
    'custom tailoring Nigeria',
    'made to measure Lagos',
    'fashion designer Nigeria',
    'women fashion Lagos',
    'women fashion Owerri',
    'women fashion Port Harcourt',
    'handmade clothes Nigeria',
    'luxury clothing Nigeria',
    'fashion boutique Lagos',
    'fashion boutique Owerri',
    'fashion boutique Port Harcourt',
    'online fashion store Nigeria',
    'Nigerian fashion designer',
    'African fashion Nigeria',
    'custom dresses Lagos',
    'bespoke tailoring Nigeria',
  ],
  authors: [{ name: 'AVID WOMAN VOGUE' }],
  creator: 'AVID WOMAN VOGUE',
  publisher: 'AVID WOMAN VOGUE',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://avidwomanvogue.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'AVID WOMAN VOGUE — Best Fashion House in Nigeria',
    description: 'Luxury handmade fashion in Lagos, Owerri, Port Harcourt. Best tailor for custom Ankara, Adire, Aso-Oke. Shop premium Nigerian fashion online.',
    url: 'https://avidwomanvogue.com',
    siteName: 'AVID WOMAN VOGUE',
    locale: 'en_NG',
    type: 'website',
    images: [
      {
        url: '/avid-woman-vogue-logo.png',
        width: 1200,
        height: 630,
        alt: 'AVID WOMAN VOGUE - Best Fashion House in Nigeria',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AVID WOMAN VOGUE — Best Fashion House in Nigeria',
    description: 'Luxury handmade fashion in Lagos, Owerri, Port Harcourt. Best tailor for custom Ankara, Adire, Aso-Oke.',
    images: ['/avid-woman-vogue-logo.png'],
    creator: '@avidwoman',
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/avid-woman-vogue-logo.png' },
    ],
    apple: '/avid-woman-vogue-logo.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#000000',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <head>
        {/* Structured Data for Local Business */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'ClothingStore',
              name: 'AVID WOMAN VOGUE',
              description: 'Best luxury fashion house in Nigeria. Premium handmade clothes, custom tailoring, Ankara, Adire, Aso-Oke.',
              url: 'https://avidwomanvogue.com',
              logo: 'https://avidwomanvogue.com/avid-woman-vogue-logo.png',
              image: 'https://avidwomanvogue.com/avid-woman-vogue-logo.png',
              telephone: '+2347063243954',
              priceRange: '₦₦₦',
              address: {
                '@type': 'PostalAddress',
                addressLocality: 'Lagos',
                addressRegion: 'Lagos',
                addressCountry: 'NG',
              },
              geo: {
                '@type': 'GeoCoordinates',
                latitude: '6.5244',
                longitude: '3.3792',
              },
              areaServed: [
                { '@type': 'City', name: 'Lagos' },
                { '@type': 'City', name: 'Owerri' },
                { '@type': 'City', name: 'Port Harcourt' },
                { '@type': 'City', name: 'Abuja' },
                { '@type': 'Country', name: 'Nigeria' },
              ],
              sameAs: [
                'https://www.instagram.com/avidwoman',
                'https://wa.me/2347063243954',
              ],
              openingHoursSpecification: {
                '@type': 'OpeningHoursSpecification',
                dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
                opens: '09:00',
                closes: '18:00',
              },
            }),
          }}
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  )
}
