-- Customer phone on POS orders (address reuses deliveryAddress).
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "customerPhone" TEXT;

-- Per-round KOT number on each order item (for KOT-wise move + daily KOT no.)
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "kotNo" INTEGER;

-- Daily-resetting KOT number (resets by IST date, starts at 1).
CREATE TABLE IF NOT EXISTS "KotCounter" (day date PRIMARY KEY, n integer NOT NULL DEFAULT 0);
CREATE OR REPLACE FUNCTION next_kot_no() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE d date; v integer;
BEGIN
  d := (now() AT TIME ZONE 'Asia/Kolkata')::date;
  INSERT INTO "KotCounter"(day, n) VALUES (d, 1)
  ON CONFLICT (day) DO UPDATE SET n = "KotCounter".n + 1 RETURNING n INTO v;
  RETURN v;
END $$;
GRANT EXECUTE ON FUNCTION next_kot_no() TO anon, authenticated;
