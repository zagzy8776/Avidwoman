'use client'

import { useState } from 'react'
import type { ProductVariant } from '@/lib/data/types'
import { ImageUploader } from './cloudinary-upload'

type Draft = {
  id?: number
  colorName: string
  colorHex: string
  sku: string
  stock: number
  price: string
  sizes: string[]
  images: string
  hidden: boolean
}

const ALL_SIZES = ['XS', 'S', 'M', 'L', 'XL']

function toDraft(variant: ProductVariant): Draft {
  return {
    id: variant.id,
    colorName: variant.colorName,
    colorHex: variant.colorHex,
    sku: variant.sku ?? '',
    stock: variant.stock,
    price: variant.price === null ? '' : String(variant.price),
    sizes: variant.sizes,
    images: variant.images.join('\n'),
    hidden: variant.hidden,
  }
}

function toInput(draft: Draft, index: number) {
  return {
    id: draft.id,
    colorName: draft.colorName.trim() || `Colour ${index + 1}`,
    colorHex: draft.colorHex.trim() || '#0A0A0A',
    sku: draft.sku.trim() || null,
    stock: Number.isFinite(draft.stock) ? draft.stock : 0,
    price: draft.price.trim() === '' ? null : Number(draft.price),
    sizes: draft.sizes,
    images: draft.images.split('\n').map((line) => line.trim()).filter(Boolean),
    hidden: draft.hidden,
    position: index,
  }
}

/**
 * Colour variant manager — add/remove/rename colours, set HEX, SKU, stock,
 * per-variant price, size availability and the photography. Uploads go straight
 * to Cloudinary through the shared widget; the image list serialises to the
 * hidden `variants` input consumed by the saveProduct server action.
 *
 * A colour with no images still renders greyed as "Photo on request" on the
 * storefront and cannot be selected — and no other colour's photo is ever
 * borrowed for it.
 */
