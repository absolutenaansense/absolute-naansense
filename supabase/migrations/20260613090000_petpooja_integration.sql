-- PetPooja POS integration
-- Map local menu items to PetPooja item IDs, and track PetPooja's order id/status.

-- Each local menu item must be linked to its PetPooja item ID for the Save Order
-- (KOT push) payload. Populate this once via the PetPooja "Fetch Menu" API or manually.
ALTER TABLE "MenuItem" ADD COLUMN IF NOT EXISTS "petpoojaItemId" TEXT;

-- Set when we successfully push an order to PetPooja; used to match status callbacks.
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "petpoojaOrderId" TEXT;

-- Raw last status string PetPooja sent us (for debugging / audit).
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "petpoojaStatus" TEXT;
