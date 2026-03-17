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
  preference_id text unique,
  merchant_order_id bigint unique,
  payment_id bigint unique,
  order_status text not null default 'pending',
  payment_status text,
  payment_status_detail text,
  customer_email text not null,
  description text not null,
  transaction_amount numeric(12,2) not null,
  items jsonb not null default '[]'::jsonb,
  last_webhook_event_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint orders_order_status_check check (order_status in ('pending', 'approved', 'cancelled', 'expired', 'failed', 'refunded')),
  constraint orders_transaction_amount_check check (transaction_amount > 0)
);

create index if not exists orders_status_idx on public.orders (order_status);
create index if not exists orders_payment_status_idx on public.orders (payment_status);

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  topic text not null,
  action text,
  resource_id text,
  order_external_reference text,
  payload jsonb not null default '{}'::jsonb,
  processing_error text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  processed_at timestamptz
);

create index if not exists webhook_events_topic_idx on public.webhook_events (topic);
create index if not exists webhook_events_order_external_reference_idx on public.webhook_events (order_external_reference);

create trigger set_orders_updated_at
before update on public.orders
for each row
execute function public.set_updated_at();

alter table public.orders enable row level security;
alter table public.webhook_events enable row level security;
