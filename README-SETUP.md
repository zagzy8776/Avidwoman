# AVID WOMAN VOGUE — setup

Next.js App Router storefront **+** a route-based admin console.

## Stack (as agreed)

| Layer | Choice |
|---|---|
| Framework | Next.js 15 App Router + React 19 |
| Database | **Supabase Postgres** — products, product_variants, fitting_requests, lookbook, orders, settings, media_slots |
| Auth | **Supabase Auth** (`@supabase/ssr`) — cookie session, enforced in `middleware.ts` |
| Media | **Cloudinary** — the *only* media store (no Supabase storage alongside it) |
| Payments | **Paystack — HELD** until the client confirms the settlement currency |

SQLite is deliberately absent: it would not survive deployment on hosts without a
persistent disk, so Postgres is the store from day one.

## 1. Install

```bash
npm install
```

## 2. Supabase

1. Create a project → *Project Settings → API* → copy the **URL** and **anon key**.
2. *SQL editor* → paste all of `supabase/schema.sql` → **Run**. This creates the
   tables (products, colour variants, fitting requests, orders, settings, media
   slots), the RLS policies and the seed catalogue. Adding to an existing project
   later — each is safe to re-run:
   `node scripts/sql.mjs scripts/sql/fittings.sql` and
   `node scripts/sql.mjs scripts/sql/orders-payment.sql`.
3. *Authentication → Users* → **Add user** (email + password) — that is your admin.
4. `cp .env.local.example .env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL`
   and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
5. `npm run dev` → <http://localhost:3001>

Without those env vars the app still runs: the storefront renders and `/admin`
shows a "connect Supabase" notice instead of throwing.

## 3. Cloudinary (product photography + banner / photo manager)

**Both variables are currently EMPTY in `.env.local`, so every uploader shows
"Cloudinary not configured" and its button is disabled.** Fill them in before
the owner tries to upload:

1. Dashboard → copy the **cloud name**.
2. *Settings → Upload* → add an **unsigned** upload preset.
3. Add `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` and `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`
   to `.env.local`, then restart the dev server (they are `NEXT_PUBLIC_`, so they
   are inlined at build time and are not picked up by a running server).
4. **Admin → Content → Media manager**: every slot is locked to the aspect ratio
   declared in `lib/media/slots.ts`, the widget crops to it, and delivery
   re-applies it — so a replacement image cannot break the layout.
5. **Admin → Products → Edit**: the cover image and *each colour* have their own
   uploader — no URL pasting. Uploads land in
   `avid-woman-vogue/products/<id>/<colour>/` cropped to the storefront's 0.73
   product ratio, so every colour sits in the same frame.
   - The **first image is the primary** shot (card + product page); use
     *Make primary* to promote another. Every extra image becomes a **gallery
     angle** on the product page.
   - A colour with **zero** images stays greyed as *Photo on request* and cannot
     be selected. The uploaders never borrow another colour's photo.
   - Pasting a URL still works, so an existing hosted library can be adopted.

## 4. Payments — manual bank transfer, no gateway

**This phase has no payment provider on purpose.** The client controls payment
entirely herself, so checkout collects the order and then tells the shopper where
to send the money.

1. **Admin → Settings → Payment — bank transfer**: bank name, account number,
   account name. Saving is live immediately on the checkout page and on every
   order confirmation — there is no approval step and no cache.
2. A shopper checks out, sees those details and the total due, and places the
   order. It is written as `paymentStatus: "pending-payment"` with a **snapshot**
   of the account she was shown.
3. **Admin → Orders** shows a payment badge per order (`Pending payment` appears
   in gold) and a **Mark as paid** button. One click sets `paymentStatus → paid`
   *and* `OrderStatus → Processing`. *(Confirm with her whether those should stay
   one click or become two — it is one function, `markOrderPaid`.)*
4. Nothing expires or cancels a pending order. Orders wait until she acts.

- Migration: `node scripts/sql.mjs scripts/sql/orders-payment.sql` (also part of
  `supabase/schema.sql`).
- RLS: `anon` may **insert** an order (shoppers have no account) and there is
  deliberately **no anon select** — nobody can read another shopper's address and
  phone back out. Reads, marking paid and status changes are `to authenticated`.
