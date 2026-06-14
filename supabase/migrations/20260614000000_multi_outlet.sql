-- ============================================================================
-- Multi-outlet foundation: per-outlet orders, bill/KOT numbering, ops audit log,
-- and admin roles. Renukoot keeps its existing bill/KOT continuity; Renusagar
-- starts fresh. Backward-compatible: the old no-arg next_bill_no()/next_kot_no()
-- keep working (they now target the 'renukoot' outlet).
-- ============================================================================

-- 1) Tag every order with its outlet ('renukoot' | 'renusagar') -----------------
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "outlet" TEXT;

-- Backfill: online orders already carry the outlet inside notes JSON; everything
-- else (POS/dine-in, legacy) defaults to renukoot.
UPDATE "Order"
SET "outlet" = COALESCE(
  NULLIF(CASE WHEN notes ~ '^\s*\{' THEN (notes::jsonb ->> 'outlet') ELSE NULL END, ''),
  'renukoot'
)
WHERE "outlet" IS NULL;

ALTER TABLE "Order" ALTER COLUMN "outlet" SET DEFAULT 'renukoot';
CREATE INDEX IF NOT EXISTS order_outlet_created ON "Order"("outlet", "createdAt" DESC);

-- 2) Per-outlet, per-financial-year bill numbers (reset to 1 every 1 April) ------
ALTER TABLE "BillCounter" ADD COLUMN IF NOT EXISTS outlet TEXT NOT NULL DEFAULT 'renukoot';
ALTER TABLE "BillCounter" DROP CONSTRAINT IF EXISTS "BillCounter_pkey";
ALTER TABLE "BillCounter" ADD PRIMARY KEY (outlet, fy);

CREATE OR REPLACE FUNCTION next_bill_no(p_outlet text) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE d date; y int; v int;
BEGIN
  d := (now() AT TIME ZONE 'Asia/Kolkata')::date;
  y := CASE WHEN extract(month FROM d) >= 4 THEN extract(year FROM d)::int ELSE (extract(year FROM d) - 1)::int END;
  INSERT INTO "BillCounter"(outlet, fy, n) VALUES (COALESCE(p_outlet, 'renukoot'), y, 1)
  ON CONFLICT (outlet, fy) DO UPDATE SET n = "BillCounter".n + 1 RETURNING n INTO v;
  RETURN v;
END $$;
GRANT EXECUTE ON FUNCTION next_bill_no(text) TO anon, authenticated;

-- Keep the old no-arg version working (targets renukoot) for any un-migrated call.
CREATE OR REPLACE FUNCTION next_bill_no() RETURNS integer LANGUAGE sql SECURITY DEFINER AS $$ SELECT next_bill_no('renukoot') $$;
GRANT EXECUTE ON FUNCTION next_bill_no() TO anon, authenticated;

-- 3) Per-outlet daily KOT numbers (reset daily, sequential across order types) ---
ALTER TABLE "KotCounter" ADD COLUMN IF NOT EXISTS outlet TEXT NOT NULL DEFAULT 'renukoot';
ALTER TABLE "KotCounter" DROP CONSTRAINT IF EXISTS "KotCounter_pkey";
ALTER TABLE "KotCounter" ADD PRIMARY KEY (outlet, day);

CREATE OR REPLACE FUNCTION next_kot_no(p_outlet text) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE d date; v integer;
BEGIN
  d := (now() AT TIME ZONE 'Asia/Kolkata')::date;
  INSERT INTO "KotCounter"(outlet, day, n) VALUES (COALESCE(p_outlet, 'renukoot'), d, 1)
  ON CONFLICT (outlet, day) DO UPDATE SET n = "KotCounter".n + 1 RETURNING n INTO v;
  RETURN v;
END $$;
GRANT EXECUTE ON FUNCTION next_kot_no(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION next_kot_no() RETURNS integer LANGUAGE sql SECURITY DEFINER AS $$ SELECT next_kot_no('renukoot') $$;
GRANT EXECUTE ON FUNCTION next_kot_no() TO anon, authenticated;

-- 4) Operations / audit log -- every biller action on KOTs and bills ------------
CREATE TABLE IF NOT EXISTS "OpsLog" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet text NOT NULL,
  "orderId" uuid,
  "billNo" integer,
  "kotNo" integer,
  action text NOT NULL,   -- kot_add | kot_modify | kot_cancel | bill_modify | item_add_after_print | reprint | waive_off | order_cancel | settle
  detail jsonb,           -- before/after snapshot, items added/removed, amounts, remark, etc.
  actor text,             -- which biller/outlet performed it
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS opslog_outlet_created ON "OpsLog"(outlet, "createdAt" DESC);
GRANT SELECT, INSERT ON "OpsLog" TO anon, authenticated;

-- 5) Roles on admin/staff accounts ---------------------------------------------
ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'super_admin'; -- super_admin | outlet_admin | biller
ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "outlet" TEXT;                               -- null for super_admin
