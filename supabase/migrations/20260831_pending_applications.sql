-- Pending wholesale applications from /register.
-- Avoids scanning all MarketTime customers on every admin page load.

create table if not exists pending_applications (
  id              uuid primary key default gen_random_uuid(),
  retailer_id     text not null unique,          -- MarketTime ID e.g. B26491922
  company_name    text not null,
  email           text not null,
  phone           text,
  contact_name    text,
  city            text,
  state           text,
  address1        text,
  website         text,
  tax_id          text,
  status          text not null default 'pending'
                    check (status in ('pending', 'approved', 'rejected')),
  created_at      timestamptz not null default now(),
  resolved_at     timestamptz
);

create index if not exists pending_applications_status_created_idx
  on pending_applications (status, created_at desc);

create index if not exists pending_applications_email_idx
  on pending_applications (lower(email));

alter table pending_applications enable row level security;

-- Service role / admin API only; no public access.
drop policy if exists "No public access to pending_applications" on pending_applications;
create policy "No public access to pending_applications"
  on pending_applications
  for all
  using (false);
