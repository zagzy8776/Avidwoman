'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * Cloudinary upload — the one place the widget is loaded and configured.
 *
 * Shared by the media manager and the product variant uploader so the widget
 * script is fetched once and every upload lands in the same account and preset.
 * Media lives in Cloudinary; only the URL is stored in Supabase.
 */

const WIDGET_SRC = 'https://upload-widget.cloudinary.com/global/all.js'

/** Product media box on the storefront (.product-media uses aspect-ratio: 0.73). */
export const PRODUCT_CROP = 0.73

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

export function useCloudinary() {
  const [ready, setReady] = useState(false)
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
  const configured = Boolean(cloudName && preset)

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

  const open = useCallback(
    (options: Record<string, unknown>, onSuccess: (url: string) => void) => {
      if (!window.cloudinary || !cloudName || !preset) return
      const widget = window.cloudinary.createUploadWidget(
        { cloudName, uploadPreset: preset, ...options },
        (error, result) => {
          if (error || !result || result.event !== 'success' || !result.info) return
          onSuccess(result.info.secure_url)
        },
      )
      widget.open()
    },
    [cloudName, preset],
  )

  return { ready, configured, open }
}

/**
 * Image list with upload. Replaces the "one URL per line" textarea: the owner
 * uploads straight from the widget, sees what each slot holds, and can reorder
 * or remove without touching a URL.
 *
 * The first image is the primary shot (card + PDP); the rest become gallery
 * angles, which is what lights up the strip on the product page.
 */
export function ImageUploader({
  images,
  onChange,
  folder,
  crop = PRODUCT_CROP,
  hint,
}: {
  images: string[]
  onChange: (next: string[]) => void
  /** Cloudinary folder, so uploads stay grouped per product and colour. */
  folder: string
  /** Crop ratio, or null to upload uncropped. */
  crop?: number | null
  hint?: string
}) {
  const { ready, configured, open } = useCloudinary()
  const [urlDraft, setUrlDraft] = useState('')

  const upload = () =>
    open(
      {
        folder,
        sources: ['local', 'url', 'camera'],
        cropping: crop != null,
        croppingAspectRatio: crop ?? undefined,
        showSkipCropButton: false,
        croppingShowDimensions: true,
        clientAllowedFormats: ['png', 'jpg', 'jpeg', 'webp', 'avif'],
      },
      (url) => onChange([...images, url]),
    )

  const remove = (index: number) => onChange(images.filter((_, i) => i !== index))
  const makePrimary = (index: number) => {
    if (index === 0) return
    const next = [...images]
    const [picked] = next.splice(index, 1)
    onChange([picked, ...next])
  }

  const addFromUrl = () => {
    const url = urlDraft.trim()
    if (!url) return
    onChange([...images, url])
    setUrlDraft('')
  }

  return (
    <div className="image-uploader">
      {images.length > 0 && (
        <ul className="uploader-thumbs">
          {images.map((url, index) => (
            <li key={`${url}-${index}`}>
              <img src={url} alt="" />
              {index === 0 ? (
                <span className="thumb-primary">Primary</span>
              ) : (
                <button type="button" onClick={() => makePrimary(index)}>
                  Make primary
                </button>
              )}
              <button type="button" className="thumb-remove" onClick={() => remove(index)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="uploader-actions">
        <button type="button" className="outline-button" onClick={upload} disabled={!configured || !ready}>
          {configured ? (images.length ? 'Add another angle' : 'Upload photo') : 'Cloudinary not configured'}
        </button>

        {/* Pasting a URL still works — the seeded stock shots are URLs, and an
            existing hosted library may already be in place. */}
        <span className="uploader-or">or</span>
        <input
          value={urlDraft}
          onChange={(event) => setUrlDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              addFromUrl()
            }
          }}
          placeholder="Paste an image URL"
          aria-label="Add an image by URL"
        />
        <button type="button" onClick={addFromUrl} disabled={!urlDraft.trim()}>
          Add
        </button>
      </div>

      <p className="variant-row-hint">
        {hint ??
          (images.length
            ? `${images.length} image${images.length === 1 ? '' : 's'} · first is primary, the rest are gallery angles`
            : 'Upload from the same shoot and framing as the other colours.')}
      </p>
    </div>
  )
}

/**
 * Single-image field for the product row's cover shot. Keeps the field named
 * `image` (and posted as a hidden input) so saveProduct needs no changes — the
 * owner just uploads instead of pasting a URL.
 */
export function SingleImageField({
  name,
  value,
  folder,
  hint,
}: {
  name: string
  value?: string
  folder: string
  hint?: string
}) {
  const [image, setImage] = useState(value ?? '')

  return (
    <div className="single-image-field">
      <input type="hidden" name={name} value={image} />
      <ImageUploader
        images={image ? [image] : []}
        onChange={(next) => setImage(next[0] ?? '')}
        folder={folder}
        hint={hint}
      />
    </div>
  )
}
