-- ------------------------------------------------------------------
-- CONTENT + PRODUCT CONTROL — owner-editable copy, archive, descriptions.
--
--   node scripts/sql.mjs scripts/sql/site-content.sql
--
-- WHY: the storefront's headlines and paragraphs were hard-coded in the page
-- component, so changing a line meant a code change. Each block is now a row.
-- `products.description` lets her write her own description per piece (the
-- storefront falls back to the generated sentence when it is empty), and
-- `products.archived` is the safe way to retire a piece — Delete is permanent.
--
-- SAFE TO RE-RUN: every column is `if not exists`, the table and policies are
-- dropped before creation, and the seed only inserts rows that do not exist.
-- ------------------------------------------------------------------

-- 1. Editorial copy --------------------------------------------------
create table if not exists public.site_content (
  key        text primary key,
  label      text        not null,
  eyebrow    text        not null default '',
  title      text        not null default '',
  body       text        not null default '',
  cta_label  text        not null default '',
  cta_href   text        not null default '',
  image      text        not null default '',
  alt        text        not null default '',
  updated_at timestamptz not null default now()
);

alter table public.site_content enable row level security;

drop policy if exists "public read site content" on public.site_content;
drop policy if exists "admin write site content" on public.site_content;

-- The storefront reads it; only a signed-in admin may write. Unlike orders,
-- this table holds no personal data, so a public read is correct.
create policy "public read site content" on public.site_content
  for select using (true);
create policy "admin write site content" on public.site_content
  for all to authenticated using (true) with check (true);

-- 2. Product control -------------------------------------------------
alter table public.products add column if not exists description text;
alter table public.products add column if not exists archived     boolean not null default false;
alter table public.products add column if not exists related_ids  bigint[];

create index if not exists products_archived_idx on public.products (archived);

-- 3. Seed the blocks with the copy the site ships with ----------------
-- On conflict the existing row wins, so this never overwrites her edits.
insert into public.site_content (key, label, eyebrow, title, body, cta_label, cta_href)
values
  ('home.hero', 'Homepage — hero',
   'AVID WOMAN VOGUE · OWERRI FASHION HOUSE',
   'Best Fashion House,
*in Owerri.*',
   'Premium handmade clothes cut and finished by hand in our Owerri studio, in black, ivory and gold. Every run is limited, and every piece is made to wear for years, not one season — made for your needs, your body, your life.',
   'Shop the collection', 'shop'),
  ('home.house', 'Homepage — the house',
   'THE FASHION HOUSE',
   'Well-made clothes,
*made to last.*',
   'We are an Owerri fashion house, not a fast-fashion shop. Every piece is cut and sewn by hand, in small numbers, and checked one by one before it leaves us. We pick fabrics for how they feel and how long they last — so you can wear them for years.',
   'Our story', 'about'),
  ('home.fittings', 'Homepage — fittings & alterations',
   'APPOINTMENTS & FITTINGS',
   'Your size,
*your fit.*',
   'Book a private fitting at our Owerri studio, or send your measurements from anywhere in Nigeria. We adjust the length, fix the fit and finish the piece on you. Already own one of our pieces? Bring it in — we quote for every adjustment before we start.',
   'Book an appointment', 'fitting'),
  ('home.newsletter', 'Homepage — mailing list',
   'THE LIST',
   'The mailing list.',
   'One email when new pieces, restocks and limited runs are released. Nothing else.',
   '', ''),
  ('shop.heritage', 'Shop — heritage fabrics',
   'HERITAGE FABRICS · ANKARA & ADIRE',
   'Ankara, adire and aso-oke,
*cut to our own patterns.*',
   'Hand-dyed adire and carefully sourced ankara, cut into the same shapes as the main collection. Each fabric length is chosen by hand — no two runs match exactly.',
   'Shop the heritage fabrics', 'shop-grid'),
  ('footer.about', 'Footer — house line',
   '',
   'AVID WOMAN VOGUE',
   'An Owerri fashion house. Small runs, handmade with care — with a personal fitting on every order.',
   '', '')
on conflict (key) do nothing;
