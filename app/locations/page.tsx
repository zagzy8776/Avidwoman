import type { Metadata } from 'next'
import Link from 'next/link'
import { LOCATIONS, locationsByRegion } from '@/lib/data/locations'
import { SITE_URL } from '@/lib/site'

export const dynamic = 'force-static'

const HOUSE_WHATSAPP = 'https://wa.me/2347063243954'

export const metadata: Metadata = {
  title: 'Where We Serve — Bespoke Tailoring Across Nigeria | AVID WOMAN VOGUE',
  description:
    'AVID WOMAN VOGUE makes made-to-measure dresses, Ankara, Adire and Aso-Oke in Owerri, Imo State, and delivers to clients across all 36 states of Nigeria. Find your city.',
  alternates: { canonical: '/locations' },
  openGraph: {
    title: 'Where We Serve — AVID WOMAN VOGUE',
    description:
      'Hand-cut tailoring from our Owerri studio, delivered across all 36 states of Nigeria.',
    url: `${SITE_URL}/locations`,
    siteName: 'AVID WOMAN VOGUE',
    locale: 'en_NG',
    type: 'website',
  },
}

export default function LocationsPage() {
  const groups = locationsByRegion()

  return (
    <main className="page-main location-page">
      <section className="page-hero location-hero">
        <p className="eyebrow">WHERE WE SERVE</p>
        <h1>
          One studio in Owerri.
          <br />
          <em>All of Nigeria.</em>
        </h1>
        <p className="page-hero-note">
          Every piece is cut and sewn by hand at our Owerri studio, then sent by courier. We do not
          pretend to have a shop in every city — we would rather tell you exactly how delivery,
          measuring and fittings work where you are.
        </p>
        <p>
          {LOCATIONS.length} cities · 6 regions · all 36 states and the FCT
        </p>
      </section>

      <section className="location-body">
        <div className="location-facts">
          <div>
            <span>Made in</span>
            <b>Owerri, Imo State</b>
            <small>Where the studio and the fitting room are</small>
          </div>
          <div>
            <span>Delivered</span>
            <b>Nationwide</b>
            <small>By courier, 1–7 working days depending on distance</small>
          </div>
          <div>
            <span>Measured</span>
            <b>In person or at home</b>
            <small>Studio fitting, or a guide we send you</small>
          </div>
        </div>

        {groups.map((group) => (
          <article className="location-region" key={group.region}>
            <p className="eyebrow">{group.region}</p>
            <ul>
              {group.locations.map((place) => (
                <li key={place.slug}>
                  <Link href={`/locations/${place.slug}`}>
                    <strong>{place.city}</strong>
                    <span>{place.state}</span>
                    <small>{place.deliveryDays} days</small>
                  </Link>
                </li>
              ))}
            </ul>
          </article>
        ))}

        <div className="location-cta">
          <h2>Not sure if we reach you?</h2>
          <p>
            If your city is not listed, message us anyway — the courier network reaches more places
            than this list, and we will tell you honestly whether we can serve you.
          </p>
          <div className="location-cta-actions">
            <a className="gold-button" href={HOUSE_WHATSAPP} target="_blank" rel="noopener noreferrer">
              Ask on WhatsApp <span>↗</span>
            </a>
            <Link className="outline-button" href="/shop">
              Shop the collection
            </Link>
          </div>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: 'Cities AVID WOMAN VOGUE serves',
            numberOfItems: LOCATIONS.length,
            itemListElement: LOCATIONS.map((place, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              name: `${place.city}, ${place.state}`,
              url: `${SITE_URL}/locations/${place.slug}`,
            })),
          }),
        }}
      />
    </main>
  )
}
