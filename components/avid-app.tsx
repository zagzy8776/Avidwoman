"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  COLLECTIONS,
  CONTENT_DEFAULTS,
  FITTING_SERVICES,
  FLAT_SHIPPING,
  hasBankDetails,
  type BankDetails,
  type ContentBlock,
  type ContentKey,
  type LookbookFrame,
  type Product,
  type ProductVariant,
  type Review,
} from "@/lib/data/types";
import { requestFitting } from "@/app/actions";
import { money } from "@/lib/format";
import { mapTarget, STUDIO_LANDMARK } from "@/lib/studio-location";
import ParticleLogo from "./particle-logo";
import StudioLighting from "./studio-lighting";

type SocialLinks = {
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
};

type View = "home" | "shop" | "product" | "about" | "fitting" | "contact" | "checkout";

/**
 * How long the atelier takes to confirm a transfer — used on the cart, the
 * checkout page and the confirmation screen. Kept in one place because the
 * wording is the client's to finalise.
 * TODO(copy): "one working day" matches the house's existing reply time on the
 * fitting form; confirm the payment window with her.
 */
const PAYMENT_WINDOW = "one working day";

/**
 * The house's own contact points — the addresses that never change and must
 * work even before Supabase settings are filled in.
 *
 * The studio's location itself lives in lib/studio-location.ts, so the map, the
 * directions link and the structured data all read the same pin.
 */
const HOUSE = {
  instagram: "https://www.instagram.com/avidwoman",
  tiktok: "https://www.tiktok.com/@avidwoman",
  whatsapp: "https://wa.me/2347063243954",
  phoneDisplay: "0706 324 3954",
  phoneDial: "+2347063243954",
  landmark: STUDIO_LANDMARK,
  /**
   * Opens Google Maps with the studio as the destination, in driving mode.
   * An exact pin routes to the pin; the name search is only a fallback.
   */
  get directions() {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapTarget())}&travelmode=driving`;
  },
  /** The studio pin on its own, for the embedded map panel. */
  get mapEmbed() {
    // z=16 frames the immediate streets, which is the zoom a driver wants.
    return `https://www.google.com/maps?q=${encodeURIComponent(mapTarget())}&z=16&output=embed`;
  },
};

/**
 * The two photographs on the home page collection cards.
 *
 * These are the house's own shots, kept in /public so the cards do not depend on
 * whichever product happens to sit first in a collection. Only these two images
 * are pinned; every other picture on the site still comes from the catalogue.
 */
const COLLECTION_CARD_IMAGES = {
  /** The "Daywear" card (first featured collection). */
  daywear: '/collection-daywear.jpg',
  /** The "Evening" card (second featured collection). */
  evening: '/collection-evening.jpg',
} as const;

/**
 * The studio film shown in "The Studio" panel on the home page.
 *
 * Kept in /public rather than a CDN so it streams from the same origin as the
 * page. It is muted and inline so a phone will autoplay it without a tap, and it
 * pauses for anyone who has asked their system for reduced motion.
 */
const STUDIO_FILM = '/studio-film.mp4';

type CartItem = {
  key: string;
  product: Product;
  /** The exact colour variant chosen — drives thumbnail, SKU and price. */
  variant?: ProductVariant;
  size: string;
  qty: number;
};

/**
 * A colour is selectable only once its OWN photography exists. An empty
 * images[] means "photography pending": the swatch still names the real colour
 * but renders greyed and unselectable, and no other colour's photo is ever
 * substituted for it.
 */
function hasPhotography(variant: ProductVariant): boolean {
  return variant.images.length > 0;
}

/**
 * Image for the gallery. The catalogue shot is only ever the BASE state (no
 * colour chosen) — a chosen colour shows its own photo, so swapping colours
 * changes the colour and nothing else. The fallback is unreachable for a
 * selectable colour, because unphotographed ones can't be selected.
 */
function variantImage(product: Product, variant?: ProductVariant): string {
  if (!variant) return product.image;
  return variant.images[0] ?? product.image;
}

/** Effective unit price — variant override when set, else the product price. */
function unitPrice(product: Product, variant?: ProductVariant): number {
  return variant?.price ?? product.price;
}

/** Visible (non-hidden) colour variants, display order. */
function liveVariants(product: Product): ProductVariant[] {
  return product.variants.filter((variant) => !variant.hidden);
}

/** Colour a product opens on: the first photographed one, else the first. */
function defaultVariant(product: Product): ProductVariant | undefined {
  const variants = liveVariants(product);
  return variants.find(hasPhotography) ?? variants[0];
}

/** The house size run, used when a colour carries no size list of its own. */
const HOUSE_SIZES = ["XS", "S", "M", "L", "XL"];

/** Sizes actually offered by a colour (falls back to the house run). */
function sizesFor(variant?: ProductVariant): string[] {
  return variant?.sizes.length ? variant.sizes : HOUSE_SIZES;
}

/**
 * Lowest price the piece can be bought for. A colour may carry its own price
 * (a lined silk colour costs more than the cotton one), so the card says
 * "From $x" whenever the colours do not all cost the same.
 */
function priceLabel(product: Product): string {
  const prices = liveVariants(product).map((variant) => variant.price ?? product.price);
  const from = Math.min(product.price, ...(prices.length ? prices : [product.price]));
  return prices.some((price) => price > product.price)
    ? `From ${money(from, product.currency)}`
    : money(from, product.currency);
}

/**
 * The description shown on the product page and in quick view.
 *
 * The owner's own writing wins. When it is empty the site builds an honest line
 * from the catalogue record, so a piece with no description written yet still
 * reads properly instead of showing a blank.
 */
function productDescription(product: Product): string {
  if (product.description?.trim()) return product.description.trim();
  const cloth = product.fabric ? product.fabric.toLowerCase() : "the house cloth";
  const made = product.origin ? ` Made in ${product.origin}.` : "";
  return `Hand-cut in ${cloth} and finished in our Owerri studio, ${product.name} is part of the ${product.collection} collection.${made}`;
}

/** A colour is orderable when it has stock (photography is a separate gate). */
function isOrderable(variant: ProductVariant): boolean {
  return variant.stock > 0;
}

/** Free-text match across the fields a shopper would actually type. */
function matchesTerm(product: Product, term: string): boolean {
  if (!term) return true;
  return [product.name, product.collection, product.fabric ?? "", product.origin ?? "", product.tag ?? ""]
    .join(" ")
    .toLowerCase()
    .includes(term);
}

/**
 * Star row for a rating, used in the Reviews section. The fill is proportional
 * (4.3 reads as 4.3, not a rounded 4): an unfilled row sits underneath a gold
 * row clipped to the value, both drawn from the token palette.
 */
function Stars({ value, size = "sm" }: { value: number; size?: "sm" | "lg" }) {
  const percent = Math.max(0, Math.min(100, (value / 5) * 100));
  const row = [0, 1, 2, 3, 4].map((index) => <Icon key={index} name="star" />);
  return (
    <span className={`stars stars-${size}`} role="img" aria-label={`${value.toFixed(1)} out of 5`}>
      <span className="stars-track" aria-hidden="true">{row}</span>
      <span className="stars-fill" aria-hidden="true" style={{ width: `${percent}%` }}>{row}</span>
    </span>
  );
}

const REVIEW_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Month + year only, formatted by hand so server and client HTML always agree. */
function formatReviewDate(iso: string): string {
  const [year, month] = iso.split("-");
  const name = REVIEW_MONTHS[Number(month) - 1];
  return name ? `${name} ${year}` : year;
}

/**
 * Original price struck through, sale price beside it. Only ever rendered when
 * a product actually carries a salePrice — there is no generic discount badge
 * and no discount is invented for a piece that is not on sale.
 * TODO(data-layer): products.sale_price — see lib/data/types.ts.
 */
function salePair(original: number, sale: number, currency = "NGN") {
  return (
    <>
      <s className="price-was">{money(original, currency)}</s>
      <span className="price-now">{money(sale, currency)}</span>
    </>
  );
}

/**
 * Builds a pre-filled email to the atelier. Used wherever a task is better
 * finished by hand: fittings, measurement advice, reviews, and the receipt a
 * client sends after a bank transfer. (Checkout itself posts to
 * /api/checkout — the email is the fallback, not the flow.)
 */
function houseMailto(subject: string, body: string, email?: string | null): string {
  const to = email ?? "hello@avidwomanvogue.com";
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * The answers behind the product-page accordions. These used to be buttons with
 * no handler at all, so the only written information a shopper could reach was
 * one hard-coded sentence. Styling and beauty notes are part of the house voice,
 * not filler: a dress is bought as an outfit.
 */
function productFacts(product: Product, colorName: string, sizes: string[]) {
  return [
    {
      title: "Details & fit",
      body: `${colorName} colourway, available in ${sizes.join(", ")}. ${productDescription(product)} The model is 5'9" and wears a size S; the piece fits true to the size guide.`,
    },
    {
      title: "Composition & care",
      body: `${product.fabric ? `Cloth: ${product.fabric}.` : "Cloth: house fabric."} ${
        product.careNotes ??
        "Dry clean, or hand wash cold and dry flat away from direct sun. Cool iron on the reverse."
      }`,
    },
    {
      title: "Styling & beauty notes",
      body: "Styling: keep the line long. A fine gold chain, one ring and a low heel let the cut speak. Beauty: skin with a little warmth, a bare eye, and either a deep berry or a clear gloss on the lip. Nails short and square.",
    },
    {
      title: "Delivery & returns",
      body: "Made and dispatched from our Owerri studio within five working days, with complimentary delivery. If the fit is not right, return it unworn within 14 days, or book a free adjustment and keep the piece.",
    },
  ];
}

function Icon({ name }: { name: "search" | "bag" | "heart" | "user" | "menu" | "close" | "star" | "chevron" | "sun" | "moon" }) {
  const paths = {
    search: <><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></>,
    bag: <><path d="M5 8h14l-1 13H6L5 8Z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></>,
    heart: <path d="M20.8 5.8a5.5 5.5 0 0 0-7.8 0L12 6.9l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 22l8.8-8.4a5.5 5.5 0 0 0 0-7.8Z" />,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    menu: <><path d="M3 7h18M3 17h18" /></>,
    close: <path d="m5 5 14 14M19 5 5 19" />,
    sun: <><circle cx="12" cy="12" r="4.2" /><path d="M12 2.4v2.3M12 19.3v2.3M2.4 12h2.3M19.3 12h2.3M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6" /></>,
    moon: <path d="M20 14.4A8.6 8.6 0 0 1 9.6 4a8.6 8.6 0 1 0 10.4 10.4Z" />,
    star: <path d="M12 2.6l2.94 6.06 6.56.9-4.75 4.6 1.16 6.6L12 17.68l-5.91 3.08 1.16-6.6-4.75-4.6 6.56-.9z" />,
    chevron: <path d="m6 9 6 6 6-6" />,
  };
  return <svg aria-hidden="true" className="icon" viewBox="0 0 24 24">{paths[name]}</svg>;
}

function LogoButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="wordmark" onClick={onClick} aria-label="Go to homepage">
      <span>AVID WOMAN</span>
      <small>VOGUE</small>
    </button>
  );
}

function ProductCard({
  product,
  onOpen,
  onQuick,
  onWish,
  wished,
  onSelectVariant,
}: {
  product: Product;
  onOpen: () => void;
  onQuick: () => void;
  onWish: () => void;
  wished: boolean;
  onSelectVariant?: (variant: ProductVariant) => void;
}) {
  const variants = liveVariants(product);
  const [hovered, setHovered] = useState<ProductVariant | null>(null);
  const awaitingPhoto = variants.filter((variant) => !hasPhotography(variant)).length;
  // Ratings live on the product page's Reviews section only: a star row on every
  // card competes with the name and price, and a card should read as a catalogue
  // entry, not a listing. TODO(data-layer): pass the real average when the
  // reviews table exists, if the card rating is ever wanted back.
  // Only a photographed colour may preview a different shot — hovering an
  // unphotographed swatch must never swap in an unrelated photo.
  const shownImage = hovered && hasPhotography(hovered) ? hovered.images[0] : product.image;

  return (
    <article className="product-card reveal">
      <div className="product-media">
        {/* The photograph is the primary way in to the PDP, so it carries its own
            button: covering the whole media area, keyboard reachable, and sitting
            beneath the wishlist and quick-view buttons so those keep working. */}
        <button
          className="card-open"
          onClick={onOpen}
          aria-label={`View ${product.name}`}
          title={product.name}
        >
          <img src={shownImage} alt={product.alt} loading="lazy" />
        </button>
        {product.tag && <span className="product-tag">{product.tag}</span>}
        <button
          className={`wish-button ${wished ? "is-active" : ""}`}
          onClick={(event) => { event.stopPropagation(); onWish(); }}
          aria-label={`${wished ? "Remove" : "Add"} ${product.name} ${wished ? "from" : "to"} wishlist`}
        >
          <Icon name="heart" />
        </button>
        <button
          className="quick-button"
          onClick={(event) => { event.stopPropagation(); onQuick(); }}
        >
          Quick view
        </button>
      </div>
      <button className="product-info" onClick={onOpen}>
        <span>
          <small>{product.collection}</small>
          <strong>{product.name}</strong>
        </span>
        <b className="price-tag">
          {product.salePrice ? salePair(product.price, product.salePrice) : priceLabel(product)}
        </b>
      </button>
      {/* Colour row, always visible: the shopper must be able to see the colours
          that exist without hovering. Hovering a chip still previews that colour's
          own photograph (never a substitute), and tapping it opens the piece on
          that colour. A colour whose photography is still pending is dashed,
          labelled in text and not selectable. */}
      {variants.length > 1 && (
        <div className="product-colours" role="group" aria-label={`Colours for ${product.name}`}>
          {variants.map((variant) => {
            const pendingPhoto = !hasPhotography(variant);
            const label = pendingPhoto
              ? `${variant.colorName}, photograph available on request`
              : `See ${product.name} in ${variant.colorName}`;
            return (
              <button
                key={variant.id}
                className={`colour-chip ${hovered?.id === variant.id ? "is-active" : ""} ${pendingPhoto ? "is-pending" : ""}`}
                style={{ background: variant.colorHex }}
                title={pendingPhoto ? label : `${variant.colorName}, tap to see it`}
                aria-label={label}
                disabled={pendingPhoto}
                onMouseEnter={() => pendingPhoto || setHovered(variant)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => pendingPhoto || setHovered(variant)}
                onBlur={() => setHovered(null)}
                onClick={(event) => {
                  event.stopPropagation();
                  if (!pendingPhoto) onSelectVariant?.(variant);
                }}
              />
            );
          })}
          <em>
            {variants.length} colours{awaitingPhoto ? ` · ${awaitingPhoto} photographs on request` : ""}
          </em>
        </div>
      )}
    </article>
  );
}

