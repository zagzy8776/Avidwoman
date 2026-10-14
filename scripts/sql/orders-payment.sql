-- ------------------------------------------------------------------
-- ORDERS — manual bank transfer.
--
--   node scripts/sql.mjs scripts/sql/orders-payment.sql
--
-- WHY: there is no payment gateway in this phase. The client controls payment
-- herself. Checkout takes the order, tells the shopper where to send the
-- money, and the order then sits at payment_status = 'pending-payment' —
-- indefinitely, with no auto-expiry — until she sees the transfer in her bank
-- app and marks it paid from Admin -> Orders.
--
-- SAFE TO RE-RUN: every column is `if not exists` and every policy is dropped
-- before it is created.
-- ------------------------------------------------------------------

-- 1. The order itself -------------------------------------------------
alter table public.orders add column if not exists phone          text;
alter table public.orders add column if not exists address        text;
alter table public.orders add column if not exists note           text;
alter table public.orders add column if not exists payment_status text not null default 'pending-payment';
alter table public.orders add column if not exists payment_method text not null default 'bank-transfer';
alter table public.orders add column if not exists subtotal       numeric(10, 2) not null default 0;
alter table public.orders add column if not exists shipping       numeric(10, 2) not null default 0;

-- The bank details the CUSTOMER WAS TOLD TO PAY INTO, frozen at order time.
-- Deliberately a SNAPSHOT rather than a pointer to settings: if she changes
-- banks next year, every old order must still show its own truth — that is
-- the record she reconciles against her bank statement.
alter table public.orders add column if not exists bank_details   jsonb;

-- The lines, as [{productId, variantId, name, collection, colorName, colorHex,
-- size, qty, unitPrice, image}]. unitPrice is the price the SERVER resolved at
-- checkout, never the one the browser asked for.
alter table public.orders add column if not exists items          jsonb not null default '[]'::jsonb;

create index if not exists orders_payment_status_idx on public.orders (payment_status);

-- 2. Her bank account -------------------------------------------------
-- Editable any time in Admin -> Settings; her save is live immediately on the
-- checkout page, with no approval step.
alter table public.settings add column if not exists bank_name      text;
alter table public.settings add column if not exists account_number text;
alter table public.settings add column if not exists account_name   text;

-- 3. Who may write an order -------------------------------------------
-- A shopper has no account, so checkout must be able to INSERT. There is
-- deliberately NO anon SELECT policy: nobody may read another shopper's order
-- (name, address, phone). Reading the book, marking paid and every status
-- change stay authenticated-only.
drop policy if exists "public create orders" on public.orders;
create policy "public create orders" on public.orders
  for insert to anon, authenticated with check (true);

-- For the record: `with check (true)` means a crafted REST call could insert a
-- junk order. It cannot read anything back, and the atelier sees it and
-- deletes it in the console. Tightening this (signed checkout session, rate
-- limit, or a service-role insert from the route handler only) is the next
-- step if spam ever appears.
