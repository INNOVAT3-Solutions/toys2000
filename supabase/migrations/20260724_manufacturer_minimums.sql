-- Vendor minimums from MarketTime GET /manufacturers (used by cart/checkout sync cache).

alter table manufacturers
  add column if not exists minimum_order_amount numeric(10, 2),
  add column if not exists minimum_reorder_amount numeric(10, 2);
