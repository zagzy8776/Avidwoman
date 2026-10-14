/**
 * Single source of truth for the shape of every record the storefront and the
 * admin console share. Both read through lib/data/*, so a column change is a
 * one-file change here.
 */

export const FABRICS = ['Ankara', 'Adire', 'Aso-Oke', 'Lace', 'Silk', 'Other'] as const
export type Fabric = (typeof FABRICS)[number]

export const COLLECTIONS = ['SIGNATURE 01', 'EVENING', 'HERITAGE', 'ESSENTIALS', 'COUTURE'] as const
export type Collection = string

export const SIZES = ['XS', 'S', 'M', 'L', 'XL'] as const
export type Size = (typeof SIZES)[number]

export type Product = {
  id: number
  sku: string | null
  name: string
  collection: Collection
  price: number
  /**
   * Optional sale price.
   * TODO(data-layer): add `sale_price numeric(10, 2)` to public.products, map it
   * in lib/data/products.ts and expose it in the admin product form. Nothing
   * sets it yet and no discount is ever invented without it — the card and the
   * PDP only render a struck-through price when this is present.
   */
  salePrice?: number | null
  currency: string
  image: string
  alt: string
  /**
   * Short line shown on the card badge (New / Exclusive / Limited). Kept as free
   * text so the house can coin its own; the admin form offers the usual three.
   */
  tag: string | null
  /**
   * Written by the owner in Admin → Products → Edit. When present the product
   * page and quick view use it verbatim; when empty the storefront falls back to
   * the sentence generated from fabric + collection (see productDescription in
   * components/avid-app.tsx), so nothing breaks before it is written.
   */
  description: string | null
  /**
   * Archived pieces stay in the catalogue (and in past orders) but are removed
   * from the shop, search, home page and related rows. This is the safe way to
   * retire a piece — Delete permanently removes the row and its colours.
   */
  archived: boolean
  /** Nigerian market fit — drives the shop "Fabric" facet and the heritage chips. */
  fabric: Fabric | null
  origin: string | null
  careNotes: string | null
  inventory: number
  /** Wholesale / bulk: when true the PDP shows an enquiry path instead of Add to bag. */
  inquiryOnly: boolean
  minQty: number
  /**
   * Owner-chosen related pieces, shown in order on the product page. When empty
   * the storefront computes its own (same collection, then same fabric), so the
   * row is never empty and never shows the piece you are already on.
   */
  relatedIds: number[] | null
  createdAt: string
  /** Real colour variants (own images, SKU, stock, sizes). Sorted by position. */
  variants: ProductVariant[]
}

/**
 * A real commerce colour variant — NOT a CSS tint. Each colour carries its own
 * photography, SKU, stock and size availability. images[0] is the primary shot.
 * price = null means the variant inherits the product price.
 */
export type ProductVariant = {
  id: number
  productId: number
  colorName: string
  colorHex: string
  sku: string | null
  stock: number
  price: number | null
  sizes: string[]
  images: string[]
  hidden: boolean
  position: number
}

/** Admin form payload for one variant (id absent = new record). */
export type ProductVariantInput = Omit<ProductVariant, 'id' | 'productId'> & { id?: number }

/** Row columns only — variants are managed separately via syncProductVariants. */
export type ProductInput = Omit<Product, 'id' | 'sku' | 'createdAt' | 'variants'>

export type LookbookFrame = {
  id: number
  number: string
  image: string
  alt: string
  /** Media-manager slot this frame is bound to (see lib/media/slots.ts). */
  slot: string | null
  position: number
}

export const ORDER_STATUSES = [
  'Processing',
  'Shipped',
  'Delivered',
  'Returned',
  'Cancelled',
] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const ORDER_TYPES = ['retail', 'wholesale'] as const
export type OrderType = (typeof ORDER_TYPES)[number]

/* ------------------------------------------------------------------
   PAYMENT — MANUAL BANK TRANSFER (this phase).

   There is NO payment gateway and no provider to integrate: the client
   controls payment herself. Checkout therefore collects nothing but the
   order, and the shopper is told where to send the money. Two things
   follow from that and are load-bearing:

     1. An order is created with paymentStatus 'pending-payment'. It stays
        there indefinitely — nothing expires or cancels it — until the
        atelier sees the transfer in her bank app and marks it paid.
     2. Each order carries a SNAPSHOT of the bank details the customer was
        shown (see Order.bankDetails). If she changes banks next year, her
        old orders must still say what that customer was told to pay into.

   If a gateway is ever agreed (Paystack for NGN, Stripe for FX), the
   method list below is where it starts — the checkout page reads the
   method from here rather than hard-coding tiles.
------------------------------------------------------------------ */
export const PAYMENT_METHODS = ['bank-transfer'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const PAYMENT_STATUSES = ['pending-payment', 'paid', 'refunded'] as const
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

/** Customer-facing wording for a payment status badge. */
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  'pending-payment': 'Pending payment',
  paid: 'Paid',
  refunded: 'Refunded',
}

