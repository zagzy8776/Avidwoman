import SetupNotice from '@/components/admin/setup-notice'
import MediaManager from '@/components/admin/media-manager'
import { listLookbook } from '@/lib/data/lookbook'
import { listSlotImages } from '@/lib/data/media'
import { MEDIA_SLOTS } from '@/lib/media/slots'
import { isSupabaseConfigured } from '@/lib/supabase/server'

export default async function AdminContentPage() {
  if (!isSupabaseConfigured()) {
    return (
      <>
        <Header />
        <SetupNotice area="the banner &amp; photo manager" />
      </>
    )
  }

  const [slotImages, lookbook] = await Promise.all([listSlotImages(), listLookbook()])

  // Slot override wins; otherwise fall back to the seeded lookbook frame.
  const slots = MEDIA_SLOTS.map((slot) => ({
    id: slot.id,
    label: slot.label,
    group: slot.group,
    aspect: slot.aspect,
    cssAspect: slot.cssAspect,
    hint: slot.hint,
    image:
      slotImages[slot.id]?.image ??
      lookbook.find((frame) => frame.slot === slot.id)?.image ??
      null,
  }))

  return (
    <>
      <Header />
      <MediaManager slots={slots} />
    </>
  )
}

function Header() {
  return (
    <header className="admin-header">
      <div>
        <p className="eyebrow">CONTENT</p>
        <h1>Media manager</h1>
      </div>
    </header>
  )
}
