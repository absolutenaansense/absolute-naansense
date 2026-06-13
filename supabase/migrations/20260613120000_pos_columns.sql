-- Proper columns to replace the Order.notes JSON workaround and power the POS.
ALTER TABLE "Order"     ADD COLUMN IF NOT EXISTS "orderType"       TEXT;     -- DELIVERY | DINE_IN | TAKEAWAY
ALTER TABLE "Order"     ADD COLUMN IF NOT EXISTS "tableLabel"      TEXT;     -- dine-in table, e.g. B1 / S-Stage
ALTER TABLE "Order"     ADD COLUMN IF NOT EXISTS "deliveryAddress" TEXT;
ALTER TABLE "Order"     ADD COLUMN IF NOT EXISTS "customerName"    TEXT;     -- walk-in / dine-in optional name
ALTER TABLE "Order"     ADD COLUMN IF NOT EXISTS "billPrinted"     BOOLEAN DEFAULT false;
ALTER TABLE "Order"     ADD COLUMN IF NOT EXISTS "isHeld"          BOOLEAN DEFAULT false;
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "specialRequest"  TEXT;

-- Safe JSON parse helper (notes may be '' or legacy plain text).
CREATE OR REPLACE FUNCTION pg_temp.try_jsonb(t TEXT) RETURNS JSONB AS $$
BEGIN RETURN t::jsonb; EXCEPTION WHEN others THEN RETURN NULL; END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Best-effort backfill of existing orders from the notes JSON.
UPDATE "Order" SET
  "orderType"       = COALESCE("orderType",       NULLIF(pg_temp.try_jsonb(notes)->>'type','')),
  "tableLabel"      = COALESCE("tableLabel",      NULLIF(pg_temp.try_jsonb(notes)->>'table','')),
  "deliveryAddress" = COALESCE("deliveryAddress", NULLIF(pg_temp.try_jsonb(notes)->>'address','')),
  "customerName"    = COALESCE("customerName",    NULLIF(pg_temp.try_jsonb(notes)->>'name',''))
WHERE pg_temp.try_jsonb(notes) IS NOT NULL;

-- Allow deletes (admin/POS) under the existing permissive RLS posture.
DROP POLICY IF EXISTS "Anyone can delete orders" ON "Order";
CREATE POLICY "Anyone can delete orders" ON "Order" FOR DELETE USING (true);
DROP POLICY IF EXISTS "Anyone can delete order items" ON "OrderItem";
CREATE POLICY "Anyone can delete order items" ON "OrderItem" FOR DELETE USING (true);
