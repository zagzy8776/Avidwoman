/**
 * Where the studio actually is — one place, three consumers.
 *
 * WHY THIS EXISTS: three parts of the site describe the same location, and
 * Google compares all of them:
 *
 *   1. The map embed on the contact page.
 *   2. The "Get directions" link that opens Google Maps.
 *   3. The geo coordinates in the ClothingStore structured data.
 *
 * When those three disagree, Google trusts none of them and the business gets
 * placed somewhere in the middle. Before this file existed the structured data
 * carried Owerri city-centre coordinates (5.4836, 7.0332) while the map searched
 * for a business name, so the site was describing two different places at once.
 *
 * FILLING IN THE PIN
 * ------------------
 * Open Google Maps, long-press the exact spot at the gate, and copy the pair of
 * numbers that appears (they look like 5.483600, 7.033200). Paste them into
 * STUDIO_PIN as "lat,lng". Everything else follows automatically, including the
 * structured data.
 *
 * A pin beats a name search for a practical reason: a name search makes Google
 * guess which pin the name belongs to, and a guess can put a car on the wrong
 * street. A coordinate pair cannot be misread.
 */

/**
 * The exact studio pin as "lat,lng". Confirmed by the house.
 *
 * Reverse geocoding puts this on a tertiary road in Mbieri, Mbaitoli, Imo State,
 * which is the Owerri metropolitan area. Marketing copy still says Owerri,
 * because that is what customers search for; the pin itself is exact.
 */
export const STUDIO_PIN = '5.538912528651021,7.057267659048106'

/**
 * One stop on the guided approach.
 */
export type ApproachStep = {
  /** "lat,lng", exactly as the house drew it. */
  coords: string
  /** How it is described to the customer. Plain words, no coordinates shown. */
  label: string
}

/**
 * The route the house wants customers to drive, drawn by hand, in order.
 *
 * WHY A LOOP AND NOT A SINGLE POINT: the obvious route to the studio crosses a
 * stretch of road where customers meet standing water. Fixing only the start
 * point would not have helped, because Google still chooses the last mile, and it
 * chooses it for being short rather than for being sensible.
 *
 * So every turn is pinned. Google Maps directions accepts up to nine waypoints,
 * and a waypoint must be passed through rather than merely passed near. That
 * takes the decision of which road to drive away from Google and gives it to the
 * house. The result is roughly 10 km, where a straight line would be far less,
 * and that is the point: it goes the long way round on purpose.
 *
 * GEOGRAPHY, for anyone reading this later: the stops run through Ubomiri
 * (Owerri North and Mbaitoli), then Akabo, then into Mbieri, all in Imo State.
 * The roads there carry no name in OpenStreetMap, which is why the labels use
 * landmarks and instructions instead of street names.
 *
 * The customer does not drive to stop one and then ask for directions. The whole
 * sequence IS the directions: one tap opens Maps with all of it loaded.
 *
 * Leave the array empty and directions revert to normal behaviour, starting from
 * wherever the customer happens to be.
 */
export const STUDIO_APPROACH: ApproachStep[] = [
  { coords: '5.521370507008352, 7.050358553910494', label: 'Start here' },
  {
    coords: '5.5271003248673205, 7.045823555237026',
    label: 'Follow this road up through Ubomiri',
  },
  {
    coords: '5.534487240176959, 7.040736933067511',
    label: 'Where the road ends, turn towards St Benignus',
  },
  { coords: '5.541514691986214, 7.0440960889744115', label: 'Pass St Benignus' },
  { coords: '5.541471773131828, 7.049018334247288', label: 'Keep going' },
  {
    coords: '5.541852601659365, 7.054081122465442',
    label: 'At this junction turn right for Millennium Hotel',
  },
  {
    coords: '5.53744726596239, 7.058153663431946',
    label: 'Stop here and call the studio',
  },
]

/**
 * What the map falls back to if STUDIO_PIN is ever cleared. Searching by name is
 * weaker than a pin, but it is better than sending a customer nowhere.
 */
export const STUDIO_MAP_QUERY = 'Avid Woman Vogue, Owerri, Imo State, Nigeria'

/**
 * One line of help for the last stretch, for example "Opposite the filling
 * station on Wetheral Road". Left empty, the line does not render anywhere.
 *
 * Keep it to a landmark. The site never needs to comment on the state of any
 * road; a landmark and a phone number do that work quietly.
 */
export const STUDIO_LANDMARK = ''

/**
 * Owerri city centre. Used for structured data only while STUDIO_PIN is empty,
 * so the schema always carries a plausible coordinate rather than none.
 */
const FALLBACK_COORDS = { latitude: '5.4836', longitude: '7.0332' }

/** What the map should aim at: the exact pin when set, otherwise the name. */
export function mapTarget(): string {
  return STUDIO_PIN || STUDIO_MAP_QUERY
}

/**
 * Latitude and longitude for structured data, read from STUDIO_PIN so the schema
 * and the map can never drift apart. Falls back to the city centre.
 */
export function studioCoords(): { latitude: string; longitude: string } {
  const [lat, lng] = STUDIO_PIN.split(',').map((part) => part.trim())
  if (lat && lng) return { latitude: lat, longitude: lng }
  return FALLBACK_COORDS
}

/**
 * The Google Maps directions link.
 *
 * With STUDIO_APPROACH drawn, the first stop becomes the origin, the last becomes
 * the destination, and everything between is passed to Maps as waypoints. Maps
 * must route through each one in order, which is what makes the long way the way
 * every customer goes.
 *
 * Google limits a directions URL to nine waypoints; seven stops leaves room for
 * two more before that needs revisiting.
 *
 * With the array empty, the origin is left out entirely and Maps routes from
 * wherever the customer is.
 */
export function studioDirectionsUrl(): string {
  const guided = STUDIO_APPROACH.length >= 2

  const params = new URLSearchParams({
    api: '1',
    destination: guided ? STUDIO_APPROACH[STUDIO_APPROACH.length - 1].coords : mapTarget(),
    travelmode: 'driving',
  })

  if (guided) {
    const [, ...middle] = STUDIO_APPROACH
    params.set('origin', STUDIO_APPROACH[0].coords)
    if (middle.length > 1) {
      params.set(
        'waypoints',
        middle
          .slice(0, -1)
          .map((step) => step.coords)
          .join('|'),
      )
    }
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`
}

/**
 * Whether the house has drawn a guided route. The page uses this to decide
 * whether to show the route steps, so the list never renders half-written.
 */
export function hasApproachRoute(): boolean {
  return STUDIO_APPROACH.length >= 2
}

