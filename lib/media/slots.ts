/**
 * Media slots — the single place aspect ratios are declared.
 *
 * The admin upload widget and the storefront both read this registry, so a
 * slot can never be cropped one way in the console and another on the site.
 * Cloudinary enforces the ratio server-side via c_fill,ar_<ratio>,g_auto.
 *
 * Cloudinary is the ONLY media store (no Supabase storage alongside it).
 */

export type MediaSlotGroup = 'Hero' | 'Collections' | 'Lookbook' | 'Editorial'

export type MediaSlot = {
  /** Stable id used in the DB (e.g. products.media_slot / lookbook.slot). */
  id: string
  label: string
  group: MediaSlotGroup
  /** Cloudinary aspect ratio, e.g. "16:9". */
  aspect: string
  /** CSS aspect-ratio for the admin preview tile. */
  cssAspect: string
  hint: string
}

export const MEDIA_SLOTS: MediaSlot[] = [
  {
    id: 'hero',
    label: 'Homepage hero',
    group: 'Hero',
    aspect: '16:9',
    cssAspect: '16 / 9',
    hint: 'Full-bleed hero. Keep the subject centre-right.',
  },
  {
    id: 'collection:signature',
    label: 'Collection · Signature 01',
    group: 'Collections',
    aspect: '4:5',
    cssAspect: '4 / 5',
    hint: 'Portrait. Collection card on the home page.',
  },
  {
    id: 'collection:couture',
    label: 'Collection · Couture',
    group: 'Collections',
    aspect: '4:5',
    cssAspect: '4 / 5',
    hint: 'Portrait. Collection card on the home page.',
  },
  {
    id: 'heritage:1',
    label: 'Heritage band · primary',
    group: 'Editorial',
    aspect: '3:4',
    cssAspect: '3 / 4',
    hint: 'Portrait. Ankara / Heritage band.',
  },
  {
    id: 'heritage:2',
    label: 'Heritage band · secondary',
    group: 'Editorial',
    aspect: '3:4',
    cssAspect: '3 / 4',
    hint: 'Portrait. Ankara / Heritage band.',
  },
  {
    id: 'lookbook:01',
    label: 'Lookbook frame 01',
    group: 'Lookbook',
    aspect: '3:4',
    cssAspect: '3 / 4',
    hint: 'Editorial frame.',
  },
  {
    id: 'lookbook:02',
    label: 'Lookbook frame 02',
    group: 'Lookbook',
    aspect: '3:4',
    cssAspect: '3 / 4',
    hint: 'Editorial frame.',
  },
  {
    id: 'lookbook:03',
    label: 'Lookbook frame 03',
    group: 'Lookbook',
    aspect: '3:4',
    cssAspect: '3 / 4',
    hint: 'Editorial frame.',
  },
]

export function getSlot(id: string): MediaSlot | undefined {
  return MEDIA_SLOTS.find((slot) => slot.id === id)
}

/**
 * Delivery URL that forces the slot's crop. `g_auto` keeps the subject in
 * frame; returns the input untouched when Cloudinary isn't configured yet.
 */
export function slotImageUrl(publicIdOrUrl: string, slotId: string): string {
  const slot = getSlot(slotId)
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  if (!slot || !cloud || !publicIdOrUrl) return publicIdOrUrl
  return `https://res.cloudinary.com/${cloud}/image/upload/c_fill,ar_${slot.aspect},g_auto,f_auto,q_auto/${publicIdOrUrl}`
}