/** The house's account, as shown to the shopper and snapshotted on the order. */
export type BankDetails = {
  bankName: string
  accountNumber: string
  accountName: string
}

export const EMPTY_BANK_DETAILS: BankDetails = {
  bankName: '',
  accountNumber: '',
  accountName: '',
}

/**
 * True once the atelier has entered enough for a client to actually pay into.
 * The checkout page uses this to stay honest: with no account on file it says
 * the details are coming by email instead of showing a blank "pay here" block.
 */
export function hasBankDetails(details?: BankDetails | null): details is BankDetails {
  return Boolean(
    details && details.bankName.trim() && details.accountNumber.trim() && details.accountName.trim(),
  )
}

/** One line of an order. unitPrice is the price the SERVER resolved at checkout. */
export type OrderItem = {
  productId: number
  variantId: number | null
  name: string
  collection: string
  colorName: string | null
  colorHex: string | null
  size: string
  qty: number
  unitPrice: number
  image: string
}

export type CheckoutCustomer = {
  name: string
  email: string
  phone: string | null
  address: string
  note: string | null
}

/**
 * The house ships complimentary, so shipping is a flat 0 until a real carrier
 * table exists. Duties and taxes are NOT applied — no rate has been agreed, so
 * the checkout shows none rather than inventing one.
 */
export const FLAT_SHIPPING = 0

export type Order = {
  id: number
  reference: string
  customer: string
  email: string | null
  phone: string | null
  /** Delivery address as the customer wrote it. */
  address: string | null
  note: string | null
  /** Human summary of the lines, kept for the admin table and the old rows. */
  product: string | null
  status: OrderStatus
  paymentStatus: PaymentStatus
  paymentMethod: PaymentMethod
  /** What the customer was told to pay into, frozen at order time. */
  bankDetails: BankDetails | null
  items: OrderItem[]
  subtotal: number
  shipping: number
  total: number
  currency: string
  type: OrderType
  qty: number
  createdAt: string
}

/** Payload the checkout page posts to POST /api/checkout. */
export type CheckoutInput = {
  customer: CheckoutCustomer
  /** Prices here are advisory only — the route re-resolves them from the catalogue. */
  items: OrderItem[]
  subtotal: number
  shipping: number
  total: number
  currency: string
  bankDetails: BankDetails | null
}

export type StoreSettings = {
  storeName: string
  contactEmail: string | null
  orderNotifications: string | null
  currency: string
  /**
   * Where clients pay. She edits this in Admin → Settings and it is live
   * immediately everywhere it is shown (checkout page + order confirmation).
   * No approval step, no cache: one row, one write.
   */
  bankDetails: BankDetails
  social: {
    instagram: string | null
    facebook: string | null
    tiktok: string | null
  }
}

export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: 'AVID WOMAN VOGUE',
  contactEmail: 'hello@avidwomanvogue.com',
  orderNotifications: 'orders@avidwomanvogue.com',
  currency: 'NGN',
  bankDetails: EMPTY_BANK_DETAILS,
  social: {
    instagram: 'https://www.instagram.com/avidwoman',
    facebook: null,
    tiktok: null,
  },
}

/**
 * Atelier appointments. Declared here (not in lib/data/fittings.ts) because the
 * storefront booking form is a client component: it may import from this file,
 * which has no server-only dependencies, but never from the data module.
 */
export const FITTING_SERVICES = [
  'Fitting for a new piece',
  'Adjustments & re-sizing',
  'Made to measure',
  'Send my measurements',
] as const
export type FittingService = (typeof FITTING_SERVICES)[number]

export const FITTING_STATUSES = ['New', 'Confirmed', 'Completed', 'Cancelled'] as const
export type FittingStatus = (typeof FITTING_STATUSES)[number]

export type FittingRequest = {
  id: number
  name: string
  email: string
  phone: string | null
  service: string
  /** ISO date (yyyy-mm-dd) the client asked for, or null for "any day". */
  preferredDate: string | null
  notes: string | null
  status: FittingStatus
  createdAt: string
}

export type FittingRequestInput = {
  name: string
  email: string
  phone: string | null
  service: string
  preferredDate: string | null
  notes: string | null
}

/**
 * A customer review of a piece.
 *
 * TODO(data-layer) — reviews arrive in the data-migration phase. The schema it
 * needs (keep it in supabase/schema.sql, migrate with scripts/sql/reviews.sql):
 *
 *   create table public.reviews (
 *     id         bigint generated by default as identity primary key,
 *     product_id bigint   not null references public.products(id) on delete cascade,
 *     rating     smallint not null check (rating between 1 and 5),
 *     author     text     not null,
 *     body       text     not null,
 *     created_at timestamptz not null default now()
 *   );
 *   -- public read where the product is not hidden; insert only via an admin /
 *   -- verified-purchase path, never straight from an anonymous form.
 *
 * Read it through a future `lib/data/reviews.ts` (listReviews(productId),
 * reviewSummary(productId)) so the storefront never queries the table directly.
 * Until then the product page uses the placeholder generator in
 * components/avid-app.tsx, which is deleted in one piece when this lands.
 */
