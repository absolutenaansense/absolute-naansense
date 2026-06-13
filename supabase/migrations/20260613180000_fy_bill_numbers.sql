-- Bill numbers reset every Indian financial year (Apr 1 - Mar 31), starting at 1.
CREATE TABLE IF NOT EXISTS "BillCounter" (fy int PRIMARY KEY, n int NOT NULL DEFAULT 0);

-- Current FY (by IST date): month >= April -> current year, else previous year.
-- Seed the current FY from the existing max bill number so we don't re-issue numbers.
INSERT INTO "BillCounter"(fy, n)
SELECT CASE WHEN extract(month FROM (now() AT TIME ZONE 'Asia/Kolkata')::date) >= 4
            THEN extract(year FROM (now() AT TIME ZONE 'Asia/Kolkata')::date)::int
            ELSE (extract(year FROM (now() AT TIME ZONE 'Asia/Kolkata')::date) - 1)::int END,
       COALESCE(MAX("billNo"), 0)
FROM "Order"
ON CONFLICT (fy) DO NOTHING;

CREATE OR REPLACE FUNCTION next_bill_no() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE d date; y int; v int;
BEGIN
  d := (now() AT TIME ZONE 'Asia/Kolkata')::date;
  y := CASE WHEN extract(month FROM d) >= 4 THEN extract(year FROM d)::int ELSE (extract(year FROM d) - 1)::int END;
  INSERT INTO "BillCounter"(fy, n) VALUES (y, 1)
  ON CONFLICT (fy) DO UPDATE SET n = "BillCounter".n + 1 RETURNING n INTO v;
  RETURN v;
END $$;
GRANT EXECUTE ON FUNCTION next_bill_no() TO anon, authenticated;
