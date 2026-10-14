'use client'

import { useEffect, useRef, useState } from 'react'
import { saveSlotImage } from '@/app/admin/actions'

type SlotView = {
  id: string
  label: string
  group: string
  aspect: string
  cssAspect: string
  hint: string
  image: string | null
}

type WidgetResult = { event: string; info?: { secure_url: string } }

declare global {
  interface Window {
    cloudinary?: {
      createUploadWidget: (
        options: Record<string, unknown>,
        callback: (error: unknown, result: WidgetResult | null) => void,
      ) => { open: () => void }
    }
  }
}

const WIDGET_SRC = 'https://upload-widget.cloudinary.com/global/all.js'

/**
 * Banner / photo manager. Each slot is locked to the aspect ratio declared in
 * lib/media/slots.ts: the widget crops to that ratio, and delivery re-applies
 * it via slotImageUrl(), so a replacement can never break the layout.
 *
 * Cloudinary is the only media store — no Supabase storage alongside it.
 */
export default function MediaManager({ slots }: { slots: SlotView[] }) {
  const [ready, setReady] = useState(false)
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET

  useEffect(() => {
    if (window.cloudinary) {
      setReady(true)
      return
    }
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${WIDGET_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => setReady(true))
      return
    }
    const script = document.createElement('script')
    script.src = WIDGET_SRC
    script.async = true
    script.addEventListener('load', () => setReady(true))
    document.body.appendChild(script)
  }, [])

  return (
    <div className="media-slot-grid">
      {slots.map((slot) => (
        <SlotCard
          key={slot.id}
          slot={slot}
          ready={ready}
          cloudName={cloudName}
          preset={preset}
        />
      ))}
    </div>
  )
}

function SlotCard({
  slot,
  ready,
  cloudName,
  preset,
}: {
  slot: SlotView
  ready: boolean
  cloudName: string | undefined
  preset: string | undefined
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [preview, setPreview] = useState(slot.image ?? '')
  const configured = Boolean(cloudName && preset)

  const [wRatio, hRatio] = slot.aspect.split(':').map(Number)

  const openWidget = () => {
    if (!window.cloudinary || !cloudName || !preset) return

    const widget = window.cloudinary.createUploadWidget(
      {
        cloudName,
        uploadPreset: preset,
        folder: 'avid-woman-vogue',
        sources: ['local', 'url', 'camera'],
        cropping: true,
        croppingAspectRatio: hRatio ? wRatio / hRatio : 1,
        showSkipCropButton: false,
        croppingShowDimensions: true,
        clientAllowedFormats: ['png', 'jpg', 'jpeg', 'webp', 'avif'],
      },
      (error, result) => {
        if (error || !result || result.event !== 'success' || !result.info) return
        setPreview(result.info.secure_url)
        // Persist straight away so a slot is never left half-swapped.
        window.setTimeout(() => formRef.current?.requestSubmit(), 0)
      },
    )

    widget.open()
  }

  return (
    <div className="media-slot">
      <header>
        <strong>{slot.label}</strong>
        <span>{slot.aspect}</span>
      </header>

      <div className="media-slot-preview" style={{ aspectRatio: slot.cssAspect }}>
        {preview ? <img src={preview} alt="" /> : <em>{slot.group} · no image</em>}
      </div>

      <p>
        {slot.hint} Crop enforced at {slot.aspect} on delivery.
      </p>

      <form ref={formRef} action={saveSlotImage} className="slot-actions">
        <input type="hidden" name="slot" value={slot.id} />
        <input type="hidden" name="image" value={preview} />
        <button type="button" onClick={openWidget} disabled={!configured || !ready}>
          {configured ? 'Replace image' : 'Cloudinary not configured'}
        </button>
      </form>
    </div>
  )
}
