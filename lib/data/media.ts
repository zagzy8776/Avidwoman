import { createClient, isSupabaseConfigured } from '@/lib/supabase/server'

export type SlotImage = {
  image: string
  alt: string | null
  updatedAt: string
}

type SlotRow = { slot: string; image: string; alt: string | null; updated_at: string }

/**
 * Admin-managed overrides for the media slots defined in lib/media/slots.ts.
 * A slot override wins over the seeded value (e.g. a lookbook frame's image),
 * so the client can swap any hero / collection / lookbook visual without a
 * deploy. Media lives in Cloudinary; only the URL is stored here.
 */
export async function listSlotImages(): Promise<Record<string, SlotImage>> {
  if (!isSupabaseConfigured()) return {}
  const supabase = await createClient()
  const { data, error } = await supabase.from('media_slots').select('slot, image, alt, updated_at')
  if (error) throw new Error(`listSlotImages: ${error.message}`)

  const map: Record<string, SlotImage> = {}
  for (const row of data as unknown as SlotRow[]) {
    map[row.slot] = { image: row.image, alt: row.alt, updatedAt: row.updated_at }
  }
  return map
}

export async function setSlotImage(
  slot: string,
  image: string,
  alt: string | null = null,
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('media_slots')
    .upsert(
      { slot, image, alt, updated_at: new Date().toISOString() },
      { onConflict: 'slot' },
    )
  if (error) throw new Error(`setSlotImage: ${error.message}`)
}
