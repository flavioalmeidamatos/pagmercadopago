create extension if not exists pgcrypto;

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete restrict,
  name text not null,
  slug text not null unique,
  subtitle text not null,
  description text not null,
  brand text not null,
  price numeric(12,2) not null,
  compare_at_price numeric(12,2),
  rating numeric(3,2) not null default 5,
  reviews_count integer not null default 0,
  inventory_count integer not null default 0,
  is_featured boolean not null default false,
  is_kit boolean not null default false,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  stripe_customer_id text unique,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded')),
  coupon_code text,
  subtotal_amount numeric(12,2) not null default 0,
  shipping_amount numeric(12,2) not null default 0,
  discount_amount numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  stripe_customer_id text,
  stripe_session_id text unique,
  payment_intent_id text unique,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity integer not null default 1,
  unit_price numeric(12,2) not null,
  image_url text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  provider text not null default 'stripe',
  amount numeric(12,2) not null,
  provider_status text,
  stripe_customer_id text,
  stripe_session_id text,
  payment_intent_id text,
  refund_id text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default timezone('utc'::text, now()),
  unique (user_id, product_id)
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  author_name text not null,
  rating integer not null check (rating between 1 and 5),
  title text not null,
  content text not null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type text not null check (discount_type in ('fixed', 'percentage')),
  discount_value numeric(12,2) not null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.site_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists products_category_id_idx on public.products(category_id);
create index if not exists products_brand_idx on public.products(brand);
create index if not exists products_featured_idx on public.products(is_featured);
create index if not exists orders_user_id_idx on public.orders(user_id);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists order_items_order_id_idx on public.order_items(order_id);
create index if not exists favorites_user_id_idx on public.favorites(user_id);
create index if not exists reviews_product_id_idx on public.reviews(product_id);

drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at
before update on public.products
for each row
execute function public.handle_updated_at();

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
before update on public.profiles
for each row
execute function public.handle_updated_at();

drop trigger if exists orders_updated_at on public.orders;
create trigger orders_updated_at
before update on public.orders
for each row
execute function public.handle_updated_at();

drop trigger if exists payments_updated_at on public.payments;
create trigger payments_updated_at
before update on public.payments
for each row
execute function public.handle_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;

  insert into public.customers (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user();

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.favorites enable row level security;
alter table public.reviews enable row level security;
alter table public.coupons enable row level security;
alter table public.site_settings enable row level security;

create policy "Public can read categories"
on public.categories for select
using (true);

create policy "Public can read products"
on public.products for select
using (true);

create policy "Public can read product images"
on public.product_images for select
using (true);

create policy "Public can read reviews"
on public.reviews for select
using (true);

create policy "Authenticated users can insert reviews"
on public.reviews for insert
to authenticated
with check (auth.uid() = user_id or user_id is null);

create policy "Users can read own profile"
on public.profiles for select
to authenticated
using (auth.uid() = id or public.is_admin());

create policy "Users can update own profile"
on public.profiles for update
to authenticated
using (auth.uid() = id or public.is_admin())
with check (auth.uid() = id or public.is_admin());

create policy "Users can read own customer record"
on public.customers for select
to authenticated
using (auth.uid() = user_id or public.is_admin());

create policy "Users can read own orders"
on public.orders for select
to authenticated
using (auth.uid() = user_id or public.is_admin());

create policy "Users can insert own orders"
on public.orders for insert
to authenticated
with check (auth.uid() = user_id or public.is_admin());

create policy "Admins can update orders"
on public.orders for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Users can read own order items"
on public.order_items for select
to authenticated
using (
  exists (
    select 1
    from public.orders
    where orders.id = order_items.order_id
      and (orders.user_id = auth.uid() or public.is_admin())
  )
);

create policy "Users can read own payments"
on public.payments for select
to authenticated
using (
  exists (
    select 1
    from public.orders
    where orders.id = payments.order_id
      and (orders.user_id = auth.uid() or public.is_admin())
  )
);

create policy "Admins can update payments"
on public.payments for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Users can manage own favorites"
on public.favorites for all
to authenticated
using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

create policy "Public can read coupons"
on public.coupons for select
using (true);

create policy "Public can read site settings"
on public.site_settings for select
using (true);

create policy "Admins can manage catalog"
on public.categories for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can manage products"
on public.products for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can manage product images"
on public.product_images for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can manage coupons"
on public.coupons for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can manage site settings"
on public.site_settings for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into public.categories (id, name, slug, description)
values
  ('11111111-1111-1111-1111-111111111111', 'Skincare', 'skincare', 'Rotinas de tratamento e glow.'),
  ('22222222-2222-2222-2222-222222222222', 'Maquiagem', 'maquiagem', 'Make premium com acabamento sofisticado.'),
  ('33333333-3333-3333-3333-333333333333', 'Kits', 'kits', 'Combos promocionais com alto valor percebido.'),
  ('44444444-4444-4444-4444-444444444444', 'Perfumes', 'perfumes', 'Fragrâncias femininas elegantes.')
on conflict (id) do nothing;

insert into public.coupons (code, discount_type, discount_value)
values
  ('LUXE10', 'percentage', 10),
  ('WELCOME25', 'fixed', 25)
on conflict (code) do nothing;

insert into public.site_settings (key, value)
values
  ('shipping_flat_rate', '24.90'::jsonb),
  ('promo_banner', '"Frete fixo nacional e 10% off no cupom LUXE10 nas compras acima de R$ 299."'::jsonb),
  ('hero_tag', '"Curadoria premium para glow e ritual completo"'::jsonb),
  ('whatsapp_number', '"5521988681799"'::jsonb)
on conflict (key) do nothing;
