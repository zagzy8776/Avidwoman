/**
 * Where the house serves, and what is genuinely different about each place.
 *
 * These power /locations/[city] — honest service-area pages, not "ghost" pages
 * pretending to be a shopfront. Every entry carries real, specific information
 * (how far it is, how long delivery takes, how clients there get measured, and
 * the local textile or occasion that actually drives demand). That specificity
 * is the point: a page that only swaps the city name into otherwise identical
 * copy is a doorway page, and Google treats it as one.
 *
 * `deliveryDays` is a typical window from our Owerri studio, not a promise —
 * the courier decides, and the page says so.
 */

export type Region =
  | 'South East'
  | 'South South'
  | 'South West'
  | 'North Central'
  | 'North East'
  | 'North West'

export type Location = {
  /** URL segment: /locations/<slug> */
  slug: string
  city: string
  state: string
  region: Region
  /** Typical working days from the Owerri studio, as a range. */
  deliveryDays: string
  /** How most clients there get measured. */
  measuring: 'studio' | 'courier' | 'both'
  /** The local textile tradition, market or occasion that drives demand. */
  note: string
  /** Occasions clients there most often order for. */
  occasions: string[]
}

export const LOCATIONS: Location[] = [
  // ---------------- South East ----------------
  {
    slug: 'owerri',
    city: 'Owerri',
    state: 'Imo State',
    region: 'South East',
    deliveryDays: 'same week',
    measuring: 'studio',
    note: 'Our studio is here, so Owerri clients are the only ones who can walk in, be measured and collect in person. Most appointments are for a fitting on a new piece, or adjustments to something already owned.',
    occasions: ['Weddings', 'Church', 'Workwear', 'Birthdays'],
  },
  {
    slug: 'orlu',
    city: 'Orlu',
    state: 'Imo State',
    region: 'South East',
    deliveryDays: '1 to 2',
    measuring: 'both',
    note: 'Orlu clients often combine a studio visit with a trip into Owerri. For those who would rather not travel, measurements sent by WhatsApp are enough for most cuts.',
    occasions: ['Traditional ceremonies', 'Church', 'Everyday'],
  },
  {
    slug: 'okigwe',
    city: 'Okigwe',
    state: 'Imo State',
    region: 'South East',
    deliveryDays: '1 to 2',
    measuring: 'both',
    note: 'A short run up the express from the studio. Okigwe orders are usually Ankara and Aso-Oke for family ceremonies, and many are placed as group aso-ebi.',
    occasions: ['Aso-ebi', 'Weddings', 'Burials'],
  },
  {
    slug: 'mbaise',
    city: 'Mbaise',
    state: 'Imo State',
    region: 'South East',
    deliveryDays: '1 to 2',
    measuring: 'both',
    note: 'Mbaise has a strong aso-ebi culture, so most orders here are matching family sets in Ankara or Aso-Oke, cut to the same pattern across different body types.',
    occasions: ['Aso-ebi', 'Weddings', 'Cultural days'],
  },
  {
    slug: 'oguta',
    city: 'Oguta',
    state: 'Imo State',
    region: 'South East',
    deliveryDays: '1 to 2',
    measuring: 'both',
    note: 'Oguta clients tend to order lighter fabrics and simpler cuts for the lakeside heat, and we cut accordingly.',
    occasions: ['Church', 'Everyday', 'Occasions'],
  },
  {
    slug: 'aba',
    city: 'Aba',
    state: 'Abia State',
    region: 'South East',
    deliveryDays: '1 to 2',
    measuring: 'both',
    note: 'Aba is the country\u2019s leather and textile town, and clients there know cloth better than anyone. Many bring their own Akwete or George and ask us to cut and finish it to the house patterns.',
    occasions: ['Bespoke', 'Aso-ebi', 'Workwear'],
  },
  {
    slug: 'umuahia',
    city: 'Umuahia',
    state: 'Abia State',
    region: 'South East',
    deliveryDays: '1 to 2',
    measuring: 'both',
    note: 'Umuahia orders are split between workwear and ceremony pieces. The drive from Owerri is short enough for a same-day fitting appointment.',
    occasions: ['Workwear', 'Weddings', 'Church'],
  },
  {
    slug: 'arochukwu',
    city: 'Arochukwu',
    state: 'Abia State',
    region: 'South East',
    deliveryDays: '2 to 3',
    measuring: 'courier',
    note: 'Further out, so most Arochukwu orders go by courier with measurements taken at home using our guide.',
    occasions: ['Traditional', 'Church', 'Occasions'],
  },
  {
    slug: 'onitsha',
    city: 'Onitsha',
    state: 'Anambra State',
    region: 'South East',
    deliveryDays: '2 to 3',
    measuring: 'both',
    note: 'Onitsha Main Market is where much of the country buys cloth, so clients there often supply their own fabric. We are happy to cut and finish to the house patterns, or to supply from our own stock.',
    occasions: ['Bespoke', 'Aso-ebi', 'Weddings', 'Workwear'],
  },
  {
    slug: 'awka',
    city: 'Awka',
    state: 'Anambra State',
    region: 'South East',
    deliveryDays: '2 to 3',
    measuring: 'both',
    note: 'Awka clients order a mix of tailored workwear and evening pieces, often for the city\u2019s growing corporate and civil-service calendar.',
    occasions: ['Workwear', 'Evening', 'Church'],
  },
  {
    slug: 'nnewi',
    city: 'Nnewi',
    state: 'Anambra State',
    region: 'South East',
    deliveryDays: '2 to 3',
    measuring: 'both',
    note: 'Nnewi is an industrial town with a strong formal-dress culture. Orders here lean towards sharp tailoring and statement evening pieces.',
    occasions: ['Formal', 'Evening', 'Occasions'],
  },
  {
    slug: 'enugu',
    city: 'Enugu',
    state: 'Enugu State',
    region: 'South East',
    deliveryDays: '2 to 3',
    measuring: 'both',
    note: 'Enugu clients order mostly for work and for ceremonies, and the city has enough of both to keep a steady run of made-to-measure commissions.',
    occasions: ['Workwear', 'Weddings', 'Church'],
  },
  {
    slug: 'nsukka',
    city: 'Nsukka',
    state: 'Enugu State',
    region: 'South East',
    deliveryDays: '2 to 3',
    measuring: 'courier',
    note: 'A university town, so orders here are often smaller and more budget-aware, and the thrift store does well, alongside made-to-measure for graduations.',
    occasions: ['Graduations', 'Everyday', 'Thrift'],
  },
  {
    slug: 'abakaliki',
    city: 'Abakaliki',
    state: 'Ebonyi State',
    region: 'South East',
    deliveryDays: '2 to 3',
    measuring: 'courier',
    note: 'Abakaliki orders are usually ceremony pieces, often as matching family sets. Measurements are taken at home and sent to us.',
    occasions: ['Aso-ebi', 'Weddings', 'Traditional'],
  },

  // ---------------- South South ----------------
  {
    slug: 'port-harcourt',
    city: 'Port Harcourt',
    state: 'Rivers State',
    region: 'South South',
    deliveryDays: '2 to 3',
    measuring: 'both',
    note: 'Port Harcourt has a strong George-wrapper and ceremony tradition alongside corporate dress. Orders here often pair a tailored piece with fabric the client already owns.',
    occasions: ['Weddings', 'Corporate', 'George wrapper', 'Evening'],
  },
  {
    slug: 'uyo',
    city: 'Uyo',
    state: 'Akwa Ibom State',
    region: 'South South',
    deliveryDays: '2 to 3',
    measuring: 'courier',
    note: 'Uyo clients order heavily for weddings and church, and the city\u2019s reputation for dressing well means the finishing is scrutinised, which suits how we work.',
    occasions: ['Weddings', 'Church', 'Aso-ebi'],
  },
  {
    slug: 'warri',
    city: 'Warri',
    state: 'Delta State',
    region: 'South South',
    deliveryDays: '2 to 3',
    measuring: 'both',
    note: 'Warri orders lean towards bold, statement pieces in Ankara and George, often for weddings and high days.',
    occasions: ['Weddings', 'Ceremonies', 'Evening'],
  },
  {
    slug: 'asaba',
    city: 'Asaba',
    state: 'Delta State',
    region: 'South South',
    deliveryDays: '2 to 3',
    measuring: 'both',
    note: 'Asaba sits close to Onitsha and shares its cloth market, so many clients there supply fabric and ask for the cut and finish.',
    occasions: ['Bespoke', 'Weddings', 'Workwear'],
  },
  {
    slug: 'benin-city',
    city: 'Benin City',
    state: 'Edo State',
    region: 'South South',
    deliveryDays: '2 to 4',
    measuring: 'courier',
    note: 'Benin City has a deep ceremonial dress culture. Orders here are mostly Aso-Oke and Ankara for weddings, chieftaincy and family events.',
    occasions: ['Aso-Oke', 'Weddings', 'Chieftaincy'],
  },
  {
    slug: 'yenagoa',
    city: 'Yenagoa',
    state: 'Bayelsa State',
    region: 'South South',
    deliveryDays: '3 to 4',
    measuring: 'courier',
    note: 'Yenagoa orders arrive mostly by courier, usually for weddings and church, with measurements taken at home.',
    occasions: ['Weddings', 'Church', 'Occasions'],
  },
  {
    slug: 'calabar',
    city: 'Calabar',
    state: 'Cross River State',
    region: 'South South',
    deliveryDays: '3 to 4',
    measuring: 'courier',
    note: 'Calabar\u2019s carnival and wedding season drive most orders here, and clients often want a piece that photographs well, which is what the studio shoot is for.',
    occasions: ['Carnival', 'Weddings', 'Evening'],
  },

  // ---------------- South West ----------------
  {
    slug: 'lagos',
    city: 'Lagos',
    state: 'Lagos State',
    region: 'South West',
    deliveryDays: '2 to 3',
    measuring: 'both',
    note: 'Lagos is the biggest market we serve and the most demanding on finish. Orders range from corporate tailoring to full Aso-Oke ensembles, and we can arrange a fitting trip when a client wants one.',
    occasions: ['Corporate', 'Weddings', 'Aso-Oke', 'Evening', 'Thrift'],
  },
  {
    slug: 'ibadan',
    city: 'Ibadan',
    state: 'Oyo State',
    region: 'South West',
    deliveryDays: '3 to 4',
    measuring: 'courier',
    note: 'Ibadan has a strong Aso-Oke weaving tradition, so many clients there already own good cloth and come to us for the cut and the finish.',
    occasions: ['Aso-Oke', 'Weddings', 'Traditional'],
  },
  {
    slug: 'abeokuta',
    city: 'Abeokuta',
    state: 'Ogun State',
    region: 'South West',
    deliveryDays: '3 to 4',
    measuring: 'courier',
    note: 'Abeokuta\u2019s adire heritage runs deep. Clients there know the difference between hand-dyed and printed, and order accordingly.',
    occasions: ['Adire', 'Traditional', 'Church'],
  },
  {
    slug: 'akure',
    city: 'Akure',
    state: 'Ondo State',
    region: 'South West',
    deliveryDays: '3 to 4',
    measuring: 'courier',
    note: 'Akure orders are largely ceremony and church pieces, often in Aso-Oke for family events.',
    occasions: ['Aso-Oke', 'Church', 'Weddings'],
  },
  {
    slug: 'ado-ekiti',
    city: 'Ado-Ekiti',
    state: 'Ekiti State',
    region: 'South West',
    deliveryDays: '3 to 4',
    measuring: 'courier',
    note: 'Ado-Ekiti clients order mostly for weddings and traditional ceremonies, with measurements taken at home.',
    occasions: ['Weddings', 'Traditional', 'Church'],
  },
  {
    slug: 'osogbo',
    city: 'Osogbo',
    state: 'Osun State',
    region: 'South West',
    deliveryDays: '3 to 4',
    measuring: 'courier',
    note: 'Osogbo sits in the heart of Aso-Oke country. Orders here are usually for weddings and festivals, often with the client\u2019s own woven cloth.',
    occasions: ['Aso-Oke', 'Festivals', 'Weddings'],
  },

  // ---------------- North Central ----------------
  {
    slug: 'abuja',
    city: 'Abuja',
    state: 'Federal Capital Territory',
    region: 'North Central',
    deliveryDays: '3 to 4',
    measuring: 'both',
    note: 'Abuja orders are dominated by corporate and formal wear, plus a steady run of evening pieces for the city\u2019s event calendar. We can arrange a fitting visit when a client wants one.',
    occasions: ['Corporate', 'Formal', 'Evening', 'Weddings'],
  },
  {
    slug: 'lokoja',
    city: 'Lokoja',
    state: 'Kogi State',
    region: 'North Central',
    deliveryDays: '3 to 4',
    measuring: 'courier',
    note: 'Lokoja orders come mostly by courier, for weddings and church, with home measurements.',
    occasions: ['Weddings', 'Church', 'Occasions'],
  },
  {
    slug: 'makurdi',
    city: 'Makurdi',
    state: 'Benue State',
    region: 'North Central',
    deliveryDays: '4 to 5',
    measuring: 'courier',
    note: 'Makurdi clients order ceremony and workwear pieces, usually with measurements sent to us directly.',
    occasions: ['Weddings', 'Workwear', 'Church'],
  },
  {
    slug: 'jos',
    city: 'Jos',
    state: 'Plateau State',
    region: 'North Central',
    deliveryDays: '4 to 5',
    measuring: 'courier',
    note: 'Jos is cooler than the south, so orders there often call for heavier cloth and longer sleeves. We cut for the climate.',
    occasions: ['Workwear', 'Church', 'Occasions'],
  },
  {
    slug: 'ilorin',
    city: 'Ilorin',
    state: 'Kwara State',
    region: 'North Central',
    deliveryDays: '4 to 5',
    measuring: 'courier',
    note: 'Ilorin orders are mostly traditional and ceremony pieces, often in Aso-Oke, with measurements taken at home.',
    occasions: ['Aso-Oke', 'Traditional', 'Weddings'],
  },
  {
    slug: 'minna',
    city: 'Minna',
    state: 'Niger State',
    region: 'North Central',
    deliveryDays: '4 to 5',
    measuring: 'courier',
    note: 'Minna clients order ceremony and everyday pieces, and the thrift store travels well here.',
    occasions: ['Occasions', 'Everyday', 'Thrift'],
  },
  {
    slug: 'lafia',
    city: 'Lafia',
    state: 'Nasarawa State',
    region: 'North Central',
    deliveryDays: '4 to 5',
    measuring: 'courier',
    note: 'Lafia orders arrive by courier, mostly for weddings and church, measured at home.',
    occasions: ['Weddings', 'Church', 'Occasions'],
  },

  // ---------------- North East ----------------
  {
    slug: 'bauchi',
    city: 'Bauchi',
    state: 'Bauchi State',
    region: 'North East',
    deliveryDays: '5 to 6',
    measuring: 'courier',
    note: 'Bauchi orders are usually traditional and ceremony wear, cut modestly to the client\u2019s preference.',
    occasions: ['Traditional', 'Weddings', 'Occasions'],
  },
  {
    slug: 'gombe',
    city: 'Gombe',
    state: 'Gombe State',
    region: 'North East',
    deliveryDays: '5 to 6',
    measuring: 'courier',
    note: 'Gombe clients order mostly for weddings and family ceremonies, with measurements sent to us.',
    occasions: ['Weddings', 'Traditional', 'Occasions'],
  },
  {
    slug: 'maiduguri',
    city: 'Maiduguri',
    state: 'Borno State',
    region: 'North East',
    deliveryDays: '5 to 7',
    measuring: 'courier',
    note: 'Maiduguri orders go by courier. We allow a longer window and confirm the courier route before we promise a date.',
    occasions: ['Weddings', 'Traditional', 'Occasions'],
  },
  {
    slug: 'yola',
    city: 'Yola',
    state: 'Adamawa State',
    region: 'North East',
    deliveryDays: '5 to 7',
    measuring: 'courier',
    note: 'Yola orders are ceremony-led, usually traditional wear cut to preference, measured at home.',
    occasions: ['Traditional', 'Weddings', 'Occasions'],
  },
  {
    slug: 'jalingo',
    city: 'Jalingo',
    state: 'Taraba State',
    region: 'North East',
    deliveryDays: '5 to 7',
    measuring: 'courier',
    note: 'Jalingo clients order for ceremonies and church, with courier delivery and home measurements.',
    occasions: ['Ceremonies', 'Church', 'Occasions'],
  },
  {
    slug: 'damaturu',
    city: 'Damaturu',
    state: 'Yobe State',
    region: 'North East',
    deliveryDays: '5 to 7',
    measuring: 'courier',
    note: 'Damaturu orders come by courier with a longer window. We confirm the route before promising a date.',
    occasions: ['Traditional', 'Weddings', 'Occasions'],
  },

  // ---------------- North West ----------------
  {
    slug: 'kano',
    city: 'Kano',
    state: 'Kano State',
    region: 'North West',
    deliveryDays: '5 to 6',
    measuring: 'courier',
    note: 'Kano has its own deep textile history and a strong modest-dress tradition. We cut to the client\u2019s preference on coverage and length.',
    occasions: ['Traditional', 'Weddings', 'Modest wear'],
  },
  {
    slug: 'kaduna',
    city: 'Kaduna',
    state: 'Kaduna State',
    region: 'North West',
    deliveryDays: '4 to 6',
    measuring: 'courier',
    note: 'Kaduna orders mix corporate and traditional wear, often for weddings and work.',
    occasions: ['Corporate', 'Weddings', 'Traditional'],
  },
  {
    slug: 'katsina',
    city: 'Katsina',
    state: 'Katsina State',
    region: 'North West',
    deliveryDays: '5 to 6',
    measuring: 'courier',
    note: 'Katsina clients order traditional and ceremony pieces, cut modestly to preference, measured at home.',
    occasions: ['Traditional', 'Weddings', 'Occasions'],
  },
  {
    slug: 'dutse',
    city: 'Dutse',
    state: 'Jigawa State',
    region: 'North West',
    deliveryDays: '5 to 6',
    measuring: 'courier',
    note: 'Dutse orders arrive by courier, mostly for weddings and family ceremonies.',
    occasions: ['Weddings', 'Traditional', 'Occasions'],
  },
  {
    slug: 'sokoto',
    city: 'Sokoto',
    state: 'Sokoto State',
    region: 'North West',
    deliveryDays: '5 to 7',
    measuring: 'courier',
    note: 'Sokoto orders are traditional and ceremony-led, cut to the client\u2019s preference on coverage and length.',
    occasions: ['Traditional', 'Weddings', 'Modest wear'],
  },
  {
    slug: 'birnin-kebbi',
    city: 'Birnin Kebbi',
    state: 'Kebbi State',
    region: 'North West',
    deliveryDays: '5 to 7',
    measuring: 'courier',
    note: 'Birnin Kebbi orders come by courier with a longer window, mostly for ceremonies.',
    occasions: ['Ceremonies', 'Traditional', 'Occasions'],
  },
  {
    slug: 'gusau',
    city: 'Gusau',
    state: 'Zamfara State',
    region: 'North West',
    deliveryDays: '5 to 7',
    measuring: 'courier',
    note: 'Gusau clients order traditional wear for weddings and family events, measured at home.',
    occasions: ['Traditional', 'Weddings', 'Occasions'],
  },
]

/** Look a city up by its URL slug. */
export function getLocation(slug: string): Location | undefined {
  return LOCATIONS.find((location) => location.slug === slug)
}

/** Grouped by region, for the index page. */
export function locationsByRegion(): { region: Region; locations: Location[] }[] {
  const order: Region[] = [
    'South East',
    'South South',
    'South West',
    'North Central',
    'North East',
    'North West',
  ]
  return order.map((region) => ({
    region,
    locations: LOCATIONS.filter((location) => location.region === region),
  }))
}
