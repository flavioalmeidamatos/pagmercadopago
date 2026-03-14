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
  mercadopago_payment_id bigint unique,
  mercadopago_payment_status text not null default 'pending',
  mercadopago_status_detail text,
  order_status text not null default 'pending',
  payment_method text not null default 'pix',
  customer_email text not null,
  description text not null,
  transaction_amount numeric(12,2) not null,
  items jsonb not null default '[]'::jsonb,
  qr_code text,
  ticket_url text,
  notification_url text,
  mercadopago_payload jsonb,
  payment_approved_at timestamptz,
  payment_expiration_at timestamptz,
  last_webhook_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint orders_order_status_check check (order_status in ('pending', 'approved', 'cancelled', 'expired', 'failed')),
  constraint orders_payment_method_check check (payment_method in ('pix')),
  constraint orders_transaction_amount_check check (transaction_amount > 0)
);

create index if not exists orders_status_idx on public.orders (order_status);
create index if not exists orders_mp_status_idx on public.orders (mercadopago_payment_status);

create trigger set_orders_updated_at
before update on public.orders
for each row
execute function public.set_updated_at();

create table if not exists public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  mercadopago_notification_id text,
  mercadopago_resource_id text,
  mercadopago_topic text,
  action text,
  request_id text,
  signature_valid boolean,
  processing_status text not null default 'received',
  processing_error text,
  notification_payload jsonb not null default '{}'::jsonb,
  order_id uuid references public.orders(id) on delete set null,
  processed_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint payment_webhook_events_processing_status_check
    check (processing_status in ('received', 'processing', 'processed', 'ignored', 'error'))
);

create index if not exists payment_webhook_events_resource_idx
  on public.payment_webhook_events (mercadopago_resource_id);

create trigger set_payment_webhook_events_updated_at
before update on public.payment_webhook_events
for each row
execute function public.set_updated_at();

alter table public.orders enable row level security;
alter table public.payment_webhook_events enable row level security;
