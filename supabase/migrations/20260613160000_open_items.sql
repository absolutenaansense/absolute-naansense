-- Open Items: allow order lines with a custom name/price and no menu link.
ALTER TABLE "OrderItem" ALTER COLUMN "menuItemId" DROP NOT NULL;
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "itemName" TEXT;