- If a gateway is ever agreed, this is the moment to ask the old question: does
  she settle in **Naira** (Paystack / Flutterwave — Stripe does not pay out to
  Nigeria) or a **foreign currency** (Stripe)? `PAYMENT_METHODS` in
  `lib/data/types.ts` is where a method list would start; the checkout page reads
  the method from the data layer rather than hard-coding tiles.

## Routes

| Route | Purpose |
|---|---|
| `/` | Storefront — still a single file: `components/avid-app.tsx` |
| `/api/checkout` | `POST` — places an order for bank transfer (resolves prices server-side, snapshots the account, writes `pending-payment`) |
| `/login` | Admin sign-in (Supabase Auth) |
| `/admin` | Overview: revenue, orders, products, recent orders |
| `/admin/products` `/new` `/[id]` | Search + filter, **Edit on every row**, description, badge, colours with photo status, archive/restore vs delete, related pieces |
| `/admin/orders` | Payment badge + **Mark as paid**, status edits, retail vs wholesale, bulk quantity |
| `/admin/fittings` | The atelier's appointment book (requests from the storefront) |
| `/admin/customers` | Directory derived from orders |
| `/admin/content` | Banner & photo manager (Cloudinary slots) |
| `/admin/content/page-copy` | **Page copy** — hero, the house, fittings, mailing list, heritage fabrics, footer line |
| `/admin/analytics` | Retail vs wholesale revenue |
| `/admin/settings` | Store identity, **bank account for transfers**, social links (footer "Follow" column) |

## Owner control — what she can edit without a developer

**Products** (`/admin/products`). Search by name or SKU, filter by fabric, and
see every piece with its badge, price, colour-photo count and stock. Edit is on
every row. The edit page covers name, collection, description, price, currency,
image, alt text, badge (New / Exclusive / Limited / Last pieces), fabric, origin,
inventory, care notes, wholesale controls, colour variants, and related pieces.

- **Description** is her own writing. Empty means the site writes a line from the
  fabric and collection, so a new piece never reads blank.
- **Archive vs Delete.** Archiving keeps the record and its colours but removes
  the piece from the shop, search, home page and related rows. Delete is
  permanent and also removes the colours. Archived pieces are behind their own
  filter with a Restore action.
- **Related pieces** is a multi-select. None chosen means the site picks for her
  (same collection, then closest fabric).
- **View on site** opens the real product page via `/?product=<id>`.

**Page copy** (`/admin/content/page-copy`). Every hard-coded headline and
paragraph on the home and shop pages is a row in `site_content`: hero, the house,
fittings & alterations, mailing list, heritage fabrics, and the footer line.
Leaving a field empty keeps the shipped copy; a title keeps its line breaks (new
line in the field) and italics (`*like this*`). Saves are live immediately.

Migration: `node scripts/sql.mjs scripts/sql/site-content.sql` (also part of
`supabase/schema.sql`). RLS: public read, admin write. An unreadable or unmigrated
table falls back to the copy in `CONTENT_DEFAULTS`, so the storefront never
renders an empty headline.

**Card click-through.** Each product card's photograph is its own button
(`.card-open`) wired to the same handler as the name/price row, so tapping the
image, the name or the price all open the piece. Wishlist and Quick view sit
above it and stop the click.

## Colour variants

A colour is a **row in `product_variants`**, not a tint. Each row owns its
`images[]`, `sku`, `stock`, `sizes[]`, optional `price` override and `hidden`
flag, so choosing a swatch on the PDP or in quick view swaps the gallery to that
colour's real photography (and the cart keeps the exact variant you bought).

**One image per colour, from the same shoot.** The grid boxes are fixed
(`aspect-ratio` / fixed height + `object-fit: cover`), so a swatch swap can never
shift the layout — but it *will* look like a different product if the colours
weren't shot consistently. So each colour carries its own shot, taken from the
same angle and framing as its siblings.

