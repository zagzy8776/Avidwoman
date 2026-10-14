import type { Metadata, Viewport } from 'next'
import { Cormorant_Garamond, Manrope } from 'next/font/google'
import { serverOrigin } from '@/lib/server-origin'
import './globals.css'

/** The house's phone number, in the two forms structured data needs. */
const HOUSE_PHONE_DIAL = '+2347063243954'

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

/**
 * Metadata is generated per request so every absolute URL it emits — the
 * canonical tag, the Open Graph url and image, the schema — names the host that
 * actually served the page.
 *
 * A canonical pointing at a domain that does not serve the content is worse
 * than no canonical at all: it tells Google to look elsewhere, Google finds
 * nothing, and the page can be dropped from the index. That is what was
 * happening while the site ran on a vercel.app address with no custom domain.
 */
export async function generateMetadata(): Promise<Metadata> {
  const origin = await serverOrigin()

  return {
  title: 'AVID WOMAN VOGUE | Best Fashion House & Thrift Store in Owerri, Nigeria',
  description:
    'The best fashion house in Owerri, Imo State. Handmade dresses, Ankara, Adire and Aso-Oke, custom tailoring and fittings, plus our thrift store. Serving Port Harcourt, Aba, Umuahia and all of Nigeria.',
  keywords: [
    // Fashion house
    'best fashion house in Nigeria',
    'best fashion house in Owerri',
    'best fashion house in Imo State',
    'best fashion house in Port Harcourt',
    'best fashion house in Abia State',
    'best fashion house in Aba',
    'best fashion house in Umuahia',
    'best fashion house in Lagos',
    'best fashion house in Abuja',
    'luxury fashion house Nigeria',
    'top fashion house in Owerri',
    // Thrift
    'best thrift store in Owerri',
    'best thrift store in Imo State',
    'best thrift store in Port Harcourt',
    'best thrift store in Abia State',
    'best thrift wears in Nigeria',
    'thrift clothes Owerri',
    'thrift shop Owerri',
    'pre-loved clothes Owerri',
    'second hand clothes Owerri',
    'affordable thrift wears Nigeria',
    'okrika clothes Owerri',
    // Tailoring
    'best tailor in Owerri',
    'best tailor in Imo State',
    'best tailor in Port Harcourt',
    'best tailor in Abia State',
    'best tailor in Nigeria',
    'best fashion designer in Owerri',
    'best fashion designer in Port Harcourt',
    'custom tailoring Owerri',
    'made to measure Owerri',
    'bespoke tailoring Nigeria',
    'women tailor Owerri',
    // Cloth selling
    'best cloth selling in Owerri',
    'best cloth selling in Nigeria',
    'fabric shop Owerri',
    'Ankara fabric Owerri',
    'Adire fabric Imo State',
    'Aso-Oke Port Harcourt',
    'lace fabric Nigeria',
    'fashion boutique Owerri',
    // States
    'fashion house Imo State',
    'fashion house Abia State',
    'fashion house Rivers State',
    'fashion house Anambra State',
    'fashion house Enugu State',
    'fashion house Ebonyi State',
    'fashion house Bayelsa State',
    'fashion house Akwa Ibom State',
    'fashion house Delta State',
    'fashion house Edo State',
    'fashion house Cross River State',
    'fashion house Lagos State',
    'fashion house FCT Abuja',
    // Cities & towns
    'fashion designer Orlu',
    'fashion designer Okigwe',
    'fashion designer Mbaise',
    'fashion designer Nekede',
    'fashion designer Aba',
    'fashion designer Umuahia',
    'fashion designer Onitsha',
    'fashion designer Awka',
    'fashion designer Enugu',
    'fashion designer Abakaliki',
    'fashion designer Yenagoa',
    'fashion designer Uyo',
    'fashion designer Warri',
    'fashion designer Asaba',
    'fashion designer Benin City',
    'fashion designer Calabar',
    // Streets & landmarks in Owerri
    'fashion designer Wetheral Road Owerri',
    'fashion designer Douglas Road Owerri',
    'fashion designer Ikenegbu Owerri',
    'fashion designer New Owerri',
    'fashion designer Aladinma Owerri',
    'fashion designer Orji Owerri',
    'fashion designer Works Layout Owerri',
    'fashion house near Shoprite Owerri',
    'fashion house near Imo State University',
    'fashion house near Owerri Municipal',
    // Product intent
    'custom dresses Owerri',
    'evening gowns Owerri',
    'wedding guest dresses Nigeria',
    'aso ebi outfits Owerri',
    'handmade clothes Nigeria',
    'online fashion store Nigeria',
    'shop dresses online Nigeria',
    'women fashion Owerri',
  ],
  authors: [{ name: 'AVID WOMAN VOGUE' }],
  creator: 'AVID WOMAN VOGUE',
  publisher: 'AVID WOMAN VOGUE',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(origin),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'AVID WOMAN VOGUE | Best Fashion House in Nigeria',
    description: 'Luxury handmade fashion in Owerri, Imo State. Best tailor for custom Ankara, Adire, Aso-Oke. Shop premium Nigerian fashion online.',
    url: origin,
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
    title: 'AVID WOMAN VOGUE | Best Fashion House in Nigeria',
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
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#000000',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Same origin the metadata used, so the schema's url, logo and @id all point
  // at the host serving this page.
  const origin = await serverOrigin()

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
              '@id': `${origin}/#store`,
              name: 'AVID WOMAN VOGUE',
              description:
                'Best fashion house in Owerri, Imo State. Handmade dresses, Ankara, Adire and Aso-Oke, custom tailoring, fittings and a thrift store. Delivered across Nigeria.',
              url: origin,
              logo: `${origin}/avid-woman-vogue-logo.png`,
              image: `${origin}/avid-woman-vogue-logo.png`,
              telephone: HOUSE_PHONE_DIAL,
              priceRange: '₦₦',
              currenciesAccepted: 'NGN',
              address: {
                '@type': 'PostalAddress',
                addressLocality: 'Owerri',
                addressRegion: 'Imo State',
                addressCountry: 'NG',
              },
              geo: {
                '@type': 'GeoCoordinates',
                latitude: '5.4836',
                longitude: '7.0332',
              },
              areaServed: [
                { '@type': 'City', name: 'Owerri' },
                { '@type': 'City', name: 'Port Harcourt' },
                { '@type': 'City', name: 'Aba' },
                { '@type': 'City', name: 'Umuahia' },
                { '@type': 'City', name: 'Orlu' },
                { '@type': 'City', name: 'Okigwe' },
                { '@type': 'City', name: 'Onitsha' },
                { '@type': 'City', name: 'Awka' },
                { '@type': 'City', name: 'Enugu' },
                { '@type': 'City', name: 'Lagos' },
                { '@type': 'City', name: 'Abuja' },
                { '@type': 'AdministrativeArea', name: 'Imo State' },
                { '@type': 'AdministrativeArea', name: 'Abia State' },
                { '@type': 'AdministrativeArea', name: 'Rivers State' },
                { '@type': 'AdministrativeArea', name: 'Anambra State' },
                { '@type': 'AdministrativeArea', name: 'Enugu State' },
                { '@type': 'Country', name: 'Nigeria' },
              ],
              sameAs: [
                'https://www.instagram.com/avidwoman',
                'https://www.tiktok.com/@avidwoman',
                'https://wa.me/2347063243954',
              ],
              openingHoursSpecification: {
                '@type': 'OpeningHoursSpecification',
                dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
                opens: '09:00',
                closes: '18:00',
              },
              makesOffer: [
                { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Made to measure tailoring' } },
                { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Private fittings and adjustments' } },
                { '@type': 'Offer', itemOffered: { '@type': 'Product', name: 'Thrift and pre-loved clothing' } },
                { '@type': 'Offer', itemOffered: { '@type': 'Product', name: 'Ankara, Adire and Aso-Oke pieces' } },
              ],
            }),
          }}
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  )
}