export type Review = {
  id: number
  productId: number
  /** Whole stars, 1–5. */
  rating: number
  author: string
  /** ISO date, yyyy-mm-dd. */
  date: string
  body: string
}

/* ------------------------------------------------------------------
   EDITORIAL CONTENT — the owner's words, not the developer's.

   Every headline and paragraph on the home and shop pages is a row in
   `site_content`, keyed by slug, editable in Admin → Content → Page copy.
   The storefront renders the saved row and falls back to CONTENT_DEFAULTS
   below, so an empty table shows the shipped copy rather than a blank page —
   and deleting a row restores the default rather than breaking the layout.

   Only the fields a block actually uses are filled in; the rest stay empty
   strings and are not rendered.
------------------------------------------------------------------ */
export type ContentBlock = {
  key: string
  /** Admin-facing name, e.g. "Homepage — hero". Never shown to customers. */
  label: string
  eyebrow: string
  title: string
  body: string
  ctaLabel: string
  ctaHref: string
  image: string
  alt: string
}

/** Slug → label. The admin iterates this, so a new block is one line here. */
export const CONTENT_BLOCK_KEYS = [
  { key: 'home.hero', label: 'Homepage — hero' },
  { key: 'home.house', label: 'Homepage — the house' },
  { key: 'home.fittings', label: 'Homepage — fittings & appointments' },
  { key: 'home.newsletter', label: 'Homepage — mailing list' },
  { key: 'shop.heritage', label: 'Shop — heritage fabrics' },
  { key: 'footer.about', label: 'Footer — house line' },
] as const

export type ContentKey = (typeof CONTENT_BLOCK_KEYS)[number]['key']

/**
 * The shipped copy, one block per key. This is both the fallback for a row that
 * has not been written yet and the seed for scripts/sql/site-content.sql.
 */
export const CONTENT_DEFAULTS: Record<ContentKey, Omit<ContentBlock, 'key' | 'label'>> = {
  'home.hero': {
    eyebrow: 'AVID WOMAN VOGUE · LAGOS FASHION HOUSE',
    title: 'Best Fashion House\n*in Owerri.*',
    body: 'Premium handmade clothes cut and finished by hand in our Lagos studio, in black, ivory and gold. Every run is limited, and every piece is made to wear for years, not one season — made for your needs, your body, your life.',
    ctaLabel: 'Shop the collection',
    ctaHref: 'shop',
    image: '',
    alt: '',
  },
  'home.house': {
    eyebrow: 'THE FASHION HOUSE',
    title: 'Well-made clothes.\n*Made to last.*',
    body: 'We are a Lagos fashion house, not a fast-fashion shop. Every piece is cut and sewn by hand, in small numbers, and checked one by one before it leaves us. We pick fabrics for how they feel and how long they last — so you can wear them for years.',
    ctaLabel: 'Our story',
    ctaHref: 'about',
    image: '',
    alt: '',
  },
  'home.fittings': {
    eyebrow: 'APPOINTMENTS & FITTINGS',
    title: 'Your size,\n*your fit.*',
    body: 'Book a private fitting at our Lagos studio, or send your measurements from anywhere in Nigeria. We adjust the length, fix the fit and finish the piece on you. Already own one of our pieces? Bring it in — we quote for every adjustment before we start.',
    ctaLabel: 'Book an appointment',
    ctaHref: 'fitting',
    image: '',
    alt: '',
  },
  'home.newsletter': {
    eyebrow: 'STAY IN THE LOOP',
    title: 'Be first to know.',
    body: 'One email when new pieces, restocks and limited runs drop. No spam. Unsubscribe any time.',
    ctaLabel: '',
    ctaHref: '',
    image: '',
    alt: '',
  },
  'shop.heritage': {
    eyebrow: 'HERITAGE FABRICS · ANKARA & ADIRE',
    title: 'Ankara, adire and aso-oke,\n*cut to our own patterns.*',
    body: 'Hand-dyed adire and carefully sourced ankara, cut into the same shapes as the main collection. Each fabric length is chosen by hand — no two runs are exactly alike.',
    ctaLabel: 'Shop heritage fabrics',
    ctaHref: 'shop-grid',
    image: '',
    alt: '',
  },
  'footer.about': {
    eyebrow: '',
    title: 'AVID WOMAN VOGUE',
    body: 'A Lagos fashion house. Small runs, handmade with care — with a personal fitting on every order.',
    ctaLabel: '',
    ctaHref: '',
    image: '',
    alt: '',
  },
}

