import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getLocation, LOCATIONS } from '@/lib/data/locations'
import { serverOrigin } from '@/lib/server-origin'

/**
 * Rendered per request rather than frozen at build time.
 *
 * The canonical tag, the Service schema and the breadcrumb must all name the
 * host actually serving the page. Pre-rendering bakes in the origin that existed
 * at build time, which is how the site came to point Google at a domain that did
 * not exist yet. There is no database read here, so this costs nothing.
 */
export const dynamic = 'force-dynamic'

const HOUSE_PHONE = '+2347063243954'
const HOUSE_WHATSAPP = 'https://wa.me/2347063243954'

type Params = { params: Promise<{ city: string }> }

/**
 * A service-area page for one city.
 *
 * This is deliberately NOT a "ghost" page. It states plainly that the studio is
 * in Owerri and that we serve this city by courier — because a page that implies
 * a shopfront exists where it does not is a doorway page, and Google penalises
 * those. What it does instead is answer the questions someone in that city
 * actually has (how long is delivery, how do I get measured, can I send my own
 * cloth), which is what earns the ranking and the enquiry.
 */
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { city: slug } = await params
  const place = getLocation(slug)
  if (!place) return { title: 'Location not found — AVID WOMAN VOGUE' }

  const title = `Bespoke Tailoring & Fashion House for ${place.city}, ${place.state} | AVID WOMAN VOGUE`
  const description = `Made-to-measure dresses, Ankara, Adire and Aso-Oke for clients in ${place.city}, ${place.state}. Cut by hand in our Owerri studio and delivered in ${place.deliveryDays} working days. Private fittings and remote measuring.`

  return {
    title,
    description,
    alternates: { canonical: `/locations/${place.slug}` },
    openGraph: {
      title: `AVID WOMAN VOGUE — Bespoke Tailoring for ${place.city}`,
      description,
      url: `${await serverOrigin()}/locations/${place.slug}`,
      siteName: 'AVID WOMAN VOGUE',
      locale: 'en_NG',
      type: 'website',
    },
  }
}

