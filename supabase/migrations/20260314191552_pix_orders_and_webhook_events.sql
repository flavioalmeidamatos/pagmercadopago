create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  external_reference text not null unique,
  order_status text not null default 'pending',
  customer_email text not null,
  description text not null,
  transaction_amount numeric(12,2) not null,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint orders_order_status_check check (order_status in ('pending', 'approved', 'cancelled', 'expired', 'failed')),
  constraint orders_transaction_amount_check check (transaction_amount > 0)
);

create index if not exists orders_status_idx on public.orders (order_status);

create trigger set_orders_updated_at
before update on public.orders
for each row
execute function public.set_updated_at();

alter table public.orders enable row level security;
