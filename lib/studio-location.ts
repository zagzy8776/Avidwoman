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

/** The exact studio pin as "lat,lng". Empty until it is confirmed. */
export const STUDIO_PIN = ''

/**
 * What the map falls back to while the pin is empty. Searching by name is
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
