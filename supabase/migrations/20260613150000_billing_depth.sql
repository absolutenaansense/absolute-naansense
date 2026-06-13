-- Billing depth: discounts, complimentary orders, and split/multiple payments.
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "discount"        NUMERIC(10,2) DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "isComplimentary" BOOLEAN DEFAULT false;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "payments"        JSONB;  -- [{method, amount}, ...]
