-- POS settlement workflow: bills are UNSETTLED by default and only become
-- settled when a payment mode is confirmed. paymentMode is the confirmed mode
-- (cash/upi/card/online/part/due); paidAmount tracks how much has been received
-- (for 'part'). Existing paid orders are backfilled as settled in full.
alter table "Order" add column if not exists "settled" boolean not null default false;
alter table "Order" add column if not exists "paymentMode" text;
alter table "Order" add column if not exists "paidAmount" numeric not null default 0;

update "Order" set
  "settled" = true,
  "paidAmount" = "total",
  "paymentMode" = case
    when "paymentMethod" = 'CASH_ON_DELIVERY' then 'cash'
    when "paymentMethod" = 'QR_UPI' then 'upi'
    when "paymentMethod" = 'SPLIT' then 'split'
    when "paymentMethod" = 'COMPLIMENTARY' then 'comp'
    else 'cash' end
where "paymentStatus" = 'paid' and "settled" = false;