**`images: []` means "photography pending", not "use something else."** A colour
with no photography of its own renders greyed and unselectable on the storefront
(and on the card colour row), labelled in text as *photo coming*. It is
deliberately distinct from *sold out* (real photo, no stock), and the catalogue
shot is only ever the base state — it is never substituted for an unphotographed
colour, and the PDP caption says *Studio shot* while it is showing that. The admin
form warns on every colour that is missing one.

- **Data layer** — `lib/data/variants.ts` (`listVariants`, `createVariant`,
  `updateVariant`, `deleteVariant`, `syncProductVariants`). `lib/data/products.ts`
  joins the rows in, ordered by `position`.
- **Admin** — the product form mounts `components/admin/variant-manager.tsx`
  (add / remove / rename colours, HEX, SKU, stock, price, sizes, image list,
  hide, reorder). It serialises to a hidden `variants` JSON field that
  `saveProduct` reconciles with `syncProductVariants` — rows carrying an id are
  updated, new ones inserted, removed ones deleted.
- **Storefront** — `ProductCard` shows a colour row under the price **at all
  times**, not on hover: each chip previews that colour's own shot on hover and
  opens the piece on that colour when tapped. `VariantSelector` drives the
  PDP/quick-view gallery, and the cart drawer shows the variant thumbnail, colour
  name and per-variant price.
- **RLS** — the public may only `select` rows where `hidden = false`; writes are
  `to authenticated` only (see `supabase/schema.sql` / `scripts/sql/variants.sql`).

## Product detail page

Structure (still all in `components/avid-app.tsx`):

- **Gallery** — one main image plus a horizontal **angle strip** beneath it. The
  thumbnails are the *angles of the selected colour*, read from
  `ProductVariant.images[]` — a different control from the colour swatches. The
  main box is fixed (`grid-template-rows: calc(100vh - 182px) auto`, with the
  strip's 96px reserved), so switching view or colour cannot shift the layout and
  the gallery still ends level with the sticky purchase panel. A colour with a
  single shot simply shows no strip.
- **Colour swatches** — the real variants, behaviour unchanged: greyed,
  text-labelled and unselectable when `images: []` (*photo coming*). Every
  colour's `images[0]` is preloaded when the piece is opened, so a swatch swap is
  instant instead of leaving the previous colour on screen.
- **Size** — the existing pill buttons, with unavailable sizes struck through.
- **Accordions** — collapsed by default, chevron rotates on open. The four rows
  carry real answers: *Details & fit*, *Composition & care* (incl. the piece's
  own `careNotes`), *Styling & beauty notes*, *Delivery & returns*.
- **Reviews** — average, review count, 5→1 star breakdown with proportional fill
  and three sample cards. **Placeholder data.** `placeholderReviews()` /
  `placeholderReviewSummary()` (above `SIZE_GUIDE`) are seeded from the product id,
  so the average, the bars and the samples can never contradict each other, and
  they are deleted in one piece when the table lands — the schema sketch lives on
  the `Review` type in `lib/data/types.ts`, and it should be read through a future
  `lib/data/reviews.ts`. The rating on the product cards comes from the same
  source, and the card hides the row when the count is 0.
- **Sale price** — `Product.salePrice` is optional and **nothing sets it yet**.
  When it is present, the card and the PDP show the original struck through beside
  the sale price; without it there is no badge and no invented discount. Wiring it
  up means `products.sale_price` + `lib/data/products.ts` + the admin form.
- **Cart** — unchanged by design. The drawer *is* the cart UX (line items,
  quantity, subtotal, brand type) and now hands off to the checkout view through
  **Proceed to checkout**; the email path stays beneath it as the fallback. There
  is still deliberately no separate cart page.

## Checkout — manual bank transfer

`view === "checkout"` in `components/avid-app.tsx` (reached from **Proceed to
checkout** in the drawer), with one server route behind it.

- **Left column** — her details (name, email, phone, delivery address, a note for
  the atelier), then `02 — PAYMENT`: the live account as large type with a
  **copy number** button, and one instruction line: *"Transfer the total shown,
  then place your order."* There is no payment-method radio list, no card field
  and no provider widget anywhere in this flow — by design.
- **Right column** — sticky summary: the bag's own lines (image, name, colour,
  size, qty, price), Subtotal, Shipping (Complimentary), Total due, and one gold
  **Confirm order**. Discount and duties/taxes are commented placeholders — no
  coupon input is built, because the client has not asked for one.
