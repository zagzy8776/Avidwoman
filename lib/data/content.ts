import { createClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { CONTENT_BLOCK_KEYS, CONTENT_DEFAULTS, type ContentBlock, type ContentKey } from './types'

/**
 * Editorial copy the owner edits in Admin → Content → Page copy.
 *
 * Read is public (the storefront needs it); write is admin-only. Every read goes
 * through `contentWithDefaults` so a missing row falls back to the shipped copy
 * in CONTENT_DEFAULTS — the site can never render an empty headline because a
 * row was deleted.
 */

type ContentRow = {
  key: string
  label: string
  eyebrow: string | null
  title: string | null
  body: string | null
  cta_label: string | null
  cta_href: string | null
  image: string | null
  alt: string | null
}

function toBlock(row: ContentRow): ContentBlock {
  return {
    key: row.key,
    label: row.label,
    eyebrow: row.eyebrow ?? '',
    title: row.title ?? '',
    body: row.body ?? '',
    ctaLabel: row.cta_label ?? '',
    ctaHref: row.cta_href ?? '',
    image: row.image ?? '',
    alt: row.alt ?? '',
  }
}

/** All six blocks, in the order the admin lists them, defaults applied. */
export async function contentWithDefaults(): Promise<Record<ContentKey, ContentBlock>> {
  const rows = new Map<string, ContentBlock>()

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase.from('site_content').select('*')
      if (error) throw error
      for (const row of (data as unknown as ContentRow[]) ?? []) {
        rows.set(row.key, toBlock(row))
      }
    } catch (error) {
      // An unwritten or unmigrated table must never take the storefront down:
      // the shipped copy in CONTENT_DEFAULTS is the fallback, not a blank page.
      console.warn('contentWithDefaults: reading the shipped copy instead.', error)
    }
  }

  return Object.fromEntries(
    CONTENT_BLOCK_KEYS.map(({ key, label }) => {
      const saved = rows.get(key)
      return [key, { key, label, ...CONTENT_DEFAULTS[key], ...saved }]
    }),
  ) as Record<ContentKey, ContentBlock>
}

/** Write one block. Blank fields are stored as empty strings, not nulls. */
export async function updateContentBlock(
  key: ContentKey,
  input: Omit<ContentBlock, 'key' | 'label'>,
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('site_content')
    .upsert(
      {
        key,
        eyebrow: input.eyebrow,
        title: input.title,
        body: input.body,
        cta_label: input.ctaLabel,
        cta_href: input.ctaHref,
        image: input.image,
        alt: input.alt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' },
    )
  if (error) throw new Error(`updateContentBlock: ${error.message}`)
}