/**
 * Luxury colour selector — real variants, not tints. Each swatch shows the
 * colour chip + name; the selected one wears a gold ring and check. Sold-out
 * and photography-pending colours are both unselectable, and each state is
 * conveyed in text as well as colour (never colour alone) so a greyed swatch
 * is never mistaken for a photo we simply failed to load.
 */
function VariantSelector({
  product,
  selected,
  onSelect,
}: {
  product: Product;
  selected?: ProductVariant;
  onSelect: (variant: ProductVariant) => void;
}) {
  const variants = liveVariants(product);
  if (variants.length === 0) return null;

  const awaitingPhoto = variants.filter((variant) => !hasPhotography(variant));

  return (
    <div className="variant-selector" role="radiogroup" aria-label="Select colour">
      <div className="selector-head">
        <span>
          Colour · <em>{selected?.colorName ?? variants[0]?.colorName}</em>
        </span>
      </div>
      <div className="variant-swatches">
        {variants.map((variant) => {
          const active = selected?.id === variant.id;
          const soldOut = !isOrderable(variant);
          const pendingPhoto = !hasPhotography(variant);
          const state = pendingPhoto ? "photo on request" : soldOut ? "sold out" : "";
          return (
            <button
              key={variant.id}
              role="radio"
              aria-checked={active}
              disabled={soldOut || pendingPhoto}
              className={`variant-swatch ${active ? "is-active" : ""} ${soldOut ? "is-soldout" : ""} ${pendingPhoto ? "is-pending" : ""}`}
              onClick={() => onSelect(variant)}
              title={`${variant.colorName}${state ? `, ${state}` : ""}`}
            >
              <i style={{ background: variant.colorHex }} aria-hidden="true" />
              <span>{variant.colorName}</span>
              {pendingPhoto ? <small>Photo on request</small> : soldOut ? <small>Sold out</small> : null}
            </button>
          );
        })}
      </div>
      {awaitingPhoto.length > 0 && (
        <p className="variant-pending-note">
          {awaitingPhoto.length === 1
            ? `${awaitingPhoto[0].colorName} is`
            : `${awaitingPhoto.map((variant) => variant.colorName).join(", ")} are`}{" "}
          not photographed yet, so it cannot be selected here. Contact us and we will send
          a photograph of the actual cloth.
        </p>
      )}
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  action,
  titleId,
}: {
  eyebrow: string;
  title: string;
  action?: React.ReactNode;
  /** Optional id for the heading, so a section can point aria-labelledby at it. */
  titleId?: string;
}) {
  return (
    <header className="section-header reveal">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 id={titleId}>{title}</h2>
      </div>
      {action}
    </header>
  );
}

/**
 * The sample reviews are drawn from ONE pool by product id, so a piece always
 * shows the same three and the page never reshuffles. The pool is deliberately
 * uneven — length, tone and rating differ, and one of them is a qualified
 * four-star — because a column of identically glowing paragraphs reads like
 * copy, not like feedback.
 *
 * ------------------------------------------------------------------
 * TODO(data-layer) — PLACEHOLDERS, NOT REAL DATA. There is no `reviews` table
 * yet (see the schema sketch on `Review` in lib/data/types.ts). When it lands:
 * delete this whole block, add lib/data/reviews.ts (listReviews /
 * reviewSummary) and pass the real values in. The section itself needs nothing
 * more than `{ average, count, distribution }` plus a `Review[]`.
 * ------------------------------------------------------------------
 */
function placeholderReviewDistribution(productId: number): { stars: number; count: number }[] {
  const seed = Math.max(1, productId);
  return [
    { stars: 5, count: 8 + (seed % 3) },
    { stars: 4, count: 3 },
    { stars: 3, count: 1 },
    { stars: 2, count: 0 },
    { stars: 1, count: 0 },
  ];
}

function placeholderReviewSummary(productId: number) {
  const distribution = placeholderReviewDistribution(productId);
  const count = distribution.reduce((total, row) => total + row.count, 0);
  const stars = distribution.reduce((total, row) => total + row.stars * row.count, 0);
  return { distribution, count, average: Math.round((stars / count) * 10) / 10 };
}

const SAMPLE_REVIEWS: { rating: number; author: string; date: string; body: string }[] = [
  {
    rating: 5,
    author: "Chidinma E.",
    date: "2025-07-02",
    body: "The fit is exact. I sent my measurements on the Tuesday and it was finished the following week. The hem sits where it should, which has never been my experience buying a dress online.",
  },
  {
    rating: 4,
    author: "Ruth M.",
    date: "2025-08-19",
    body: "The cloth is heavier than it looks on screen, which is a good thing. It does crease slightly at the waist after a full day of sitting.",
  },
  {
    rating: 5,
    author: "Adaeze O.",
    date: "2025-09-04",
    body: "They adjusted the shoulder for me and did not charge for it.",
  },
  {
    rating: 5,
    author: "Halima B.",
    date: "2025-06-14",
    body: "Second piece from the house. The cut is the same as my first one, which is why I ordered again without a fitting.",
  },
  {
    rating: 4,
    author: "Ngozi A.",
    date: "2025-09-27",
    body: "Colour is accurate to the photographs. Delivery took a day longer than quoted, and I was told before it happened.",
  },
];

/** Three sample reviews per piece, chosen deterministically from the pool. */
function placeholderReviews(productId: number): Review[] {
  const seed = Math.max(1, productId);
  return [0, 1, 2].map((step) => {
    const sample = SAMPLE_REVIEWS[(seed + step) % SAMPLE_REVIEWS.length];
    return {
      id: seed * 10 + step,
      productId,
      rating: sample.rating,
      author: sample.author,
      date: sample.date,
      body: sample.body,
    };
  });
}

/**
 * Related pieces for the product page.
 *
 * An owner-chosen list wins: `relatedIds` is shown in the order she set in the
 * admin. Otherwise the site computes its own — the same collection first, then
 * the closest fabric, then the rest — so the row is never empty and never shows
 * the piece already on screen. Either way, three.
 */
function relatedTo(products: Product[], active: Product, take = 3): Product[] {
  const others = products.filter((product) => product.id !== active.id);

  if (active.relatedIds?.length) {
    const byId = new Map(others.map((product) => [product.id, product]));
    const chosen = active.relatedIds
      .map((id) => byId.get(id))
      .filter((product): product is Product => Boolean(product));
    if (chosen.length) return chosen.slice(0, take);
  }

  const sameCollection = others.filter((product) => product.collection === active.collection);
  const sameFabric = others.filter(
    (product) => product.collection !== active.collection && product.fabric && product.fabric === active.fabric,
  );
  const rest = others.filter(
    (product) =>
      product.collection !== active.collection && !(product.fabric && product.fabric === active.fabric),
  );
  return [...sameCollection, ...sameFabric, ...rest].slice(0, take);
}

/** The measurements the atelier cuts to, so a shopper can size herself. */
const SIZE_GUIDE = [
  { size: "XS", bust: "80 to 84 cm / 31 to 33 in", waist: "62 to 66 cm / 24 to 26 in", hip: "88 to 92 cm / 35 to 36 in" },
  { size: "S", bust: "85 to 89 cm / 33 to 35 in", waist: "67 to 71 cm / 26 to 28 in", hip: "93 to 97 cm / 37 to 38 in" },
  { size: "M", bust: "90 to 94 cm / 35 to 37 in", waist: "72 to 76 cm / 28 to 30 in", hip: "98 to 102 cm / 39 to 40 in" },
  { size: "L", bust: "95 to 100 cm / 37 to 39 in", waist: "77 to 82 cm / 30 to 32 in", hip: "103 to 108 cm / 41 to 43 in" },
  { size: "XL", bust: "101 to 107 cm / 40 to 42 in", waist: "83 to 89 cm / 33 to 35 in", hip: "109 to 115 cm / 43 to 45 in" },
];

/**
 * The atelier's booking form. It writes a row to `fitting_requests` through a
 * server action. If that write cannot happen — the table has not been created
 * yet, or the connection drops — the visitor is handed a pre-filled email
 * rather than a fake success message.
 */
function FittingForm({ contactEmail }: { contactEmail?: string | null }) {
  const [state, setState] = useState<{ status: "idle" | "sending" | "sent" | "manual"; message: string; href?: string }>({
    status: "idle",
    message: "",
  });

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const summary = [
      `Service: ${data.get("service")}`,
      `Name: ${data.get("name")}`,
      `Email: ${data.get("email")}`,
      `Phone: ${data.get("phone") || "not given"}`,
      `Preferred day: ${data.get("preferredDate") || "any"}`,
      "",
      `Notes: ${data.get("notes") || "none"}`,
    ].join("\n");

    setState({ status: "sending", message: "" });
    try {
      const result = await requestFitting(data);
      if (result.ok) {
        form.reset();
        setState({ status: "sent", message: result.message });
        return;
      }
      setState({
        status: "manual",
        message: result.message,
        href: houseMailto("Fitting request", summary, contactEmail),
      });
    } catch {
      setState({
        status: "manual",
        message: "That did not go through. Send it by email instead and we will pick it up.",
        href: houseMailto("Fitting request", summary, contactEmail),
      });
    }
  }

  return (
    <form className="fitting-form reveal" onSubmit={submit}>
      <p className="eyebrow">REQUEST AN APPOINTMENT</p>
      <p style={{ margin: 0, color: "var(--brand-muted)", fontSize: 12, lineHeight: 1.6 }}>
        Fill in the details below and we will get back to you within one working day.
      </p>
      <label className="fitting-field">
        <span>What do you need?</span>
        <select name="service" defaultValue={FITTING_SERVICES[0]} required>
          {FITTING_SERVICES.map((service) => (
            <option key={service} value={service}>{service}</option>
          ))}
        </select>
      </label>
      <div className="fitting-row">
        <label className="fitting-field">
          <span>Your name</span>
          <input type="text" name="name" autoComplete="name" placeholder="Full name" required />
        </label>
        <label className="fitting-field">
          <span>Email address</span>
          <input type="email" name="email" autoComplete="email" placeholder="you@example.com" required />
        </label>
      </div>
      <div className="fitting-row">
        <label className="fitting-field">
          <span>Phone / WhatsApp</span>
          <input type="tel" name="phone" autoComplete="tel" placeholder="08012345678" />
        </label>
        <label className="fitting-field">
          <span>Preferred date</span>
          <input type="date" name="preferredDate" />
        </label>
      </div>
      <label className="fitting-field">
        <span>Anything we should know?</span>
        <textarea name="notes" rows={4} placeholder="The dress you ordered, your usual size, what needs adjusting. Anything helps." />
      </label>
      <button className="gold-button" type="submit" disabled={state.status === "sending"}>
        {state.status === "sending" ? "Sending your request…" : "Send appointment request ↗"}
      </button>
      {state.status === "sent" && <p className="fitting-status is-ok" role="status">{state.message}</p>}
      {state.status === "manual" && (
        <p className="fitting-status is-manual" role="status">
          {state.message}{" "}
          {state.href && <a className="inline-link" href={state.href}>Open the email instead</a>}
        </p>
      )}
      <p className="fitting-note">
        Your details are only used to arrange this appointment. No marketing, no spam.
      </p>
    </form>
  );
}

/**
 * The house's account — set large enough to read off a phone while typing it
 * into a banking app, with the number selectable in one gesture and copyable
 * in one tap. Identical on the checkout page and the confirmation screen, so
 * what she is told never depends on where she is reading it.
 */
