-- Reservations: align the table with what the admin app actually uses.
ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "guestName"  TEXT;
ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "phone"      TEXT;
ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "guestCount" INTEGER;
ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "timeSlot"   TEXT;
ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "tableLabel" TEXT;

-- Legacy NOT NULL columns the app doesn't populate.
ALTER TABLE "Reservation" ALTER COLUMN "userId"    DROP NOT NULL;
ALTER TABLE "Reservation" ALTER COLUMN "tableId"   DROP NOT NULL;
ALTER TABLE "Reservation" ALTER COLUMN "startTime" DROP NOT NULL;
ALTER TABLE "Reservation" ALTER COLUMN "endTime"   DROP NOT NULL;
ALTER TABLE "Reservation" ALTER COLUMN "guests"    DROP NOT NULL;
