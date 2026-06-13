-- Sequential bill numbers for printed bills / settled orders.
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "billNo" INTEGER;
CREATE SEQUENCE IF NOT EXISTS bill_no_seq AS INTEGER START WITH 1;

-- SECURITY DEFINER so the anon client can draw the next number without
-- direct sequence privileges.
CREATE OR REPLACE FUNCTION next_bill_no() RETURNS integer
  LANGUAGE sql SECURITY DEFINER AS $$ SELECT nextval('bill_no_seq')::int $$;
GRANT EXECUTE ON FUNCTION next_bill_no() TO anon, authenticated;