- **Trust row** — `.service-note` reused verbatim: COMPLIMENTARY DELIVERY ·
  HAND-FINISHED IN THE ATELIER · PRIVATE CLIENT SUPPORT.
- **Confirmation** — order number, the account again, the total due, and a
  pre-filled *send the transfer receipt* email. It repeats everything because she
  will leave the tab to open her banking app.
- **Empty bag** → the view redirects to the shop instead of rendering an empty
  checkout. After a successful order the bag is emptied on purpose, and the
  confirmation stays on screen.
- **`POST /api/checkout`** re-resolves **every price from the catalogue** — the
  browser's numbers are advisory only, so a tampered bag cannot invent a total.
  It rejects an unknown piece, a hidden colour, a size that colour does not offer
  and a wholesale/enquiry piece, then writes the order with
  `paymentStatus: "pending-payment"`, `paymentMethod: "bank-transfer"` and a
  snapshot of the account the customer was shown.
- **No database configured** → the route logs the payload and answers with a stub
  reference, so the UI can be reviewed before the backend lands. The confirmation
  says so on screen ("Review build…") rather than pretending an order was saved.
- **No account on file yet** → the page says the details are coming by email
  instead of showing a blank "pay here" block.
- `PAYMENT_WINDOW` ("one working day") is the confirmation-time wording used on
  the drawer, the checkout page and the confirmation — one constant, because the
  sentence is hers to finalise.

## Fittings — the atelier's appointment book

