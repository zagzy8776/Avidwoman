import Link from 'next/link'
import { saveProduct } from '@/app/admin/actions'
import { COLLECTIONS, FABRICS, type Product } from '@/lib/data/types'
import VariantManager from './variant-manager'
import { SingleImageField } from './cloudinary-upload'

/** The badges the house actually uses, offered as a select rather than a guess. */
const TAGS = ['', 'New', 'Exclusive', 'Limited', 'Last pieces']

/**
 * Shared create/edit form. Posts straight to the saveProduct server action,
 * which writes to Supabase (product row + colour variants). `allProducts` is
 * only used to offer the related-pieces picker by name.
 */
export default function ProductForm({
  product,
  allProducts = [],
}: {
  product?: Product
  allProducts?: Product[]
}) {
  return (
    <form className="admin-form" action={saveProduct}>
      {product ? <input type="hidden" name="id" value={product.id} /> : null}

      <div className="admin-form-row">
        <label>
          Name
          <input name="name" defaultValue={product?.name ?? ''} required />
        </label>
        <label>
          Collection
          <select name="collection" defaultValue={product?.collection ?? COLLECTIONS[0]}>
            {COLLECTIONS.map((collection) => (
              <option key={collection} value={collection}>
                {collection}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label>
        Description
        <textarea
          name="description"
          rows={3}
          defaultValue={product?.description ?? ''}
          placeholder="Two or three lines in your own words."
        />
        <small className="admin-hint">
          Shown on the product page and in quick view. Leave it empty and the site writes a line
          from the fabric and collection instead.
        </small>
      </label>

      <div className="admin-form-row">
        <label>
          Price
          <input name="price" type="number" min="0" step="0.01" defaultValue={product?.price ?? 0} />
        </label>
        <label>
          Currency
          <select name="currency" defaultValue={product?.currency ?? 'USD'}>
            <option value="USD">USD | US Dollar</option>
            <option value="NGN">NGN | Naira</option>
            <option value="GBP">GBP | Pound</option>
            <option value="EUR">EUR | Euro</option>
          </select>
        </label>
      </div>

      <div className="single-image-field">
        <span className="variant-photo-label">
          Cover image
          <span className="variant-photo-count">
            Shown on cards and as the first view on the product page
          </span>
        </span>
        <SingleImageField
          name="image"
          value={product?.image}
          folder={`avid-woman-vogue/products/${product?.id ?? 'new'}/cover`}
          hint="The first colour's photo is what the shop shows when a colour is selected."
        />
      </div>
      <label>
        Alt text
        <input name="alt" defaultValue={product?.alt ?? ''} />
      </label>

      <div className="admin-form-row">
        <label>
          Badge
          <select name="tag" defaultValue={product?.tag ?? ''}>
            {TAGS.map((tag) => (
              <option key={tag} value={tag}>
                {tag || 'None'}
              </option>
            ))}
          </select>
        </label>
        <label>
          Fabric
          <select name="fabric" defaultValue={product?.fabric ?? ''}>
            <option value="">None</option>
            {FABRICS.map((fabric) => (
              <option key={fabric} value={fabric}>
                {fabric}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="admin-form-row">
        <label>
          Origin
          <input name="origin" defaultValue={product?.origin ?? ''} placeholder="e.g. Abeokuta, Ogun State" />
        </label>
        <label>
          Inventory
          <input name="inventory" type="number" min="0" defaultValue={product?.inventory ?? 0} />
        </label>
      </div>

      <label>
        Care notes
        <textarea name="careNotes" defaultValue={product?.careNotes ?? ''} />
      </label>

      <div className="admin-form-row">
        <label className="admin-checkbox">
          <input type="checkbox" name="inquiryOnly" defaultChecked={product?.inquiryOnly ?? false} />
          Wholesale enquiry only (hides Add to bag)
        </label>
        <label>
          Minimum quantity
          <input name="minQty" type="number" min="1" defaultValue={product?.minQty ?? 1} />
        </label>
      </div>

      <VariantManager variants={product?.variants ?? []} productId={product?.id} />

      <label className="admin-fieldset related-picker">
        Related pieces
        <select
          multiple
          name="relatedIds"
          size={6}
          defaultValue={(product?.relatedIds ?? []).map((id) => String(id))}
        >
          {allProducts
            .filter((candidate) => candidate.id !== product?.id)
            .map((candidate) => (
              <option key={candidate.id} value={String(candidate.id)}>
                {candidate.name}
              </option>
            ))}
        </select>
        <small className="admin-hint">
          Hold Ctrl (Cmd on Mac) to pick more than one. Shown in this order under “See also” on the
          product page. Select none and the site chooses for you. The same collection first, then
          the closest fabric.
        </small>
      </label>

      <label className="admin-checkbox admin-archive">
        <input type="checkbox" name="archived" defaultChecked={product?.archived ?? false} />
        Archived: keep the record and its colours, but remove it from the shop, search and related
        rows. Nothing is deleted.
      </label>

      <div className="admin-actions">
        <button className="gold-button" type="submit">
          {product ? 'Save changes' : 'Create product'}
        </button>
        {product ? (
          <Link className="text-link" href={`/?product=${product.id}`} target="_blank">
            View on site ↗
          </Link>
        ) : null}
        <Link className="text-link" href="/admin/products">
          Cancel
        </Link>
      </div>
    </form>
  )
}

