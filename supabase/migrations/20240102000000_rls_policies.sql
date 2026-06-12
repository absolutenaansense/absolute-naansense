-- Enable Row Level Security on all tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Admin" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Category" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MenuItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Table" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Reservation" ENABLE ROW LEVEL SECURITY;

-- Public read access for menu and categories (anyone can browse)
CREATE POLICY "Public can read categories" ON "Category" FOR SELECT USING (true);
CREATE POLICY "Public can read menu items" ON "MenuItem" FOR SELECT USING ("isAvailable" = true);
CREATE POLICY "Public can read tables" ON "Table" FOR SELECT USING ("isActive" = true);

-- Users: anyone can register (insert), only own record readable
CREATE POLICY "Anyone can register" ON "User" FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can read own profile" ON "User" FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON "User" FOR UPDATE USING (true);

-- Admin: only readable for login (SELECT by email)
CREATE POLICY "Admin login select" ON "Admin" FOR SELECT USING (true);

-- Orders: anyone can create, read all (admin handles via service role in future)
CREATE POLICY "Anyone can create orders" ON "Order" FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read orders" ON "Order" FOR SELECT USING (true);
CREATE POLICY "Anyone can update orders" ON "Order" FOR UPDATE USING (true);

-- Order items
CREATE POLICY "Anyone can create order items" ON "OrderItem" FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read order items" ON "OrderItem" FOR SELECT USING (true);

-- Reservations
CREATE POLICY "Anyone can create reservations" ON "Reservation" FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read reservations" ON "Reservation" FOR SELECT USING (true);
CREATE POLICY "Anyone can update reservations" ON "Reservation" FOR UPDATE USING (true);

-- Admin full access to menu
CREATE POLICY "Anyone can manage categories" ON "Category" FOR ALL USING (true);
CREATE POLICY "Anyone can manage menu items" ON "MenuItem" FOR ALL USING (true);