A house that cuts to measure has to be **bookable**, so the storefront has a real
booking path (`Book a fitting` in the header, the band on the home page, the
`/fitting` view, and the footer's *Client care* column).

- **Storefront** — the form posts to the server action `requestFitting`
  (`app/actions.ts`), which writes to `fitting_requests`.
- **Migration** — `node scripts/sql.mjs scripts/sql/fittings.sql` (also part of
  `supabase/schema.sql`, so a fresh project gets it automatically).
- **RLS** — shoppers are anonymous, so `anon` may **insert only**. There is no
  anon select policy: nobody can read anyone else's booking. Reads and status
  updates are `to authenticated`, surfaced at `/admin/fittings` with the same
  table + status idiom as orders.
- **Honesty rule** — if the insert fails (for example the table has not been
  created yet) the visitor is **not** told it worked. They get an explanation and
  a pre-filled email to the atelier instead.
- Prices are deliberately absent: alterations are *quoted once we see the piece*.
  Durations are shown; invented prices are not.

## Storefront rules (why it is built this way)

1. **Nothing hides what is for sale.** Price, name and every colour are visible
   without hovering, and the editorial row scrolls instead of being clipped.
2. **Every control does something.** No dead buttons: the size guide, search,
   accordions, saved pieces, footer links and bag all lead somewhere real. When
   something cannot be done yet (card payment) the UI says so and offers the
   working alternative.
3. **No fake success.** A form only reports success when the row it claims to
   have written actually exists.
4. **Plain words.** Navigation uses names a shopper recognises (Shop,
   Collections, Gallery, About, Book a fitting) rather than internal jargon.
5. **Photography is never invented.** A colour without its own shot is never
   filled in with another colour's image (see *Colour variants* above).

## Theme — dark by default, light on request

The house **defaults to dark**, and a visitor may switch to light.

- The toggle is the sun/moon button in the header (and a labelled text button in
  the mobile menu). The choice is stored under `localStorage["avw-theme"]` and
  written to `<html data-theme="light">` on load, so there is no flash of the
  wrong system. `dark` is written by *removing* the attribute, not by a value.
- Only **surfaces** are remapped by `[data-theme="light"]` in
  `components/avid-styles.css`: `--black`, `--charcoal`, `--charcoal-2`,
  `--ivory`, `--brand-muted`, `--line`, `--line-gold` and `--header-veil`.
  **`--gold` stays the accent in both themes.**
- `--black` is used as *both* surface and ink across the file, so every rule that
  prints dark ink on a gold or pale fill re-declares that ink under the light
  block rather than following `--black` into light. Three hero overlays use a
  hardcoded near-white instead of a token and are flipped explicitly, and the
  studio-lighting layer — which only ever *adds* light via
  `mix-blend-mode: screen` — is switched off, because screen over a pale ground
  resolves to plain white.
- **`/admin` is a separate document and is never affected**: the attribute is set
  on the storefront's `<html>` only, so the console stays dark regardless of a
  visitor's preference.
- One palette source: the `:root` block of `components/avid-styles.css`.
  `app/globals.css` declares no colours — it only maps that palette onto the
  shadcn tokens and adds the scoped `[data-theme="heritage"]` accent layer.

- **Heritage band** (`[data-theme="heritage"]`) keeps the Igbo/Yoruba textile
  accents — terracotta, rust, earth-brown — layered on whatever ground the
  current theme gives it, so it never breaks the surrounding system.
- **Glass and depth** are used once each and only where something genuinely sits
  above the page: the header veil, the bag drawer, the modals, the search layer
  and the checkout columns. Nothing else gets a shadow or a glass panel.

> Note: checkout currently follows the toggle like the rest of the storefront.
> If it should be pinned dark for the payment step, that is a small scoped
> override on the checkout view.

## Voice

Copy is written to be **calm, precise and factual** — a quiet house, not a
launch. The rules the redesign pass follows, so the next edit keeps the tone:

- Say what the piece is, what it is made of and when it arrives. No slogans, no
  second-person punchlines ("The dress arrives before you do" is gone).
- Headlines may use one short italic line, never two clauses that dramatise.
- Reviews are headed **Reviews**, not "What women say", and read like feedback
  (fit, cloth, service) rather than praise copy.
- Payment is stated once, plainly: bank transfer, confirmation within a working
  day. No apology, no exclamation.
- Never invent a fact. If a number is not in the catalogue or a documented
  policy (5 working days to dispatch, 14-day returns, complimentary
  alterations), it does not go on the page.

## Verification scripts

| Command | Checks |
|---|---|
| `node scripts/db-check.mjs` | Tables exist, catalogue + variant rows seeded, fitting requests by status |
| `node scripts/variant-roundtrip.mjs` | Signs in as admin and replays update → insert → reorder → delete → restore; also proves anonymous writes are blocked by RLS |
| `node scripts/fitting-roundtrip.mjs` | An anonymous booking INSERT is accepted (201), the row really lands, all three RLS policies exist, then the test row is removed |
| `node scripts/photography-reset.mjs` | Resets variant photography to the honest state: default colour = the product's own catalogue shot, every other colour = no images (greyed "photo coming") |
| `node scripts/sql.mjs scripts/sql/orders-payment.sql` | Re-runnable migration: order payment columns, the bank-details snapshot, the settings bank account and the anon-insert policy on orders |

## Not done yet (in the agreed order)

1. ~~**Data migration**~~ — done. `app/page.tsx` renders the storefront from
   `listProducts()` / `listLookbook()` / `getSettings()`, so the catalogue,
   colour variants, lookbook and footer socials all come from Supabase and an
   edit in `/admin` shows up on the storefront.
2. ~~**Checkout**~~ — done, as **manual bank transfer** (no gateway): see
   *Checkout — manual bank transfer* above. Left to confirm with her: the payment
   window wording, whether *Mark as paid* stays one click, and whether
   duties/taxes are ever charged (nothing is added today).
3. **Photography for the remaining colours** — the catalogue is honest but
   incomplete: every non-Noir colour still has an empty `images[]`, so it is
   greyed as *photo coming*. Replace them with real same-shoot shots (admin, or
   `scripts/photography-reset.mjs` for the pattern) and the colour rows become
   fully shoppable. More angles per colour also light up the PDP angle strip,
   which only appears once a colour has more than one image.
4. **Reviews + sale pricing** — `public.reviews` and `products.sale_price` are
   both flagged as `TODO(data-layer)` in the code (schema sketch on the `Review`
   type and on `Product.salePrice` in `lib/data/types.ts`). The UI for both is
   already built and renders nothing until the data exists.
5. Notifications, SEO/metadata, favicon, outreach, `robots.txt`.
