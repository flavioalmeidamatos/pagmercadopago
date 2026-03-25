drop table if exists public.webhook_events;

drop index if exists public.orders_payment_status_idx;

alter table public.orders
  drop column if exists preference_id,
  drop column if exists merchant_order_id,
  drop column if exists payment_id,
  drop column if exists payment_status,
  drop column if exists payment_status_detail,
  drop column if exists last_webhook_event_at;