export default async function LocationPage({ params }: Params) {
  const { city: slug } = await params
  const place = getLocation(slug)
  if (!place) notFound()

  // Every absolute URL on this page names the host that served it, so the
  // schema and breadcrumb stay valid on the vercel.app address and on the
  // custom domain alike.
  const origin = await serverOrigin()

  const measuringCopy =
    place.measuring === 'studio'
      ? 'Come to the studio in Owerri and we will measure you in person before anything is cut.'
      : place.measuring === 'courier'
        ? 'We send you a short measuring guide, you take the numbers at home, and you send them to us on WhatsApp. Most pieces need nothing more than that.'
        : 'You can come to the studio in Owerri for a fitting, or take the numbers at home with our guide and send them on WhatsApp — whichever suits you.'

  /** Real questions, with the answers shown on the page. */
  const faqs = [
    {
      q: `Do you have a shop in ${place.city}?`,
      a: `No. Our studio is in Owerri, Imo State, and ${place.city} is a city we serve by courier. We would rather say that plainly than pretend to a shopfront we do not have.`,
    },
    {
      q: `How long does delivery to ${place.city} take?`,
      a: `Typically ${place.deliveryDays} working days from the day your order is confirmed, plus the time it takes to make the piece. The courier sets the final date, so we confirm it with you before we promise anything.`,
    },
    {
      q: `How do I get measured if I am in ${place.city}?`,
      a: measuringCopy,
    },
    {
      q: `Can I send my own fabric?`,
      a: 'Yes. Many clients already own cloth — George, Aso-Oke, Ankara, Akwete — and would rather we cut and finish it. Send it to the studio and we will work to the house patterns.',
    },
    {
      q: `Do you make aso-ebi for groups in ${place.city}?`,
      a: 'Yes. Group orders are cut to one pattern across different body types, which is the whole point of aso-ebi. Send the number of people and the date you need it for and we will quote.',
    },
    {
      q: `What does it cost?`,
      a: 'Ready-made pieces are priced on the site in Naira. Made-to-measure and group orders are quoted once we know the fabric, the style and the number of pieces — message us and we will give you a figure.',
    },
  ]

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: `Bespoke tailoring and made-to-measure clothing for ${place.city}`,
      serviceType: 'Bespoke tailoring, made-to-measure clothing, Ankara, Adire and Aso-Oke',
      description: `Hand-cut dresses and traditional Nigerian womenswear made in our Owerri studio and delivered to ${place.city}, ${place.state}.`,
      provider: {
        '@type': 'ClothingStore',
        '@id': `${origin}/#store`,
        name: 'AVID WOMAN VOGUE',
        telephone: HOUSE_PHONE,
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Owerri',
          addressRegion: 'Imo State',
          addressCountry: 'NG',
        },
      },
      areaServed: {
        '@type': 'City',
        name: place.city,
        containedInPlace: { '@type': 'AdministrativeArea', name: place.state },
      },
      availableChannel: {
        '@type': 'ServiceChannel',
        serviceUrl: `${origin}/locations/${place.slug}`,
        servicePhone: HOUSE_PHONE,
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.q,
        acceptedAnswer: { '@type': 'Answer', text: faq.a },
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: origin },
        { '@type': 'ListItem', position: 2, name: 'Locations', item: `${origin}/locations` },
        {
          '@type': 'ListItem',
          position: 3,
          name: place.city,
          item: `${origin}/locations/${place.slug}`,
        },
      ],
    },
  ]

  return (
    <main className="page-main location-page">
      <section className="page-hero location-hero">
        <p className="eyebrow">
          {place.region} · {place.state}
        </p>
        <h1>
          Bespoke tailoring for
          <br />
          <em>{place.city}.</em>
        </h1>
        <p className="page-hero-note">
          We cut and sew by hand in our Owerri studio and deliver to {place.city} in about{" "}
          {place.deliveryDays} working days. Fittings in person, or measurements taken at home and
          sent to us — whichever suits you.
        </p>
        <p>
          {place.state} · {place.occasions.join(' · ')}
        </p>
      </section>

      <section className="location-body">
        <article className="location-note">
          <p className="eyebrow">WHAT WE SEE FROM {place.city.toUpperCase()}</p>
          <p className="location-note-text">{place.note}</p>
        </article>

        <div className="location-facts">
          <div>
            <span>Delivery</span>
            <b>{place.deliveryDays} working days</b>
            <small>From the Owerri studio, courier permitting</small>
          </div>
          <div>
            <span>Measuring</span>
            <b>
              {place.measuring === 'studio'
                ? 'Studio fitting'
                : place.measuring === 'courier'
                  ? 'At home, by WhatsApp'
                  : 'Studio or at home'}
            </b>
            <small>Whichever is easier for you</small>
          </div>
          <div>
            <span>Studio</span>
            <b>Owerri, Imo State</b>
            <small>Monday to Saturday, 9am–6pm</small>
          </div>
        </div>

        <article className="location-faq">
          <p className="eyebrow">QUESTIONS WE GET FROM {place.city.toUpperCase()}</p>
          <dl>
            {faqs.map((faq) => (
              <div key={faq.q}>
                <dt>{faq.q}</dt>
                <dd>{faq.a}</dd>
              </div>
            ))}
          </dl>
        </article>

        <div className="location-cta">
          <h2>Ready when you are.</h2>
          <p>
            Send us a message with what you need and the date you need it for, and we will tell you
            what is possible and what it costs.
          </p>
          <div className="location-cta-actions">
            <a className="gold-button" href={HOUSE_WHATSAPP} target="_blank" rel="noopener noreferrer">
              Message on WhatsApp <span>↗</span>
            </a>
            <Link className="outline-button" href="/fitting">
              Book a fitting
            </Link>
            <Link className="outline-button" href="/shop">
              Shop the collection
            </Link>
          </div>
        </div>

        <nav className="location-elsewhere" aria-label="Other places we serve">
          <p className="eyebrow">ALSO SERVING</p>
          <div>
            {LOCATIONS.filter((other) => other.slug !== place.slug)
              .slice(0, 14)
              .map((other) => (
                <Link key={other.slug} href={`/locations/${other.slug}`}>
                  {other.city}
                </Link>
              ))}
            <Link href="/locations">All locations →</Link>
          </div>
        </nav>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </main>
  )
}
