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
 * The junction that directions should START from.
 *
 * WHY THIS EXISTS: a route that begins at the customer's own location will
 * follow whichever road Google thinks is shortest, and that road may not be one
 * you want a customer to drive. Fixing the origin forces every arrival along the
 * route you choose, from the direction you choose.
 *
 * Fill this in with the coordinates of the junction the house wants people to
 * approach from, in the same "lat,lng" form. The customer first drives to that
 * junction themselves, then taps the button and follows the route in.
 *
 * Left empty, directions behave normally and start from wherever the customer is.
 */
export const STUDIO_APPROACH_FROM = ''

/**
 * How that junction is named on the page, for example "the Okigwe Road
 * junction". Shown next to the directions button so the instruction reads as a
 * sentence rather than as a pair of numbers.
 */
export const STUDIO_APPROACH_LABEL = ''

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
 * With STUDIO_APPROACH_FROM set, the origin is pinned to that junction, so the
 * route is the same for every customer regardless of which side of town they
 * started from. That is the whole point: it takes the choice of road away from
 * Google and gives it to the house.
 *
 * With it empty, the origin is left out and Maps routes from wherever the
 * customer is.
 */
export function studioDirectionsUrl(): string {
  const params = new URLSearchParams({
    api: '1',
    destination: mapTarget(),
    travelmode: 'driving',
  })

  if (STUDIO_APPROACH_FROM) {
    params.set('origin', STUDIO_APPROACH_FROM)
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`
}

/**
 * Whether the house has set an approach junction. The page uses this to decide
 * whether to mention it, so the instruction never renders half-written.
 */
export function hasApproachRoute(): boolean {
  return Boolean(STUDIO_APPROACH_FROM && STUDIO_APPROACH_LABEL)
}

