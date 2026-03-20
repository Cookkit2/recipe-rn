-- Malaysia outbound shop config + optional price estimates (MYR).
-- Run in Supabase SQL editor or via CLI. Adjust RLS to your auth model.

create table if not exists public.shop_retailer (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  display_name text not null,
  country_code text not null default 'MY',
  channel_type text not null check (channel_type in ('google_maps', 'grab')),
  maps_search_query text,
  grab_open_url text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  updated_at timestamptz default now()
);

create table if not exists public.ingredient_retailer_price_estimate (
  id uuid primary key default gen_random_uuid(),
  retailer_id uuid not null references public.shop_retailer (id) on delete cascade,
  ingredient_key text not null,
  currency text not null default 'MYR',
  price_myr numeric not null,
  bundle_quantity numeric not null default 1,
  bundle_unit text not null,
  updated_at timestamptz default now(),
  unique (retailer_id, ingredient_key)
);

create index if not exists idx_ingredient_price_retailer on public.ingredient_retailer_price_estimate (retailer_id);
create index if not exists idx_ingredient_price_key on public.ingredient_retailer_price_estimate (ingredient_key);

alter table public.shop_retailer enable row level security;
alter table public.ingredient_retailer_price_estimate enable row level security;

-- Public read for mobile app (anon + authenticated)
create policy "shop_retailer_select_all" on public.shop_retailer
  for select using (true);

create policy "ingredient_retailer_price_estimate_select_all" on public.ingredient_retailer_price_estimate
  for select using (true);

-- Seed retailers (replace grab_open_url with your GrabMart / merchant link when known)
insert into public.shop_retailer (slug, display_name, country_code, channel_type, maps_search_query, grab_open_url, sort_order)
values
  ('speedmart_99', '99 Speedmart', 'MY', 'google_maps', '99 Speedmart', null, 0),
  ('jaya_grocer', 'Jaya Grocer', 'MY', 'grab', null, 'https://food.grab.com/my/en', 1)
on conflict (slug) do update set
  display_name = excluded.display_name,
  channel_type = excluded.channel_type,
  maps_search_query = excluded.maps_search_query,
  grab_open_url = excluded.grab_open_url,
  sort_order = excluded.sort_order,
  updated_at = now();
