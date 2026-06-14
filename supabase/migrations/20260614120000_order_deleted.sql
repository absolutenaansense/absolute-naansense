-- Super-admin "delete" (distinct from "cancel"): a deleted order is hidden from
-- reports entirely, whereas a cancelled order still shows (as cancelled).
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deleted" boolean NOT NULL DEFAULT false;
