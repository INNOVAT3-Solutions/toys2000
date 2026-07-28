-- Run in Supabase SQL editor if upgrading an existing database.
-- Full schema is in supabase/schema.sql.

create table if not exists order_idempotency (
  key             text primary key,
  user_id         uuid not null references auth.users on delete cascade,
  order_response  jsonb not null,
  created_at      timestamptz not null default now()
);

create index if not exists order_idempotency_user_created_idx
  on order_idempotency(user_id, created_at desc);

alter table order_idempotency enable row level security;

create index if not exists products_catalog_idx
  on products(show_on_website, discontinued, record_id)
  where show_on_website = true and discontinued = false;