function BankDetailsBlock({ bank }: { bank: BankDetails }) {
  const [copyState, setCopyState] = useState<"idle" | "done" | "manual">("idle");

  async function copy() {
    try {
      // The bare number, without the spacing it may be written with.
      await navigator.clipboard.writeText(bank.accountNumber.replace(/\s+/g, ""));
      setCopyState("done");
      window.setTimeout(() => setCopyState("idle"), 3000);
    } catch {
      // Clipboard blocked (older browser, refused permission): the number is on
      // screen and selectable, so say that instead of pretending it copied.
      setCopyState("manual");
    }
  }

  return (
    <div className="bank-details">
      <div className="bank-row">
        <span>Bank</span>
        <strong>{bank.bankName}</strong>
      </div>
      <div className="bank-row bank-account">
        <span>Account number</span>
        <strong>{bank.accountNumber}</strong>
        <button type="button" className="copy-button" onClick={copy}>
          {copyState === "done" ? "Copied" : "Copy number"}
        </button>
        <small role="status" aria-live="polite">
          {copyState === "manual"
            ? "Copying is blocked in this browser. Press and hold to select the number."
            : ""}
        </small>
      </div>
      <div className="bank-row">
        <span>Account name</span>
        <strong>{bank.accountName}</strong>
      </div>
    </div>
  );
}

/** What POST /api/checkout answers with — everything the confirmation needs. */
type PlacedOrder = {
  reference: string;
  subtotal: number;
  shipping: number;
  total: number;
  currency: string;
  /** The account the customer was shown, as stored on the order. */
  bankDetails: BankDetails | null;
  /** True when the order was only logged (no database configured yet). */
  stub: boolean;
  /**
   * One entry per piece, captured at submit time so the confirmation stands on
   * its own even though the bag is emptied the moment the order is placed.
   */
  lines: { label: string; amount: number }[];
};

/**
 * Checkout — MANUAL BANK TRANSFER.
 *
 * There is no payment gateway to integrate: the client controls payment
 * herself. So this page does two jobs and nothing else:
 *
 *   1. collect the delivery details, and
 *   2. tell the client exactly where to send the money.
 *
 * Submitting creates the order as paymentStatus 'pending-payment' (the route
 * snapshots the bank details onto it) and shows a confirmation she can come
 * back to. No card field exists anywhere in this flow, deliberately.
 */
function CheckoutView({
  cart,
  bankDetails,
  contactEmail,
  placed,
  onPlaced,
  onBackToShop,
}: {
  cart: CartItem[];
  bankDetails?: BankDetails | null;
  contactEmail?: string | null;
  placed: PlacedOrder | null;
  onPlaced: (order: PlacedOrder) => void;
  onBackToShop: () => void;
}) {
  const [status, setStatus] = useState<"idle" | "submitting">("idle");
  const [message, setMessage] = useState("");

  const subtotal = cart.reduce((sum, item) => sum + unitPrice(item.product, item.variant) * item.qty, 0);
  const shipping = FLAT_SHIPPING;
  const total = subtotal + shipping;
  /**
   * The account to show. On the confirmation screen it is the snapshot the
   * order itself stored (so the page can never drift from the record); before
   * that it is the live settings. When it is empty the page says so rather
   * than showing a blank "pay here" block.
   */
  const bank = placed ? placed.bankDetails : bankDetails ?? null;
  const readyToPay = hasBankDetails(bank);
  const currency = cart[0]?.product.currency ?? "NGN";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setStatus("submitting");
    setMessage("");
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: {
            name: String(data.get("name") ?? "").trim(),
            email: String(data.get("email") ?? "").trim(),
            phone: String(data.get("phone") ?? "").trim() || null,
            address: String(data.get("address") ?? "").trim(),
            note: String(data.get("note") ?? "").trim() || null,
          },
          // Prices here are advisory: the route re-resolves every line from the
          // catalogue, so a tampered bag cannot invent a total.
          items: cart.map((item) => ({
            productId: item.product.id,
            variantId: item.variant?.id ?? null,
            size: item.size,
            qty: item.qty,
          })),
          subtotal,
          shipping,
          total,
          currency,
        }),
      });
      const payload = (await response.json()) as Partial<PlacedOrder> & { ok?: boolean; message?: string };
      if (!response.ok || !payload.ok || !payload.reference) {
        setStatus("idle");
        setMessage(payload.message ?? "That did not go through. Your bag is safe, please try again.");
        return;
      }
      onPlaced({
        reference: payload.reference,
        subtotal: Number(payload.subtotal ?? subtotal),
        shipping: Number(payload.shipping ?? shipping),
        total: Number(payload.total ?? total),
        currency: payload.currency ?? currency,
        bankDetails: payload.bankDetails ?? bank ?? null,
        stub: Boolean(payload.stub),
        lines: cart.map((item) => ({
          label: `${item.product.name}, ${item.variant?.colorName ?? "house colour"}, size ${item.size} ×${item.qty}`,
          amount: unitPrice(item.product, item.variant) * item.qty,
        })),
      });
    } catch {
      setStatus("idle");
      setMessage(
        "We could not reach the studio just now. Your bag is safe, so try again or send it by email.",
      );
    }
  }

  /* ------------------------------------------------------------------
     Confirmation. She will often leave this page to open her banking app,
     so it repeats everything needed to finish the job: the order number,
     the account, and the total due. Nothing here is charged automatically.
  ------------------------------------------------------------------ */
  if (placed) {
    return (
      <main className="page-main checkout-page">
        <section className="page-hero checkout-hero">
          <p className="eyebrow">ORDER PLACED</p>
          <h1>Thank you.</h1>
          <p className="page-hero-note">
            Your order number and account details are below. Nothing has been paid yet: transfer
            the total and we confirm within {PAYMENT_WINDOW}.
          </p>
          <p>Bank transfer · {placed.reference}</p>
        </section>

        <section className="checkout-body">
          <div className="checkout-confirmation">
            <div className="checkout-block-head">
              <p className="eyebrow">YOUR ORDER NUMBER</p>
              <h2 className="confirmation-reference">{placed.reference}</h2>
            </div>
            <p className="checkout-lead">
              Quote this number as your transfer reference. Keep it. It is all you need to complete
              the payment, even if you close this page.
            </p>

            {placed.stub && (
              <p className="checkout-note">
                Preview: no database is connected, so this order was logged only. Nothing was saved
                and nothing was charged.
              </p>
            )}

            {readyToPay && bank ? (
              <>
                <p className="checkout-instruction">
                  Transfer <b>{money(placed.total, currency)}</b> to the account below, then send us the receipt. We
                  confirm within {PAYMENT_WINDOW}.
                </p>
                <BankDetailsBlock bank={bank} />
              </>
            ) : (
              <p className="checkout-note">
                Bank details are confirmed by email. The account details will come through with your
                order number.
              </p>
            )}

            <dl className="checkout-totals">
              <div>
                <dt>Subtotal</dt>
                <dd>{money(placed.subtotal, currency)}</dd>
              </div>
              <div>
                <dt>Shipping</dt>
                <dd>{placed.shipping > 0 ? money(placed.shipping, currency) : "Complimentary"}</dd>
              </div>
              <div className="checkout-total">
                <dt>Total due</dt>
                <dd>{money(placed.total, currency)}</dd>
              </div>
            </dl>

            <ul className="checkout-lines confirmation-lines">
              {placed.lines.map((line) => (
                <li className="checkout-line" key={line.label}>
                  <div>
                    <strong>{line.label}</strong>
                  </div>
                  <b>{money(line.amount, currency)}</b>
                </li>
              ))}
            </ul>

            <div className="checkout-actions">
              <a
                className="gold-button"
                href={houseMailto(
                  `Transfer receipt for ${placed.reference}`,
                  [
                    `Hello, I have sent the transfer for order ${placed.reference}.`,
                    "",
                    "What I ordered:",
                    ...placed.lines.map((line) => `• ${line.label}: ${money(line.amount, currency)}`),
                    "",
                    `Total: ${money(placed.total, currency)}`,
                    "",
                    "Attach or paste the transfer receipt below:",
                  ].join("\n"),
                  contactEmail,
                )}
              >
                Send the transfer receipt
              </a>
              <button type="button" className="outline-button" onClick={onBackToShop}>
                Continue shopping
              </button>
            </div>
            <p className="checkout-small">
              Orders stay open until the transfer is confirmed. Nothing expires and nothing is
              cancelled automatically.
            </p>
          </div>
          </section>
        </main>
    );
  }

  return (
    <main className="page-main checkout-page">
      <section className="page-hero checkout-hero">
        <p className="eyebrow">CHECKOUT</p>
        <h1>Checkout.</h1>
        <p className="page-hero-note">
          Payment is by bank transfer. Delivery is complimentary, and every piece is made by hand
          in small numbers.
        </p>
        <p>{cart.length === 1 ? "1 piece" : `${cart.length} pieces`} · {money(total)} due</p>
      </section>

      <form className="checkout-layout" onSubmit={submit}>
        <div className="checkout-main">
          <section className="checkout-block" aria-labelledby="checkout-details">
            <div className="checkout-block-head">
              <p className="eyebrow">01 · YOUR DETAILS</p>
              <h2 id="checkout-details">Delivery details</h2>
            </div>
            <div className="checkout-fields">
              <label className="checkout-field">
                <span>Full name</span>
                <input name="name" required autoComplete="name" placeholder="Adaeze Okafor" />
              </label>
              <label className="checkout-field">
                <span>Email</span>
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@email.com"
                />
              </label>
              <label className="checkout-field">
                <span>Phone (optional)</span>
                <input name="phone" autoComplete="tel" placeholder="+234 800 000 0000" />
              </label>
              <label className="checkout-field checkout-field-wide">
                <span>Delivery address</span>
                <textarea
                  name="address"
                  rows={3}
                  required
                  placeholder="Street, city, state, country"
                />
              </label>
              <label className="checkout-field checkout-field-wide">
                <span>Note for the studio (optional)</span>
                <textarea
                  name="note"
                  rows={2}
                  placeholder="Your height, an alteration, or a date you need it for."
                />
              </label>
            </div>
          </section>

          <section className="checkout-block" aria-labelledby="checkout-payment">
            <div className="checkout-block-head">
              <p className="eyebrow">02 · PAYMENT</p>
              <h2 id="checkout-payment">Pay by bank transfer</h2>
            </div>
            {readyToPay && bank ? (
              <>
                <BankDetailsBlock bank={bank} />
                <p className="checkout-instruction">
                  Transfer the total shown, then place your order. We confirm payment and begin
                  work within {PAYMENT_WINDOW}. Quote your order number as the transfer reference.
                </p>
              </>
            ) : (
              <p className="checkout-note">
                Bank details are confirmed by email. Place your order and the account details will
                come through with your order number.
              </p>
            )}
          </section>

          {/* A coupon field is deliberately absent — the client has not asked for
              one, and a discount box that does nothing is worse than none.
              TODO(coupon): when she wants codes, add `discount` to Order, a
              `lib/data/coupons.ts` lookup and one more row in the totals. */}
        </div>

        <aside className="checkout-summary" aria-labelledby="checkout-summary">
          <div className="checkout-block-head">
            <p className="eyebrow">YOUR ORDER</p>
            <h2 id="checkout-summary">Order summary</h2>
          </div>
          <ul className="checkout-lines">
            {cart.map((item) => (
              <li className="checkout-line" key={item.key}>
                <img
                  src={variantImage(item.product, item.variant)}
                  alt={item.variant ? `${item.product.name} in ${item.variant.colorName}` : item.product.name}
                  loading="lazy"
                />
                <div>
                  <small>{item.product.collection}</small>
                  <strong>{item.product.name}</strong>
                  <span>
                    {item.variant && (
                      <>
                        <i
                          className="cart-color-dot"
                          style={{ background: item.variant.colorHex }}
                          aria-hidden="true"
                        />
                        {item.variant.colorName} ·{" "}
                      </>
                    )}
                    Size {item.size} · Qty {item.qty}
                  </span>
                </div>
                <b>{money(unitPrice(item.product, item.variant) * item.qty, item.product.currency)}</b>
              </li>
            ))}
          </ul>

          <dl className="checkout-totals">
            <div>
              <dt>Subtotal</dt>
              <dd>{money(subtotal)}</dd>
            </div>
            <div>
              <dt>Shipping</dt>
              <dd>Complimentary</dd>
            </div>
            {/* Discount — see the TODO(coupon) note in the payment column. */}
            {/* Duties & taxes — no rate has been agreed, so none is charged and
                none is shown. TODO(tax): add a rate to settings and a row here
                once the client decides how duties are handled. */}
            <div className="checkout-total">
              <dt>Total due</dt>
              <dd>{money(total)}</dd>
            </div>
          </dl>

          <button className="gold-button" type="submit" disabled={status === "submitting"}>
            {status === "submitting" ? "Placing your order…" : "Confirm order"}
          </button>
          {message && (
            <p className="checkout-error" role="alert">
              {message}
            </p>
          )}
            <p className="checkout-small">
              No payment is taken on this page. Transfer ${total} to the account in step 02 and we
              confirm within {PAYMENT_WINDOW}.
            </p>
          <button type="button" className="inline-link" onClick={onBackToShop}>
            Keep shopping
          </button>
        </aside>

      </form>

      {/* Same treatment as the product page's service row — a promise, not an
          icon card. */}
      <div className="service-note checkout-trust">
        <span>COMPLIMENTARY DELIVERY</span>
        <span>HAND-FINISHED IN OWERRI</span>
        <span>PRIVATE CLIENT SUPPORT</span>
      </div>
    </main>
  );
}

