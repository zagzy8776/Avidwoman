import { createClient, isSupabaseConfigured } from '@/lib/supabase/server'
import type { LookbookFrame } from './types'

const SELECT = 'id, number, image, alt, slot, position'

type LookbookRow = {
  id: number
  number: string
  image: string
  alt: string
  slot: string | null
  position: number
}

function toFrame(row: LookbookRow): LookbookFrame {
  return {
    id: Number(row.id),
    number: row.number,
    image: row.image,
    alt: row.alt,
    slot: row.slot,
    position: row.position,
  }
}

export async function listLookbook(): Promise<LookbookFrame[]> {
  if (!isSupabaseConfigured()) return []
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('lookbook')
    .select(SELECT)
    .order('position', { ascending: true })
  if (error) throw new Error(`listLookbook: ${error.message}`)
  return (data as unknown as LookbookRow[]).map(toFrame)
}

/** Used by the admin media manager to swap a slot's image. */
export async function updateFrameImage(
  id: number,
  image: string,
  alt?: string,
): Promise<void> {
  const supabase = await createClient()
  const patch: Record<string, unknown> = { image }
  if (alt !== undefined) patch.alt = alt
  const { error } = await supabase.from('lookbook').update(patch).eq('id', id)
  if (error) throw new Error(`updateFrameImage: ${error.message}`)
}
