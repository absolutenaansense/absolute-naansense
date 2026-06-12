-- Absolute Naansense - Initial Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users
CREATE TABLE IF NOT EXISTS "User" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  "passwordHash" TEXT NOT NULL,
  "isVerified" BOOLEAN DEFAULT false,
  "isReturning" BOOLEAN DEFAULT false,
  "fcmToken" TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Admins
CREATE TABLE IF NOT EXISTS "Admin" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email TEXT UNIQUE NOT NULL,
  "passwordHash" TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'admin',
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Categories
CREATE TABLE IF NOT EXISTS "Category" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  description TEXT,
  "imageUrl" TEXT,
  "isActive" BOOLEAN DEFAULT true,
  "sortOrder" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- MenuItems
CREATE TABLE IF NOT EXISTS "MenuItem" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  "imageUrl" TEXT,
  "isAvailable" BOOLEAN DEFAULT true,
  "isVeg" BOOLEAN DEFAULT true,
  "categoryId" TEXT NOT NULL REFERENCES "Category"(id),
  "petpoojaItemId" TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Tables
CREATE TABLE IF NOT EXISTS "Table" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  number INTEGER UNIQUE NOT NULL,
  capacity INTEGER DEFAULT 4,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Orders
CREATE TABLE IF NOT EXISTS "Order" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL REFERENCES "User"(id),
  status TEXT DEFAULT 'pending',
  "paymentMethod" TEXT NOT NULL,
  "paymentStatus" TEXT DEFAULT 'pending',
  "razorpayOrderId" TEXT,
  "razorpayPaymentId" TEXT,
  total DECIMAL(10,2) NOT NULL,
  notes TEXT,
  "tableId" TEXT REFERENCES "Table"(id),
  "petpoojaOrderId" TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- OrderItems
CREATE TABLE IF NOT EXISTS "OrderItem" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "orderId" TEXT NOT NULL REFERENCES "Order"(id),
  "menuItemId" TEXT NOT NULL REFERENCES "MenuItem"(id),
  quantity INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Reservations
CREATE TABLE IF NOT EXISTS "Reservation" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL REFERENCES "User"(id),
  "tableId" TEXT NOT NULL REFERENCES "Table"(id),
  date DATE NOT NULL,
  "startTime" TIME NOT NULL,
  "endTime" TIME NOT NULL,
  guests INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Seed: Default admin
INSERT INTO "Admin" (id, email, "passwordHash", name, role)
VALUES (
  gen_random_uuid()::text,
  'admin@absolutenaansense.com',
  '$2b$10$rQEj5xQxQxQxQxQxQxQxQeKxQxQxQxQxQxQxQxQxQxQxQxQxQxQx',
  'Admin',
  'admin'
) ON CONFLICT (email) DO NOTHING;

-- Seed: Tables 1-15
INSERT INTO "Table" (id, number, capacity) VALUES
  (gen_random_uuid()::text, 1, 2), (gen_random_uuid()::text, 2, 2),
  (gen_random_uuid()::text, 3, 4), (gen_random_uuid()::text, 4, 4),
  (gen_random_uuid()::text, 5, 4), (gen_random_uuid()::text, 6, 4),
  (gen_random_uuid()::text, 7, 6), (gen_random_uuid()::text, 8, 6),
  (gen_random_uuid()::text, 9, 6), (gen_random_uuid()::text, 10, 8),
  (gen_random_uuid()::text, 11, 8), (gen_random_uuid()::text, 12, 8),
  (gen_random_uuid()::text, 13, 10), (gen_random_uuid()::text, 14, 10),
  (gen_random_uuid()::text, 15, 12)
ON CONFLICT (number) DO NOTHING;

-- Seed: Categories
INSERT INTO "Category" (id, name, description, "sortOrder") VALUES
  (gen_random_uuid()::text, 'Breads & Naan', 'Our signature naan and breads', 1),
  (gen_random_uuid()::text, 'Curries', 'Rich and flavorful curries', 2),
  (gen_random_uuid()::text, 'Starters', 'Appetizers and starters', 3),
  (gen_random_uuid()::text, 'Rice & Biryani', 'Fragrant rice dishes', 4),
  (gen_random_uuid()::text, 'Beverages', 'Drinks and beverages', 5),
  (gen_random_uuid()::text, 'Desserts', 'Sweet endings', 6)
ON CONFLICT DO NOTHING;