export default function App({
  products = [],
  lookbook = [],
  social,
  contactEmail,
  bankDetails,
  content = CONTENT_DEFAULTS,
  initialView = "home",
  initialCollection,
  initialProductId,
  origin,
}: {
  products?: Product[];
  lookbook?: LookbookFrame[];
  social?: SocialLinks;
  /** Atelier address shown in the fitting form + client-care links. */
  contactEmail?: string | null;
  /** Where clients pay (manual bank transfer). Shown at checkout, snapshotted on the order. */
  bankDetails?: BankDetails | null;
  /**
   * The owner's editorial copy, keyed by slug (Admin → Content → Page copy).
   * Defaults to the shipped wording, so a page without it renders the same
   * text it always has.
   */
  content?: Partial<Record<ContentKey, Partial<ContentBlock>>>;
  /**
   * Which view opens on load. The thin routes in app/shop, app/about,
   * app/fitting and app/contact pass their own value so each of those is a real,
   * linkable, indexable URL rather than a client-side state a crawler cannot
   * reach. Defaults to the home page.
   */
  initialView?: View;
  /**
   * A collection to open the shop on, so /thrift lands on the pre-loved pieces
   * instead of the whole catalogue.
   */
  initialCollection?: string;
  /**
   * The piece a /product/[id] route should open on, so the product page is
   * server-rendered with its own structured data.
   */
  initialProductId?: number;
  /**
   * The origin this page is served from, passed down from the server route so
   * the Product schema's url names the right host. The browser cannot work this
   * out for itself: Vercel's domain variables are server-only, and guessing
   * would risk a hydration mismatch.
   */
  origin?: string;
}) {
  /** One block, resolved against the shipped defaults. */
  const block = (key: ContentKey): ContentBlock => ({
    key,
    label: "",
    ...CONTENT_DEFAULTS[key],
    ...content[key],
  });

  /**
   * A title as JSX. The owner writes a newline where the headline should break,
   * and wraps a phrase in asterisks to set it in italic — the same shorthand the
   * shipped copy uses, so an edit keeps the shape of the headline instead of
   * running into one long line.
   */
  const titleLines = (text: string) =>
    text.split("\n").map((line, index, all) => {
      const parts = line.split("*");
      return (
        <Fragment key={index}>
          {parts.map((part, partIndex) =>
            partIndex % 2 === 1 ? <em key={partIndex}>{part}</em> : <Fragment key={partIndex}>{part}</Fragment>,
          )}
          {index < all.length - 1 && <br />}
        </Fragment>
      );
    });

  const [view, setView] = useState<View>(initialView);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);
  const [sizeFilter, setSizeFilter] = useState("Any");
  const [savedOnly, setSavedOnly] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  /** Set once POST /api/checkout has answered — drives the confirmation screen. */
  const [placedOrder, setPlacedOrder] = useState<PlacedOrder | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const cartCount = cart.reduce((total, item) => total + item.qty, 0);
  const cartSubtotal = cart.reduce((total, item) => total + unitPrice(item.product, item.variant) * item.qty, 0);
  const [quickProduct, setQuickProduct] = useState<Product | null>(null);

  /**
   * The piece the product page opens on. A dedicated /product/[id] route passes
   * `initialProductId`, so that page is server-rendered with its own Product
   * structured data in the HTML — which is what a crawler reads. Falling back to
   * the first piece keeps the in-app deep link (?product=id) working.
   */
  const openingProduct = useMemo(
    () => (initialProductId ? products.find((p) => p.id === initialProductId) : undefined) ?? products[0],
    // Only the first render's value matters; later product changes are state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [activeProduct, setActiveProduct] = useState(openingProduct);
  const [activeVariant, setActiveVariant] = useState<ProductVariant | undefined>(() =>
    openingProduct ? defaultVariant(openingProduct) : undefined,
  );
  const [quickVariant, setQuickVariant] = useState<ProductVariant | undefined>(undefined);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [wishlist, setWishlist] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState("M");
  const [shopFilter, setShopFilter] = useState(initialCollection ?? "All");
  const [sort, setSort] = useState("Featured");

  /** The studio film element, so reduced-motion preferences can pause it. */
  const studioFilmRef = useRef<HTMLVideoElement | null>(null);

  /**
   * The studio film: load it only when it is about to be seen, play it only
   * while it is on screen, and pause it for anyone who has asked for reduced
   * motion.
   *
   * WHY: the clip is ~3 MB. Downloading that on every home page visit is a real
   * cost on Nigerian mobile data, and a looping video left playing while the
   * reader scrolls elsewhere burns battery for nothing. The stylesheet already
   * collapses CSS animation for reduced-motion users, but CSS cannot pause a
   * <video>, so that part has to be done here.
   */
  useEffect(() => {
    const film = studioFilmRef.current;
    if (!film) return;
    if (typeof window === "undefined") return;

    const motionQuery =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;
    const reduceMotion = () => Boolean(motionQuery?.matches);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !reduceMotion()) {
            // play() rejects if the browser blocks autoplay — fine, the poster
            // simply stays on screen.
            void film.play().catch(() => {});
          } else {
            film.pause();
          }
        });
      },
      // Start a little before it arrives so it is already moving on screen.
      { rootMargin: "200px 0px", threshold: 0.15 },
    );

    observer.observe(film);

    // If the preference flips while the page is open, honour it immediately.
    const onMotionChange = () => {
      if (reduceMotion()) film.pause();
    };
    motionQuery?.addEventListener("change", onMotionChange);

    return () => {
      observer.disconnect();
      motionQuery?.removeEventListener("change", onMotionChange);
    };
  }, []);

  /** Gallery for the current product/colour: variant images, else the product shot. */
  const galleryImages = useMemo(() => {
    const fromVariant = activeVariant?.images ?? [];
    return fromVariant.length ? fromVariant : [activeProduct?.image ?? ""];
  }, [activeProduct, activeVariant]);

  /** Sizes offered by the active colour (falls back to the house size run). */
  const activeSizes = activeVariant?.sizes.length ? activeVariant.sizes : HOUSE_SIZES;

  // TODO(data-layer): replace both of these with lib/data/reviews.ts once the
  // `reviews` table exists — see the block above `SIZE_GUIDE` and the `Review`
  // type in lib/data/types.ts. The section below only needs these two values.
  // Keyed off a fallback id so an empty catalogue (Supabase unreachable) still
  // renders instead of throwing on an undefined product.
  const reviewSummary = placeholderReviewSummary(activeProduct?.id ?? 0);
  const reviews = placeholderReviews(activeProduct?.id ?? 0);

  /**
   * View -> public URL. Each of these is a real route (see app/shop, app/about,
   * app/fitting, app/contact), so moving between pages keeps the address bar
   * honest and a customer can copy or share the link they are looking at.
   */
  const pathForView = (next: View): string => {
    switch (next) {
      case "shop":
        return "/shop";
      case "about":
        return "/about";
      case "fitting":
        return "/fitting";
      case "contact":
        return "/contact";
      case "home":
        return "/";
      default:
        return "";
    }
  };

  const navigate = (next: View) => {
    setView(next);
    setMenuOpen(false);
    setSearchOpen(false);
    // Products and checkout manage their own URL below.
    const path = pathForView(next);
    if (path && typeof window !== "undefined" && window.location.pathname !== path) {
      window.history.pushState({ view: next }, "", path);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /** Jump to a section on the home page from anywhere in the site. */
  const scrollToSection = (id: string) => {
    setMenuOpen(false);
    if (view !== "home") {
      setView("home");
      // Wait for the home view to mount before scrolling to its section.
      window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 120);
      return;
    }
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  /** Shop, optionally already filtered to one collection or to saved pieces. */
  const goShop = (options?: { collection?: string; saved?: boolean }) => {
    setShopFilter(options?.collection ?? "All");
    setSavedOnly(Boolean(options?.saved));
    setSizeFilter("Any");
    setQuery("");
    navigate("shop");
  };

  /**
   * Theme: dark by default, light on request. The visitor's choice is stored
   * under "avw-theme" and written to <html data-theme>, which is what the
   * [data-theme="light"] palette keys off. Applied before paint on mount, so
   * the page never flashes the wrong system.
   */
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = window.localStorage.getItem("avw-theme") === "light" ? "light" : "dark";
    setTheme(saved);
    if (saved === "light") {
      document.documentElement.dataset.theme = "light";
    } else {
      delete document.documentElement.dataset.theme;
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    if (next === "light") {
      document.documentElement.dataset.theme = "light";
    } else {
      delete document.documentElement.dataset.theme;
    }
    window.localStorage.setItem("avw-theme", next);
  };

  /**
   * Admin → Edit product → “View on site” opens `/?product=<id>`. The
   * storefront is one client component with no router, so the preview link is
   * read once here and the piece is opened — no separate route to maintain.
   */
  useEffect(() => {
    const id = Number(new URLSearchParams(window.location.search).get("product"));
    if (!id) return;
    const product = products.find((candidate) => candidate.id === id);
    if (product) openProduct(product);
    // Only when the catalogue changes: this is a one-shot deep link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products]);

  /**
   * Keep the browser's back and forward buttons working now that navigating
   * pushes a real path. Without this, pressing back would change the address bar
   * while the page stayed put.
   */
  useEffect(() => {
    const onPop = () => {
      const path = window.location.pathname;
      if (path.startsWith("/product/")) {
        const id = Number(path.split("/")[2]);
        const product = products.find((candidate) => candidate.id === id);
        if (product) {
          setActiveProduct(product);
          setActiveVariant(defaultVariant(product));
          setGalleryIndex(0);
          setView("product");
          return;
        }
      }
      if (path === "/shop") setView("shop");
      else if (path === "/about") setView("about");
      else if (path === "/fitting") setView("fitting");
      else if (path === "/contact") setView("contact");
      else setView("home");
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // Re-bound when the catalogue changes so the lookup is never stale.
  }, [products]);

  /**
   * Preload each colour's own photograph as soon as the piece is opened, so a
   * swatch swap is instant instead of leaving the previous colour on screen
   * while the browser fetches the next one. Only images[0] is preloaded: the
   * extra angles in the strip are fetched when the shopper asks for them.
   */
  useEffect(() => {
    if (!activeProduct) return;
    const sources = new Set<string>();
    liveVariants(activeProduct).forEach((variant) => {
      const [first] = variant.images;
      if (first) sources.add(first);
    });
    if (activeProduct.image) sources.add(activeProduct.image);
    sources.forEach((src) => {
      const preload = document.createElement("img");
      preload.decoding = "async";
      preload.src = src;
    });
  }, [activeProduct]);

  /**
   * An empty bag has nothing to check out, so send the shopper to the shop
   * rather than rendering a checkout page with no lines in it — except straight
   * after a successful order, when the bag is emptied on purpose and the
   * confirmation has to stay on screen.
   */
  useEffect(() => {
    if (view === "checkout" && !placedOrder && cart.length === 0) goShop();
    // goShop is re-created on every render; these three values are what decide
    // whether a redirect is actually due.
  }, [view, cart.length, placedOrder]);

  const openProduct = (product: Product, variant?: ProductVariant) => {
    const chosen = variant ?? defaultVariant(product);
    setActiveProduct(product);
    setActiveVariant(chosen);
    setGalleryIndex(0);
    // Reset size to the first in-stock size of the chosen colour.
    const sizes = chosen?.sizes.length ? chosen.sizes : ["XS", "S", "M", "L", "XL"];
    setSelectedSize(sizes.includes("M") ? "M" : (sizes[0] ?? "M"));
    // Give the piece its own address so it can be copied, shared or bookmarked.
    // The route is server-rendered, so opening that link cold also works.
    if (typeof window !== "undefined") {
      const path = `/product/${product.id}`;
      if (window.location.pathname !== path) window.history.pushState({ productId: product.id }, "", path);
    }
    navigate("product");
  };

  const openQuick = (product: Product, variant?: ProductVariant) => {
    setQuickProduct(product);
    setQuickVariant(variant ?? defaultVariant(product));
  };

  const addToCart = (product: Product, variant?: ProductVariant, size = selectedSize) => {
    const key = `${product.id}-${variant?.id ?? "base"}-${size}`;
    setCart((current) => {
      if (current.some((item) => item.key === key)) {
        return current.map((item) => (item.key === key ? { ...item, qty: item.qty + 1 } : item));
      }
      return [...current, { key, product, variant, size, qty: 1 }];
    });
    setQuickProduct(null);
    setCartOpen(true);
  };

  const changeQty = (key: string, delta: number) => {
    setCart((current) =>
      current.map((item) => (item.key === key ? { ...item, qty: item.qty + delta } : item)).filter((item) => item.qty > 0),
    );
  };

  const toggleWish = (id: number) => {
    setWishlist((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 950);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setQuickProduct(null);
      setCartOpen(false);
      setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /** Collection names that actually exist in the catalogue, not a fixed list. */
  /**
   * Shop filter list. The canonical collections come first so a collection the
   * house offers (THRIFT, say) is still listed — and still reachable from the
   * /thrift route — before a single piece has been posted to it. Any extra
   * collection already on a product is merged in, so a rename in the admin
   * console can never hide a piece.
   */
  const collections = useMemo(
    () => [
      "All",
      ...Array.from(
        new Set([...COLLECTIONS, ...products.map((product) => product.collection)]),
      ),
    ],
    [products],
  );

  /** Two collections to feature on the home page, taken from the catalogue. */
  const featuredCollections = collections.slice(1, 3);
  const imageFor = (collection: string) =>
    products.find((product) => product.collection === collection)?.image ?? "";
  const altFor = (collection: string) =>
    products.find((product) => product.collection === collection)?.alt ?? "";

  /** Does this piece come in `size`? Colours carry their own size runs. */
  const matchesSize = (product: Product, size: string) => {
    if (size === "Any") return true;
    const variants = liveVariants(product);
    if (variants.length === 0) return HOUSE_SIZES.includes(size);
    return variants.some((variant) => sizesFor(variant).includes(size));
  };

  const savedProducts = useMemo(
    () => products.filter((product) => wishlist.has(product.id)),
    [products, wishlist],
  );

  /**
   * Everything the shop grid needs: collection facet, size facet, saved-pieces
   * view and the search box all narrow the same list, and an empty result is a
   * real state the page explains instead of a blank grid.
   */
  const filteredProducts = useMemo(() => {
    let result = [...products];
    if (shopFilter !== "All") result = result.filter((product) => product.collection === shopFilter);
    if (sizeFilter !== "Any") result = result.filter((product) => matchesSize(product, sizeFilter));
    if (savedOnly) result = result.filter((product) => wishlist.has(product.id));
    const term = query.trim().toLowerCase();
    if (term) result = result.filter((product) => matchesTerm(product, term));
    if (sort === "Price: Low") result = result.sort((a, b) => a.price - b.price);
    if (sort === "Price: High") result = result.sort((a, b) => b.price - a.price);
    return result;
  }, [products, shopFilter, sizeFilter, savedOnly, query, sort, wishlist]);

  /** Search looks across the whole catalogue, not just the filtered shop view. */
  const searchResults = useMemo(
    () => products.filter((product) => matchesTerm(product, query.trim().toLowerCase())),
    [products, query],
  );

  /**
   * Reveal-on-scroll. This has to re-run whenever a different SET of cards is
   * rendered, not just when the view changes: filtering, searching or sorting
   * the shop mounts brand-new nodes that carry .reveal (opacity: 0) and an
   * observer created earlier has never seen them, which left pieces
   * permanently invisible once a filter had been applied.
   */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add("is-visible")),
      { threshold: 0.12 },
    );
    document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [view, filteredProducts, wishlist]);

  return (
    <div className="app-shell">
      <div className={`loader ${loading ? "" : "is-gone"}`} aria-hidden={!loading}>
        <div className="loader-mark"><img src="/avid-woman-vogue-logo.png" alt="" /></div>
        <span>AVID WOMAN VOGUE</span>
        <i />
      </div>

      <>
        <header className="site-header">
            <LogoButton onClick={() => navigate("home")} />
            {/* Plain words a shopper already knows instead of house jargon:
                the old "Lookbook" label is now "Gallery", and every item goes
                somewhere real (the old "Collections" button silently did nothing
                on any page other than home). */}
            <nav className="desktop-nav" aria-label="Primary navigation">
              <button className={view === "shop" ? "active" : ""} onClick={() => goShop()}>Shop</button>
              <button className={view === "shop" ? "active" : ""} onClick={() => goShop({ collection: "THRIFT" })}>Thrift</button>
              <button onClick={() => scrollToSection("collections")}>Collections</button>
              <button className={view === "about" ? "active" : ""} onClick={() => navigate("about")}>About</button>
              <button className={view === "contact" ? "active" : ""} onClick={() => navigate("contact")}>Contact</button>
            </nav>
            <div className="header-actions">
              <button className="header-cta desktop-action" onClick={() => navigate("fitting")}>Book a fitting</button>
              <button aria-label="Search the shop" onClick={() => setSearchOpen(true)}><Icon name="search" /></button>
              <button
                className="theme-toggle"
                onClick={toggleTheme}
                aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
              >
                <Icon name={theme === "light" ? "sun" : "moon"} />
              </button>
              <button className="desktop-action" aria-label={`Saved pieces (${wishlist.size})`} onClick={() => goShop({ saved: true })}>
                <Icon name="heart" />{wishlist.size > 0 && <span>{wishlist.size}</span>}
              </button>
              <button aria-label={`Bag with ${cartCount} items`} onClick={() => setCartOpen(true)}>
                <Icon name="bag" />{cartCount > 0 && <span>{cartCount}</span>}
              </button>
              <button className="menu-button" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Icon name="menu" /></button>
            </div>
          </header>

          <div className={`mobile-menu ${menuOpen ? "is-open" : ""}`}>
            <button className="menu-close" onClick={() => setMenuOpen(false)} aria-label="Close menu"><Icon name="close" /></button>
            <p className="eyebrow">Menu</p>
            <button onClick={() => goShop()}><small>01</small>Shop</button>
            <button onClick={() => goShop({ collection: "THRIFT" })}><small>02</small>Thrift store</button>
            <button onClick={() => scrollToSection("collections")}><small>03</small>Collections</button>
            <button onClick={() => navigate("about")}><small>04</small>About</button>
            <button onClick={() => navigate("fitting")}><small>05</small>Book an appointment</button>
            <button onClick={() => navigate("contact")}><small>06</small>Contact</button>
            <div className="menu-extra">
              <button onClick={() => goShop({ saved: true })}>Saved pieces{wishlist.size > 0 ? ` (${wishlist.size})` : ""}</button>
              <button onClick={toggleTheme}>
                {theme === "light" ? "Dark theme" : "Light theme"}
              </button>
            </div>
        </div>
      </>

      {view === "home" && (
        <main>
          <section className="hero">
            <StudioLighting />
            <div className="hero-copy">
              <p className="eyebrow">{block("home.hero").eyebrow}</p>
              <h1>{titleLines(block("home.hero").title)}</h1>
              <p className="hero-description">{block("home.hero").body}</p>
              <button className="text-link" onClick={() => goShop()}>
                {block("home.hero").ctaLabel || "View the collection"} <span>↗</span>
              </button>
            </div>
            <div className="hero-particles"><ParticleLogo /></div>
            <div className="hero-index"><span>AVW</span><i /><span>01 / 05</span></div>
            <button className="scroll-cue" onClick={() => scrollToSection("collections")}>
              <span>View the collection</span><i />
            </button>
          </section>

          <section className="collections section" id="collections">
            <SectionHeader
              eyebrow="SHOP BY COLLECTION · 01"
              title="Collections"
              action={<button className="text-link" onClick={() => goShop()}>See all {products.length} pieces <span>↗</span></button>}
            />
            <div className="collection-grid">
              {featuredCollections[0] && (
                <article className="collection-card collection-main reveal">
                  <img src={COLLECTION_CARD_IMAGES.daywear} alt={altFor(featuredCollections[0])} loading="lazy" />
                  <div>
                    <p>01 · {featuredCollections[0]}</p>
                    <h3>Daywear</h3>
                    <button onClick={() => goShop({ collection: featuredCollections[0] })}>
                      Shop {featuredCollections[0].toLowerCase()}
                    </button>
                  </div>
                </article>
              )}
              {featuredCollections[1] && (
                <article className="collection-card collection-side reveal">
                  <img src={COLLECTION_CARD_IMAGES.evening} alt={altFor(featuredCollections[1])} loading="lazy" />
                  <div>
                    <p>02 · {featuredCollections[1]}</p>
                    <h3>Evening</h3>
                    <button onClick={() => goShop({ collection: featuredCollections[1] })}>
                      Shop {featuredCollections[1].toLowerCase()}
                    </button>
                  </div>
                </article>
              )}
            </div>
          </section>

          <section className="manifesto section">
            <div className="manifesto-index reveal">02 <span>/</span> THE HOUSE</div>
            <div className="manifesto-copy reveal">
              <p className="eyebrow">{block("home.house").eyebrow}</p>
              <h2>{titleLines(block("home.house").title)}</h2>
              <p>{block("home.house").body}</p>
              <button className="outline-button" onClick={() => navigate("about")}>
                {block("home.house").ctaLabel || "Our story"}
              </button>
            </div>
            <div className="manifesto-image reveal">
              {/* The studio film. muted + playsInline is what lets a phone
                  autoplay it without a tap. `preload="none"` keeps the ~3 MB
                  off the wire until the panel is actually near the viewport —
                  the effect above starts it. `poster` shows a still frame until
                  then, and doubles as the fallback if the video never loads. */}
              <video
                ref={studioFilmRef}
                className="manifesto-film"
                src={STUDIO_FILM}
                poster={block("home.house").image || products[2]?.image || ""}
                muted
                loop
                playsInline
                preload="none"
                aria-label="Inside the AVID WOMAN VOGUE studio in Owerri"
              />
              <span>THE STUDIO</span>
            </div>
          </section>

          <section className="lookbook section" id="gallery">
            <SectionHeader
              eyebrow="LOOKBOOK · 03"
              title="Lookbook"
              action={<button className="text-link" onClick={() => goShop()}>Shop the pieces <span>↗</span></button>}
            />
            <div className="lookbook-track">
              {lookbook.map((frame) => (
                <figure
                  className="lookbook-frame reveal"
                  key={frame.number}
                  onClick={() => goShop()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') goShop(); }}
                  aria-label={`View lookbook frame ${frame.number}, tap to shop`}
                >
                  <img src={frame.image} alt={frame.alt} loading="lazy" />
                  <figcaption><span>{frame.number}</span><i /></figcaption>
                </figure>
              ))}
            </div>
            <p className="gallery-hint">
              Every piece photographed at our Owerri studio. Tap any image to shop.
            </p>
            {/* Mobile-only CTA so customers on phones don't scroll past without a way in */}
            <div className="lookbook-cta">
              <button className="gold-button" style={{ width: "auto", padding: "0 40px" }} onClick={() => goShop()}>
                Shop the collection <span style={{ marginLeft: 8 }}>↗</span>
              </button>
            </div>
          </section>

          <section className="arrivals section">
            <SectionHeader
              eyebrow="NEW IN · 04"
              title="New in"
              action={<button className="text-link" onClick={() => goShop()}>Shop all pieces <span>↗</span></button>}
            />
            <div className="product-grid">
              {products.slice(0, 4).map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onOpen={() => openProduct(product)}
                  onQuick={() => openQuick(product)}
                  onWish={() => toggleWish(product.id)}
                  wished={wishlist.has(product.id)}
                  onSelectVariant={(variant) => openProduct(product, variant)}
                />
              ))}
            </div>
          </section>

          {/* Appointments band */}
          <section className="fitting-band section" id="fittings">
            <div className="fitting-band-copy reveal">
              <p className="eyebrow">{block("home.fittings").eyebrow}</p>
              <h2>{titleLines(block("home.fittings").title)}</h2>
              <p>{block("home.fittings").body}</p>
              <button className="gold-button fitting-cta" onClick={() => navigate("fitting")}>
                {block("home.fittings").ctaLabel || "Book an appointment"} <span>↗</span>
              </button>
              <a
                className="fitting-whatsapp"
                href="https://wa.me/2347063243954"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.849L0 24l6.304-1.508A11.944 11.944 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.005-1.37l-.36-.213-3.727.891.92-3.63-.234-.373A9.818 9.818 0 0 1 2.182 12c0-5.422 4.396-9.818 9.818-9.818s9.818 4.396 9.818 9.818-4.396 9.818-9.818 9.818z" />
                </svg>
                Chat on WhatsApp
              </a>
            </div>
            <ul className="fitting-band-list reveal">
              <li><b>01</b><span>We check the fit on you, free with every order</span></li>
              <li><b>02</b><span>Adjustments and re-sizing, quoted before we start</span></li>
              <li><b>03</b><span>Made to your measurements, not a generic size chart</span></li>
            </ul>
          </section>

          <section className="newsletter section">
            <div className="newsletter-orbit"><ParticleLogo compact /></div>
            <div className="newsletter-copy reveal">
              <p className="eyebrow">{block("home.newsletter").eyebrow}</p>
              <h2>{titleLines(block("home.newsletter").title)}</h2>
              <p>{block("home.newsletter").body}</p>
              {subscribed ? (
                <p className="subscribe-note" role="status">
                  Your email app is open with a message ready to send. Once it goes, you are on the
                  list.
                </p>
              ) : (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    const typed = String(new FormData(event.currentTarget).get("email") ?? "");
                    window.location.href = houseMailto(
                      "Add me to the AVID WOMAN list",
                      `Please add ${typed} to the mailing list.`,
                      contactEmail,
                    );
                    setSubscribed(true);
                  }}
                >
                  <input type="email" name="email" aria-label="Email address" placeholder="YOUR EMAIL ADDRESS" required />
                  <button type="submit">Join the list <span>↗</span></button>
                </form>
              )}
            </div>
          </section>
        </main>
      )}

      {view === "shop" && (
        <main className="page-main">
          <section className="page-hero">
            <p className="eyebrow">THE COLLECTION</p>
            <h1>Shop AVID WOMAN VOGUE.</h1>
            <p className="page-hero-note">
              Every piece is cut and sewn by hand in our Owerri studio, in small numbers, and
              checked before it is packed. Not sure of your size?{" "}
              <button className="inline-link" onClick={() => navigate("fitting")}>
                Book a fitting
              </button>{" "}
              and we will measure you before your order is cut.
            </p>
            <p>
              {filteredProducts.length} of {products.length} pieces available · Handmade in Owerri,
              Imo State
            </p>
          </section>
          <section className="shop-layout">
            <aside className="filters">
              <p>Shop by collection</p>
              {collections.map((filter) => (
                <button
                  className={shopFilter === filter ? "active" : ""}
                  onClick={() => setShopFilter(filter)}
                  key={filter}
                  aria-pressed={shopFilter === filter}
                >
                  <span>{filter}</span>
                  <small>{filter === "All" ? products.length : products.filter((product) => product.collection === filter).length}</small>
                </button>
              ))}
              <div className="filter-rule" />
              <p>Size</p>
              <div className="size-filter">
                {["Any", ...HOUSE_SIZES].map((size) => (
                  <button
                    className={sizeFilter === size ? "active" : ""}
                    onClick={() => setSizeFilter(size)}
                    key={size}
                    aria-pressed={sizeFilter === size}
                  >
                    {size}
                  </button>
                ))}
              </div>
              {savedProducts.length > 0 && (
                <>
                  <div className="filter-rule" />
                  <button
                    className={savedOnly ? "active" : ""}
                    onClick={() => setSavedOnly((current) => !current)}
                    aria-pressed={savedOnly}
                  >
                    <span>Saved pieces</span><small>{savedProducts.length}</small>
                  </button>
                </>
              )}
            </aside>
            {/* Mobile-only size strip — the sidebar size filter is hidden on mobile */}
            <div className="shop-mobile-sizes" role="group" aria-label="Filter by size">
              {["Any", ...HOUSE_SIZES].map((size) => (
                <button
                  key={size}
                  className={sizeFilter === size ? "active" : ""}
                  onClick={() => setSizeFilter(size)}
                  aria-pressed={sizeFilter === size}
                >
                  {size}
                </button>
              ))}
            </div>
            <div className="shop-content">
              <div className="shop-toolbar">
                <span>Showing {filteredProducts.length} of {products.length} pieces</span>
                <div className="shop-toolbar-side">
                  {savedOnly && (
                    <button className="shop-chip" onClick={() => setSavedOnly(false)}>Saved pieces · clear ✕</button>
                  )}
                  {query.trim() && (
                    <button className="shop-chip" onClick={() => setQuery("")}>Search: {query.trim()} · clear ✕</button>
                  )}
                  {sizeFilter !== "Any" && (
                    <button className="shop-chip" onClick={() => setSizeFilter("Any")}>Size {sizeFilter} · clear ✕</button>
                  )}
                  <label>Sort by
                    <select value={sort} onChange={(event) => setSort(event.target.value)}>
                      <option>Featured</option><option>Price: Low</option><option>Price: High</option>
                    </select>
                  </label>
                </div>
              </div>
              <div className="product-grid shop-grid" id="shop-grid">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onOpen={() => openProduct(product)}
                    onQuick={() => openQuick(product)}
                    onWish={() => toggleWish(product.id)}
                    wished={wishlist.has(product.id)}
                    onSelectVariant={(variant) => openProduct(product, variant)}
                  />
                ))}
              </div>
              {filteredProducts.length === 0 && (
                <div className="shop-empty">
                  <p>
                    {savedOnly
                      ? "Nothing saved yet."
                      : shopFilter !== "All"
                        ? `Nothing in ${shopFilter} just yet.`
                        : "Nothing matches this size."}
                  </p>
                  <span>
                    {savedOnly
                      ? "Tap the heart on a piece to keep it here."
                      : shopFilter !== "All"
                        ? "New pieces are added in small runs, so check back shortly, or browse everything we have ready now."
                        : "Try another size, or contact us. Most pieces can be cut to your measurements."}
                  </span>
                  <button className="outline-button" onClick={() => goShop()}>Show everything</button>
                </div>
              )}
            </div>
          </section>

          {/* Heritage collection band — the one surface that runs the warm
              [data-theme="heritage"] accent layer (terracotta / rust /
              earth-brown) on the same dark ground as the rest of the house,
              so the shop page never breaks the black system. */}
          <section className="heritage-band" data-theme="heritage" aria-labelledby="heritage-title">
            <div className="heritage-copy">
              <p className="heritage-eyebrow">{block("shop.heritage").eyebrow}</p>
              <h2 id="heritage-title">{titleLines(block("shop.heritage").title)}</h2>
              <p>{block("shop.heritage").body}</p>
              <div className="heritage-tags">
                <span className="heritage-tag heritage-tag-terracotta">Ankara</span>
                <span className="heritage-tag heritage-tag-rust">Adire</span>
                <span className="heritage-tag heritage-tag-brown">Aso-Oke</span>
              </div>
              <button
                className="heritage-button"
                onClick={() => document.getElementById("shop-grid")?.scrollIntoView({ behavior: "smooth" })}
              >
                {block("shop.heritage").ctaLabel || "Shop the heritage fabrics"} <span>↗</span>
              </button>
            </div>
            <div className="heritage-media">
              <img
                src={block("shop.heritage").image || products[2]?.image || ""}
                alt={block("shop.heritage").alt || products[2]?.alt || ""}
                loading="lazy"
              />
              <img src={lookbook[2]?.image ?? ""} alt={lookbook[2]?.alt ?? ""} loading="lazy" />
              <span className="heritage-badge">Limited</span>
            </div>
          </section>
        </main>
      )}

      {view === "product" && activeProduct && (
        <main className="page-main product-page">
          <section className="product-detail">
            <div className="product-gallery">
              <div className="detail-image primary-image" key={`${activeVariant?.id ?? "base"}-${galleryIndex}`}>
                <img
                  src={galleryImages[galleryIndex] ?? activeProduct.image}
                  alt={
                    activeVariant && hasPhotography(activeVariant)
                      ? `${activeProduct.name} in ${activeVariant.colorName}`
                      : activeProduct.alt
                  }
                />
                {/* Say what the photograph actually is. Before a colour is shot we
                    show the studio image and label it as such, rather than calling
                    it "Noir" and letting the shopper assume that is the colour. */}
                <span>
                  {activeVariant && hasPhotography(activeVariant) ? activeVariant.colorName : "Studio shot"} ·{" "}
                  {galleryIndex + 1} / {galleryImages.length}
                </span>
              </div>
              {galleryImages.length > 1 && (
                <div className="gallery-strip" role="tablist" aria-label={`${activeProduct.name}, views of this colour`}>
                  {/* Angular views of the SELECTED colour: a different control from
                      the colour swatches in the purchase panel. Same .detail-image
                      box, same object-fit, so switching view cannot shift layout. */}
                  {galleryImages.map((image, index) => (
                    <button
                      key={`${image}-${index}`}
                      role="tab"
                      aria-selected={index === galleryIndex}
                      className={index === galleryIndex ? "is-active" : ""}
                      onClick={() => setGalleryIndex(index)}
                      aria-label={`Show view ${index + 1} of ${galleryImages.length}`}
                    >
                      <img src={image} alt="" loading="lazy" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="purchase-panel">
              <p className="eyebrow">{activeProduct.collection}</p>
              <h1>{activeProduct.name}</h1>
              {/* Price: a struck-through original only appears when the product
                  actually carries a salePrice (TODO(data-layer) products.sale_price).
                  A colour with its own price always wins over the product price. */}
              <strong>
                {activeProduct.salePrice && !activeVariant?.price
                  ? salePair(activeProduct.price, activeProduct.salePrice, activeProduct.currency)
                  : money(unitPrice(activeProduct, activeVariant), activeProduct.currency)}
              </strong>
              <p className="product-description">{productDescription(activeProduct)}</p>

              <VariantSelector
                product={activeProduct}
                selected={activeVariant}
                onSelect={(variant) => {
                  setActiveVariant(variant);
                  setGalleryIndex(0);
                  const sizes = sizesFor(variant);
                  if (!sizes.includes(selectedSize)) setSelectedSize(sizes[0] ?? "M");
                }}
              />

              <div className="selector-head">
                <span>Select size</span>
                <button className="inline-link" onClick={() => setSizeGuideOpen(true)}>Size guide &amp; measurements</button>
              </div>
              <div className="size-selector">
                {HOUSE_SIZES.map((size) => (
                  <button
                    className={`${selectedSize === size ? "active" : ""} ${!activeSizes.includes(size) ? "is-unavailable" : ""}`}
                    disabled={!activeSizes.includes(size)}
                    onClick={() => setSelectedSize(size)}
                    key={size}
                  >
                    {size}
                  </button>
                ))}
              </div>
              <p className="variant-meta-line">
                {activeVariant?.sku && <span>SKU {activeVariant.sku}</span>}
                <span>
                  {(activeVariant?.stock ?? activeProduct.inventory) > 0
                    ? `${activeVariant?.stock ?? activeProduct.inventory} in stock`
                    : "Made to order"}
                </span>
                <span>{activeSizes.length} of {HOUSE_SIZES.length} sizes in this colour</span>
              </p>
              {activeProduct.inquiryOnly ? (
                /* Wholesale / bulk pieces: the catalogue record itself says
                   "enquiry only", so the page shows the enquiry path instead of
                   an Add to bag button that would oversell a made-to-order run. */
                <a
                  className="gold-button"
                  href={houseMailto(
                    `Enquiry: ${activeProduct.name}`,
                    `Hello,\n\nI would like ${activeProduct.minQty}+ pieces of ${activeProduct.name} (${activeProduct.collection}), colour ${activeVariant?.colorName ?? "to be confirmed"}, size ${selectedSize}.\n\nPlease send me your trade prices.\n`,
                    contactEmail,
                  )}
                >
                  Enquire about this piece · {activeProduct.minQty}+ pieces
                </a>
              ) : (
                <button className="gold-button" onClick={() => addToCart(activeProduct, activeVariant)}>
                  Add to bag · {money(unitPrice(activeProduct, activeVariant), activeProduct.currency)}
                </button>
              )}
              <button className="wishlist-wide" onClick={() => toggleWish(activeProduct.id)}>
                <Icon name="heart" />{wishlist.has(activeProduct.id) ? "Saved for later" : "Save for later"}
              </button>
              <div className="accordion-list">
                {productFacts(activeProduct, activeVariant?.colorName ?? "the house colour", activeSizes).map((item) => {
                  const open = openAccordion === item.title;
                  return (
                    <div className={`accordion ${open ? "is-open" : ""}`} key={item.title}>
                      <button
                        className="accordion-row"
                        aria-expanded={open}
                        onClick={() => setOpenAccordion(current => (current === item.title ? null : item.title))}
                      >
                        <span>{item.title}</span>
                        {/* Collapsed by default; the chevron rotates when open. */}
                        <Icon name="chevron" />
                      </button>
                      {open && (
                        <div className="accordion-panel">
                          <p>{item.body}</p>
                          {item.title === "Details & fit" && (
                            <button className="inline-link" onClick={() => setSizeGuideOpen(true)}>
                              Open the size guide
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="service-note">
                <span>FREE DELIVERY</span>
                <span>HANDMADE IN OWERRI</span>
                <span>FREE ALTERATIONS</span>
              </div>
            </div>
          </section>
          {/* Reviews. Below the purchase panel, in the flow under the product
              detail block. PLACEHOLDER content — TODO(data-layer): swap
              reviewSummary / reviews for lib/data/reviews.ts reads (see the
              block above SIZE_GUIDE and the `Review` type). */}
          <section className="reviews section" aria-labelledby="reviews-title">
            <SectionHeader eyebrow="REVIEWS" title="Reviews" titleId="reviews-title" />
            <div className="reviews-layout">
              <div className="reviews-summary reveal">
                <p className="reviews-average">
                  <b>{reviewSummary.average.toFixed(1)}</b>
                  <span>out of 5</span>
                </p>
                <Stars value={reviewSummary.average} size="lg" />
                <p className="reviews-count">
                  {reviewSummary.count} reviews of {activeProduct.name}
                </p>
                <ul className="rating-bars">
                  {reviewSummary.distribution.map((row) => (
                    <li key={row.stars}>
                      <span className="rating-label">{row.stars} star{row.stars === 1 ? "" : "s"}</span>
                      <i aria-hidden="true">
                        <b style={{ width: `${Math.round((row.count / reviewSummary.count) * 100)}%` }} />
                      </i>
                      <em>{row.count}</em>
                    </li>
                  ))}
                </ul>
                <a
                  className="outline-button"
                  href={houseMailto(
                    `Review: ${activeProduct.name}`,
                    `Hello,\n\nI would like to send a review of ${activeProduct.name} (${activeVariant?.colorName ?? "house colour"}).\n\nMy rating out of 5: \n\nWhat I thought: \n`,
                    contactEmail,
                  )}
                >
                  Send us your review
                </a>
              </div>
              <ul className="review-list reveal">
                {reviews.map((review) => (
                  <li className="review-card" key={review.id}>
                    <header>
                      <strong>{review.author}</strong>
                      <time dateTime={review.date}>{formatReviewDate(review.date)}</time>
                    </header>
                    <Stars value={review.rating} />
                    <p>{review.body}</p>
                  </li>
                ))}
              </ul>
            </div>
            <p className="reviews-note">
              Reviews are published as they arrive. To send yours, use the button above.
            </p>
          </section>

          <section className="related section">
            <SectionHeader eyebrow="ALSO IN THE COLLECTION" title="See also" />
            <div className="product-grid">
              {relatedTo(products, activeProduct, 3).map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onOpen={() => openProduct(product)}
                  onQuick={() => openQuick(product)}
                  onWish={() => toggleWish(product.id)}
                  wished={wishlist.has(product.id)}
                  onSelectVariant={(variant) => openProduct(product, variant)}
                />
              ))}
            </div>
          </section>

          {/* Product structured data for Google rich results.
              It lives HERE, inside the product view, because every value it
              reads (the active product, its gallery, its price) only exists on
              this screen. Placed anywhere else it reads undefined and takes the
              page down with it.
              dangerouslySetInnerHTML is required: React escapes text children,
              which would corrupt the JSON. */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Product",
                name: activeProduct.name,
                image: [activeProduct.image, ...galleryImages].filter(Boolean),
                description: productDescription(activeProduct),
                ...(activeVariant?.sku || activeProduct.sku
                  ? { sku: activeVariant?.sku || activeProduct.sku }
                  : {}),
                brand: { "@type": "Brand", name: "AVID WOMAN VOGUE" },
                category: activeProduct.collection,
                material: activeProduct.fabric ?? undefined,
                offers: {
                  "@type": "Offer",
                  url: `${origin ?? ""}/product/${activeProduct.id}`,
                  priceCurrency: activeProduct.currency,
                  price: String(unitPrice(activeProduct, activeVariant)),
                  itemCondition: "https://schema.org/NewCondition",
                  availability:
                    (activeVariant?.stock ?? activeProduct.inventory) > 0
                      ? "https://schema.org/InStock"
                      : "https://schema.org/PreOrder",
                  seller: { "@type": "Organization", name: "AVID WOMAN VOGUE" },
                },
              }),
            }}
          />
        </main>
      )}

      {view === "about" && (
        <main className="page-main about-page">
          <section className="about-hero">
            <div>
              <p className="eyebrow">ABOUT AVID WOMAN VOGUE</p>
              <h1>Well-made clothes.<br /><em>Made to last.</em></h1>
            </div>
            <img src={lookbook[1]?.image ?? ""} alt={lookbook[1]?.alt ?? ""} />
          </section>
          <section className="about-statement section reveal">
            <span>HOW WE STARTED · 01</span>
            <h2>
              AVID WOMAN VOGUE is an Owerri fashion house built to make clothes that actually fit.
              We cut each piece to your body first, and to a size label second.{" "}
              <em>and every order comes with a personal fitting session.</em>
            </h2>
          </section>
          <section className="craft-section section">
            <img className="reveal" src={products[4]?.image ?? ""} alt={products[4]?.alt ?? ""} />
            <div className="reveal">
              <p className="eyebrow">HOW WE WORK</p>
              <h2>Every piece, made with care.</h2>
              <p>
                Each dress is cut by hand in our Owerri studio, tried on a real body and adjusted
                before it is finished. We only use fabrics chosen for how they move and wear,
                nothing is added for decoration alone. We make small numbers so every order gets
                full attention, and nothing leaves until the fit is right. If it is not right,
                we fix it. Free.
              </p>
              <div className="craft-stats">
                <span><b>5</b>Working days from order to delivery</span>
                <span><b>14</b>Days to return an unworn piece</span>
              </div>
              <button className="gold-button" onClick={() => navigate("fitting")}>
                Book a personal appointment
              </button>
            </div>
          </section>
          <section className="about-values section reveal">
            <div className="about-values-grid">
              <div className="about-value-card">
                <b>01</b>
                <h3>Small numbers only</h3>
                <p>We limit how many pieces we make per style so the quality never drops. When a run is gone, it is gone.</p>
              </div>
              <div className="about-value-card">
                <b>02</b>
                <h3>Made for your body</h3>
                <p>Standard sizes are a starting point. We offer personal fittings and made-to-measure cutting so the piece fits you, not a mannequin.</p>
              </div>
              <div className="about-value-card">
                <b>03</b>
                <h3>Black, ivory and gold</h3>
                <p>Every collection is built around this palette. Pieces that work together, last across seasons, and never look out of place.</p>
              </div>
              <div className="about-value-card">
                <b>04</b>
                <h3>Wear it for years</h3>
                <p>We make pieces you keep, not pieces you wear once and retire. Free alterations and re-sizing mean it grows with you.</p>
              </div>
            </div>
          </section>
          <section className="closing-statement">
            <ParticleLogo compact />
            <div>
              <p>AVID WOMAN VOGUE</p>
              <h2>An Owerri fashion house.<br />Made by hand.</h2>
            </div>
          </section>
        </main>
      )}

      {view === "fitting" && (
        <main className="page-main fitting-page">
          <section className="page-hero">
            <p className="eyebrow">PRIVATE APPOINTMENTS</p>
            <h1>Book an appointment<br /><em>at the studio.</em></h1>
            <p className="page-hero-note">
              Meet us at our Owerri studio to be measured, fitted and advised in person, or send
              your measurements from anywhere in Nigeria and we will handle the rest.
            </p>
            <p>
              Confirmed within one working day · {FITTING_SERVICES.length} services · Owerri, Imo
              State
            </p>
          </section>

          <section className="fitting-layout">
            <div className="fitting-copy">
              <p className="eyebrow">HOW IT WORKS</p>
              <h2>A private appointment, from first message to final fitting.</h2>
              <ol className="fitting-steps">
                <li>
                  <b>01</b>
                  <span>
                    Request a time using the form, or message us on WhatsApp. Tell us which service
                    you need and a day that suits you.
                  </span>
                </li>
                <li>
                  <b>02</b>
                  <span>
                    We reply within one working day with two or three available slots so you can
                    choose what works.
                  </span>
                </li>
                <li>
                  <b>03</b>
                  <span>
                    Come to the studio for your appointment. Outside Imo State? Send your
                    measurements and the finished piece is couriered to you.
                  </span>
                </li>
              </ol>

              <p className="eyebrow">SERVICES</p>
              <ul className="fitting-services">
                <li>
                  <b>Fitting for a new piece</b>
                  <span>45 minutes · complimentary with every order</span>
                </li>
                <li>
                  <b>Adjustments &amp; re-sizing</b>
                  <span>For pieces you already own · quoted before we begin</span>
                </li>
                <li>
                  <b>Made to measure</b>
                  <span>Two appointments: measurement, then final fitting</span>
                </li>
                <li>
                  <b>Send my measurements</b>
                  <span>For clients outside Imo State · guidance sent by WhatsApp</span>
                </li>
              </ul>

              <p className="eyebrow">THE STUDIO</p>
              <div className="fitting-studio">
                <p className="fitting-studio-address">
                  AVID WOMAN VOGUE
                  <span>Owerri, Imo State, Nigeria</span>
                </p>
                <p className="fitting-studio-hours">
                  Monday to Saturday · 9:00am to 6:00pm
                  <span>Closed Sundays and public holidays</span>
                </p>
                {HOUSE.landmark && (
                  <p className="fitting-studio-landmark">{HOUSE.landmark}</p>
                )}
                <div className="fitting-studio-actions">
                  <a className="gold-button" href={HOUSE.directions} target="_blank" rel="noopener noreferrer">
                    Get directions <span>↗</span>
                  </a>
                  <a className="outline-button" href={`tel:${HOUSE.phoneDial}`}>
                    Call {HOUSE.phoneDisplay}
                  </a>
                </div>
                <a className="fitting-whatsapp" href={HOUSE.whatsapp} target="_blank" rel="noopener noreferrer">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.849L0 24l6.304-1.508A11.944 11.944 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.005-1.37l-.36-.213-3.727.891.92-3.63-.234-.373A9.818 9.818 0 0 1 2.182 12c0-5.422 4.396-9.818 9.818-9.818s9.818 4.396 9.818 9.818-4.396 9.818-9.818 9.818z" />
                  </svg>
                  Prefer to message? Chat on WhatsApp
                </a>
              </div>
            </div>

            <FittingForm contactEmail={contactEmail} />
          </section>
        </main>
      )}

      {view === "contact" && (
        <main className="page-main contact-page">
          <section className="page-hero">
            <p className="eyebrow text-sm text-gray-500 uppercase tracking-wider">CONTACT</p>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-relaxed mt-8 mb-6">
              Visit the studio<br /><em>or send a message.</em>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 leading-relaxed mt-6">
              We are in Owerri, Imo State, and we deliver anywhere in Nigeria. Call, message or
              email us. And if you are nearby, tap the map and it will bring you straight to the
              door.
            </p>
          </section>

          <section className="contact-layout">
            <div className="contact-details">
              <div className="contact-block">
                <p className="eyebrow">THE STUDIO</p>
                <p className="contact-line">
                  AVID WOMAN VOGUE
                  <span>Owerri, Imo State, Nigeria</span>
                </p>
                <p className="contact-line">
                  Monday to Saturday · 9:00am to 6:00pm
                  <span>Closed Sundays and public holidays</span>
                </p>
                <div className="contact-directions-actions">
                  <a className="gold-button contact-directions" href={HOUSE.directions} target="_blank" rel="noopener noreferrer">
                    Get directions to the shop <span>↗</span>
                  </a>
                  {/* If a driver gets close and is unsure, one tap reaches the
                      studio. Cheaper than anyone having to explain the last
                      stretch in writing. */}
                  <a className="outline-button" href={`tel:${HOUSE.phoneDial}`}>
                    Call {HOUSE.phoneDisplay}
                  </a>
                </div>
                {HOUSE.landmark && <p className="contact-landmark">{HOUSE.landmark}</p>}
              </div>

              <div className="contact-block">
                <p className="eyebrow">TALK TO US</p>
                <ul className="contact-list">
                  <li>
                    <span>WhatsApp</span>
                    <a href={HOUSE.whatsapp} target="_blank" rel="noopener noreferrer">
                      {HOUSE.phoneDisplay} ↗
                    </a>
                  </li>
                  <li>
                    <span>Phone</span>
                    <a href={`tel:${HOUSE.phoneDial}`}>{HOUSE.phoneDisplay}</a>
                  </li>
                  {contactEmail && (
                    <li>
                      <span>Email</span>
                      <a href={houseMailto("Message for the studio", "Hello,", contactEmail)}>
                        {contactEmail}
                      </a>
                    </li>
                  )}
                  <li>
                    <span>Instagram</span>
                    <a href={HOUSE.instagram} target="_blank" rel="noopener noreferrer">
                      @avidwoman ↗
                    </a>
                  </li>
                  <li>
                    <span>TikTok</span>
                    <a href={HOUSE.tiktok} target="_blank" rel="noopener noreferrer">
                      @avidwoman ↗
                    </a>
                  </li>
                </ul>
              </div>

              <div className="contact-block">
                <p className="eyebrow">ORDERS &amp; ENQUIRIES</p>
                <ul className="contact-list contact-list-links">
                  <li>
                    <span>Fittings</span>
                    <button onClick={() => navigate("fitting")}>Book an appointment</button>
                  </li>
                  <li>
                    <span>Trade &amp; bulk</span>
                    <a href={houseMailto("Trade & bulk order enquiry", "Hello,\n\nI would like to ask about a trade or bulk order.\n", contactEmail)}>
                      Request trade prices
                    </a>
                  </li>
                  <li>
                    <span>Thrift store</span>
                    <button onClick={() => goShop()}>Shop pre-loved pieces</button>
                  </li>
                  <li>
                    <span>Press</span>
                    <a href={houseMailto("Press enquiry", "Hello,\n\nI would like to ask about press and samples.\n", contactEmail)}>
                      Press &amp; samples
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            {/* The map panel. Tapping anywhere on it opens Google Maps with the
                shop as the destination, so a customer gets turn-by-turn
                directions in one tap rather than copying an address. */}
            <aside className="contact-map">
              <a
                className="contact-map-frame"
                href={HOUSE.directions}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open directions to the AVID WOMAN VOGUE studio in Google Maps"
              >
                <iframe
                  src={HOUSE.mapEmbed}
                  title="Map showing the AVID WOMAN VOGUE studio in Owerri, Imo State"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  tabIndex={-1}
                />
                <span className="contact-map-cta">
                  Tap for directions <i>↗</i>
                </span>
              </a>
              <p className="contact-map-note">
                Owerri, Imo State · We also serve Port Harcourt, Aba, Umuahia and clients across
                Nigeria by courier.
              </p>
              {HOUSE.landmark && (
                <p className="contact-map-note contact-landmark">{HOUSE.landmark}</p>
              )}
            </aside>
          </section>
        </main>
      )}

      {view === "checkout" && (placedOrder || cart.length > 0) && (
        <CheckoutView
          cart={cart}
          bankDetails={bankDetails}
          contactEmail={contactEmail}
          placed={placedOrder}
          onPlaced={(order) => {
            // The order is placed: empty the bag (so the count in the header is
            // honest) and hold the confirmation on screen.
            setPlacedOrder(order);
            setCart([]);
            setCartOpen(false);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          onBackToShop={() => {
            setPlacedOrder(null);
            goShop();
          }}
        />
      )}

      <Footer
        navigate={navigate}
        social={social}
        contactEmail={contactEmail}
        onSizeGuide={() => setSizeGuideOpen(true)}
        onShopCollection={(collection) => goShop({ collection })}
        about={block("footer.about")}
      />

      <div className={`drawer-backdrop ${cartOpen ? "is-open" : ""}`} onClick={() => setCartOpen(false)} />
      <aside className={`cart-drawer ${cartOpen ? "is-open" : ""}`}>
        <div className="drawer-head"><div><p className="eyebrow">YOUR SELECTION</p><h2>Shopping bag</h2></div><button onClick={() => setCartOpen(false)} aria-label="Close cart"><Icon name="close" /></button></div>
        {cart.length ? (
          <>
            <div className="cart-items">
              {cart.map((item) => (
                <div className="cart-item" key={item.key}>
                  <img
                    src={variantImage(item.product, item.variant)}
                    alt={item.variant ? `${item.product.name} in ${item.variant.colorName}` : item.product.name}
                  />
                  <div>
                    <small>{item.product.collection}</small>
                    <strong>{item.product.name}</strong>
                    <span>
                      Size {item.size}
                      {item.variant && (
                        <> · <i className="cart-color-dot" style={{ background: item.variant.colorHex }} aria-hidden="true" />{item.variant.colorName}</>
                      )}
                    </span>
                    <div className="cart-qty">
                      <button onClick={() => changeQty(item.key, -1)} aria-label={`Decrease quantity of ${item.product.name}`}>−</button>
                      <em aria-live="polite">{item.qty}</em>
                      <button onClick={() => changeQty(item.key, 1)} aria-label={`Increase quantity of ${item.product.name}`}>+</button>
                    </div>
                    <b>{money(unitPrice(item.product, item.variant) * item.qty, item.product.currency)}</b>
                  </div>
                </div>
              ))}
            </div>
            <div className="cart-summary"><span>Subtotal</span><strong>{money(cartSubtotal)}</strong></div>
            {/* Payment is a manual bank transfer — the client controls payment
                herself, so there is no gateway here and no card field anywhere
                in this flow. Checkout shows the account and the order waits as
                "pending payment" until she confirms the transfer landed. */}
            <button
              className="gold-button"
              onClick={() => { setCartOpen(false); navigate("checkout"); }}
            >
              Proceed to checkout
            </button>
            <p className="cart-note">
              Checkout is by bank transfer: you will see the account details on the next screen, and
              we confirm your payment within {PAYMENT_WINDOW}.
            </p>
            <a
              className="inline-link cart-alt-link"
              href={houseMailto(
                `Order request from the website (${cartCount} item${cartCount === 1 ? "" : "s"})`,
                [
                  "Hello, I would like to order:",
                  "",
                  ...cart.map(
                    (item) =>
                      `• ${item.product.name}, ${item.variant?.colorName ?? "house colour"}, size ${item.size}, qty ${item.qty}, ${money(unitPrice(item.product, item.variant) * item.qty, item.product.currency)}`,
                  ),
                  "",
                  `Subtotal: ${money(cartSubtotal)}`,
                  "",
                  "Please confirm availability, delivery and how to pay.",
                ].join("\n"),
                contactEmail,
              )}
            >
              Or send your bag to the studio
            </a>
          </>
        ) : (
          <div className="empty-cart"><span>00</span><p>Nothing in your bag yet.</p><button className="outline-button" onClick={() => { setCartOpen(false); goShop(); }}>Start shopping</button></div>
        )}
      </aside>

      {quickProduct && (
        <div className="modal-layer" role="dialog" aria-modal="true" aria-label={`Quick view ${quickProduct.name}`}>
          <button className="modal-close" onClick={() => setQuickProduct(null)} aria-label="Close quick view"><Icon name="close" /></button>
          <div className="quick-modal">
            <img
              key={quickVariant?.id ?? "base"}
              src={variantImage(quickProduct, quickVariant)}
              alt={
                quickVariant && hasPhotography(quickVariant)
                  ? `${quickProduct.name} in ${quickVariant.colorName}`
                  : quickProduct.alt
              }
            />
            <div className="quick-modal-info">
              <p className="eyebrow">{quickProduct.collection}</p>
              <h2>{quickProduct.name}</h2>
              <strong>
                {quickProduct.salePrice ? salePair(quickProduct.price, quickProduct.salePrice) : priceLabel(quickProduct)}
              </strong>
              <p>{productDescription(quickProduct)}</p>
              <VariantSelector
                product={quickProduct}
                selected={quickVariant}
                onSelect={(variant) => setQuickVariant(variant)}
              />
              <div className="size-selector">
                {sizesFor(quickVariant).map((size) => (
                  <button className={selectedSize === size ? "active" : ""} onClick={() => setSelectedSize(size)} key={size}>{size}</button>
                ))}
              </div>
              <button className="gold-button" onClick={() => addToCart(quickProduct, quickVariant)}>
                Add to bag · {money(unitPrice(quickProduct, quickVariant), quickProduct.currency)}
              </button>
              <button className="inline-link" onClick={() => setSizeGuideOpen(true)}>Size guide &amp; measurements</button>
              <button className="text-link" onClick={() => { const product = quickProduct; const variant = quickVariant; setQuickProduct(null); openProduct(product, variant); }}>See the full piece <span>↗</span></button>
            </div>
          </div>
        </div>
      )}

      {sizeGuideOpen && (
        <div className="modal-layer" role="dialog" aria-modal="true" aria-label="Size guide and measurements">
          <button className="modal-close" onClick={() => setSizeGuideOpen(false)} aria-label="Close size guide"><Icon name="close" /></button>
          <div className="guide-modal">
            <p className="eyebrow">SIZE GUIDE</p>
            <h2>Measurements we cut to</h2>
            <p className="guide-note">
              Measure over your underwear and keep the tape level. If you fall between two sizes,
              take the larger one. Alterations are complimentary on every order.
            </p>
            <table className="size-guide-table">
              <thead>
                <tr><th>Size</th><th>Bust</th><th>Waist</th><th>Hip</th></tr>
              </thead>
              <tbody>
                {SIZE_GUIDE.map((row) => (
                  <tr key={row.size}>
                    <th scope="row">{row.size}</th>
                    <td>{row.bust}</td>
                    <td>{row.waist}</td>
                    <td>{row.hip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="guide-actions">
              <a
                className="gold-button"
                href={houseMailto(
                  "Measurements and sizing",
                  "Hello, here are my measurements:\n\nBust:\nWaist:\nHip:\nHeight:\n\nPlease tell me which size to order.",
                  contactEmail,
                )}
              >
                Send us your measurements
              </a>
              <button className="outline-button" onClick={() => { setSizeGuideOpen(false); navigate("fitting"); }}>
                Book a fitting instead
              </button>
            </div>
          </div>
        </div>
      )}

      {searchOpen && (
        <div className="search-layer" role="dialog" aria-modal="true" aria-label="Search the shop">
          <button className="modal-close" onClick={() => setSearchOpen(false)} aria-label="Close search"><Icon name="close" /></button>
          <div className="search-panel">
            <label className="search-field">
              <Icon name="search" />
              <input
                type="search"
                value={query}
                autoFocus
                placeholder="Search by name, collection or cloth"
                aria-label="Search by name, collection or cloth"
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter") { setSearchOpen(false); goShop(); } }}
              />
            </label>
            <p className="eyebrow">
              {query.trim() ? `${searchResults.length} of ${products.length} pieces match` : `All ${products.length} pieces`}
            </p>
            <div className="search-results">
              {searchResults.slice(0, 6).map((product) => (
                <button key={product.id} className="search-result" onClick={() => { setSearchOpen(false); openProduct(product); }}>
                  <img src={product.image} alt="" loading="lazy" />
                  <span><small>{product.collection}</small><strong>{product.name}</strong></span>
                  <b>{priceLabel(product)}</b>
                </button>
              ))}
            </div>
            {query.trim() && searchResults.length === 0 && (
              <p className="search-empty">
                Nothing matches “{query.trim()}”. Try a collection or a fabric, or contact us
                . Most pieces can be made to order.
              </p>
            )}
            <button className="text-link" onClick={() => { setSearchOpen(false); goShop(); }}>
              Open the shop <span>↗</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Footer({
  navigate,
  social,
  contactEmail,
  onSizeGuide,
  onShopCollection,
  about,
}: {
  navigate: (view: View) => void;
  social?: SocialLinks;
  contactEmail?: string | null;
  onSizeGuide: () => void;
  /** Opens the shop filtered to one collection (e.g. THRIFT) from the footer. */
  onShopCollection: (collection: string) => void;
  /** The owner's house line (Admin → Content → Page copy). */
  about: ContentBlock;
}) {
  const socialLinks = [
    { label: "Instagram", href: social?.instagram },
    { label: "Facebook", href: social?.facebook },
    { label: "TikTok", href: social?.tiktok },
  ].filter((item): item is { label: string; href: string } => Boolean(item.href));

  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div className="footer-brand">
          <LogoButton onClick={() => navigate("home")} />
          <p className="footer-name">{about.title || "AVID WOMAN VOGUE"}</p>
          <p className="footer-line">{about.body}</p>
          {contactEmail && (
            <a
              className="footer-email"
              href={houseMailto("Message for the studio", "Hello,", contactEmail)}
            >
              {contactEmail}
            </a>
          )}
          <a
            className="footer-whatsapp"
            href="https://wa.me/2347063243954"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" width="12" height="12" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.849L0 24l6.304-1.508A11.944 11.944 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.005-1.37l-.36-.213-3.727.891.92-3.63-.234-.373A9.818 9.818 0 0 1 2.182 12c0-5.422 4.396-9.818 9.818-9.818s9.818 4.396 9.818 9.818-4.396 9.818-9.818 9.818z" />
            </svg>
            WhatsApp · 07063243954
          </a>
        </div>

        <div className="footer-links">
          <div>
            <p>Shop</p>
            <button onClick={() => navigate("shop")}>Shop all</button>
            <button onClick={() => onShopCollection("THRIFT")}>Thrift store</button>
            <button onClick={() => navigate("about")}>Our story</button>
          </div>
          <div>
            <p>Client care</p>
            <button onClick={() => navigate("contact")}>Contact us</button>
            <button onClick={() => navigate("fitting")}>Book an appointment</button>
            <button onClick={onSizeGuide}>Size guide</button>
            <Link href="/locations">Where we serve</Link>
          </div>
          <div>
            <p>Trade</p>
            <a href={houseMailto("Trade & bulk order enquiry", "Hello,\n\nI would like to ask about a trade or bulk order.\n", contactEmail)}>
              Trade &amp; bulk orders
            </a>
            <a href={houseMailto("Press enquiry", "Hello,\n\nI would like to ask about press and samples.\n", contactEmail)}>
              Press &amp; samples
            </a>
            <a href={houseMailto("Delivery & returns", "Hello,\n\nI have a question about delivery and returns.\n", contactEmail)}>
              Delivery &amp; returns
            </a>
          </div>
          {socialLinks.length > 0 && (
            <div>
              <p>Follow us</p>
              {socialLinks.map((item) => (
                <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer">
                  {item.label}
                </a>
              ))}
              <a href="https://wa.me/2347063243954" target="_blank" rel="noopener noreferrer">
                WhatsApp
              </a>
            </div>
          )}
          {socialLinks.length === 0 && (
            <div>
              <p>Follow us</p>
              <a href={HOUSE.instagram} target="_blank" rel="noopener noreferrer">Instagram</a>
              <a href={HOUSE.tiktok} target="_blank" rel="noopener noreferrer">TikTok</a>
              <a href={HOUSE.whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp</a>
            </div>
          )}
        </div>
      </div>

      <div className="footer-bottom">
        <span>© 2026 AVID WOMAN VOGUE</span>
        <span>All rights reserved</span>
        {/* The admin console is deliberately NOT linked from here. Staff reach it
            by typing /admin directly; a customer browsing the footer never sees
            a door into the back office. */}
        <span>Owerri · Imo State · Nigeria</span>
      </div>
    </footer>
  );
}