export default function VariantManager({
  variants,
  productId,
}: {
  variants: ProductVariant[]
  productId?: number
}) {
  const [drafts, setDrafts] = useState<Draft[]>(variants.map(toDraft))

  /** Colours with no photography — these render greyed on the storefront. */
  const pendingPhotography = drafts.filter((draft) => draft.images.trim() === '').length

  const patch = (index: number, changes: Partial<Draft>) => {
    setDrafts((current) => current.map((draft, i) => (i === index ? { ...draft, ...changes } : draft)))
  }

  const addVariant = () => {
    setDrafts((current) => [
      ...current,
      { colorName: '', colorHex: '#0A0A0A', sku: '', stock: 0, price: '', sizes: [...ALL_SIZES], images: '', hidden: false },
    ])
  }

  const removeVariant = (index: number) => {
    setDrafts((current) => current.filter((_, i) => i !== index))
  }

  const move = (index: number, delta: number) => {
    setDrafts((current) => {
      const next = [...current]
      const target = index + delta
      if (target < 0 || target >= next.length) return current
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }
  return (
    <div className="variant-manager">
      <input type="hidden" name="variants" value={JSON.stringify(drafts.map(toInput))} />

      <div className="variant-manager-head">
        <h3>Colour variants</h3>
        <p>
          Each colour is a real variant with its own photography, SKU and stock. Upload images directly from the
          same shoot and framing — <strong>first image primary, additional ones become gallery angles</strong> on
          the product page. A colour left without an image renders greyed as <em> Photo on request</em> on the
          storefront and cannot be selected; no other colour&apos;s photo is shown in its place.
        </p>
        <p className="variant-photo-status">
          <strong>
            {drafts.length - pendingPhotography} of {drafts.length} colour{drafts.length === 1 ? '' : 's'} photographed
          </strong>
          {pendingPhotography > 0 && (
            <>
              {' · '}
              {pendingPhotography} awaiting photography
              {' ('}
              {drafts
                .filter((draft) => draft.images.trim() === '')
                .map((draft) => draft.colorName.trim() || 'unnamed')
                .join(', ')}
              {')'}
            </>
          )}
        </p>
      </div>

      {drafts.length === 0 && <p className="variant-empty">No colours yet — the shop falls back to the main image.</p>}

      {pendingPhotography > 0 && (
        <p className="variant-manager-warning">
          {pendingPhotography} colour{drafts.length === 1 ? '' : 's'} of {drafts.length}{' '}
          {pendingPhotography === 1 ? 'has' : 'have'} no image yet — greyed as <em>Photo on request</em> and
          unselectable on the storefront until one is added.
        </p>
      )}

      {drafts.map((draft, index) => (
        <fieldset className="variant-row" key={draft.id ?? `new-${index}`}>
          <legend>
            <span className="variant-dot" style={{ background: draft.colorHex }} aria-hidden="true" />
            {draft.colorName || `Colour ${index + 1}`}
            {draft.hidden && <em>hidden</em>}
          </legend>

          <div className="admin-form-row">
            <label>
              Colour name
              <input value={draft.colorName} onChange={(e) => patch(index, { colorName: e.target.value })} placeholder="Champagne" />
            </label>
            <label>
              HEX
              <span className="variant-hex">
                <input type="color" value={draft.colorHex} onChange={(e) => patch(index, { colorHex: e.target.value })} aria-label="Colour picker" />
                <input value={draft.colorHex} onChange={(e) => patch(index, { colorHex: e.target.value })} placeholder="#D4AF37" />
              </span>
            </label>
          </div>

          <div className="admin-form-row">
            <label>
              SKU
              <input value={draft.sku} onChange={(e) => patch(index, { sku: e.target.value })} placeholder="AVW-0001-CHAMPAGNE" />
            </label>
            <label>
              Stock
              <input type="number" min="0" value={draft.stock} onChange={(e) => patch(index, { stock: Number(e.target.value) })} />
            </label>
            <label>
              Price override (optional)
              <input type="number" min="0" step="0.01" value={draft.price} onChange={(e) => patch(index, { price: e.target.value })} placeholder="inherit" />
            </label>
          </div>

          <div className="variant-photo-field">
            <span className="variant-photo-label">
              Photography
              <span className={`variant-photo-count ${draft.images.trim() === '' ? 'is-empty' : ''}`}>
                {draft.images.trim() === ''
                  ? 'No images — photo on request'
                  : `${draft.images.split('\n').filter((line) => line.trim()).length} image(s)`}
              </span>
            </span>
            <ImageUploader
              images={draft.images.split('\n').map((line) => line.trim()).filter(Boolean)}
              onChange={(next) => patch(index, { images: next.join('\n') })}
              folder={`avid-woman-vogue/products/${productId ?? 'new'}/${draft.sku.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || `colour-${index + 1}`}`}
            />
          </div>
          {draft.images.trim() === '' && (
            <p className="variant-row-warning">
              No photography yet — this colour shows greyed as <em>Photo on request</em> and can&apos;t be
              selected. Add a shot from the same shoot and framing as the other colours.
            </p>
          )}
          <div className="admin-form-row variant-meta">
            <div className="variant-sizes">
              <span>Sizes</span>
              {ALL_SIZES.map((size) => (
                <label key={size} className="admin-checkbox">
                  <input
                    type="checkbox"
                    checked={draft.sizes.includes(size)}
                    onChange={(e) =>
                      patch(index, {
                        sizes: e.target.checked ? [...draft.sizes, size] : draft.sizes.filter((s) => s !== size),
                      })
                    }
                  />
                  {size}
                </label>
              ))}
            </div>
            <label className="admin-checkbox">
              <input type="checkbox" checked={draft.hidden} onChange={(e) => patch(index, { hidden: e.target.checked })} />
              Hidden from shop
            </label>
          </div>

          <div className="variant-row-actions">
            <button type="button" onClick={() => move(index, -1)} aria-label="Move up">↑</button>
            <button type="button" onClick={() => move(index, 1)} aria-label="Move down">↓</button>
            <button type="button" className="variant-remove" onClick={() => removeVariant(index)}>Remove colour</button>
          </div>
        </fieldset>
      ))}

      <button type="button" className="outline-button variant-add" onClick={addVariant}>+ Add colour</button>
    </div>
  )
}

