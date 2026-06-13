-- Timestamp when an order is confirmed (drives the 1-hour ETA countdown).
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "confirmedAt" TIMESTAMP;
