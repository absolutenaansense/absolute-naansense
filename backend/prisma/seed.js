const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create tables
  const tables = await Promise.all([
    prisma.table.upsert({ where: { name: 'Table 1' }, update: {}, create: { name: 'Table 1', capacity: 4 } }),
    prisma.table.upsert({ where: { name: 'Table 2' }, update: {}, create: { name: 'Table 2', capacity: 4 } }),
    prisma.table.upsert({ where: { name: 'Table 3' }, update: {}, create: { name: 'Table 3', capacity: 6 } }),
    prisma.table.upsert({ where: { name: 'Table 4' }, update: {}, create: { name: 'Table 4', capacity: 6 } }),
    prisma.table.upsert({ where: { name: 'Table 5' }, update: {}, create: { name: 'Table 5', capacity: 8 } }),
    prisma.table.upsert({ where: { name: 'Private Dining' }, update: {}, create: { name: 'Private Dining', capacity: 20 } }),
  ]);
  console.log(`Created ${tables.length} tables`);

  // Create menu categories
  const breads = await prisma.category.upsert({ where: { name: 'Breads' }, update: {}, create: { name: 'Breads', sortOrder: 1 } });
  const starters = await prisma.category.upsert({ where: { name: 'Starters' }, update: {}, create: { name: 'Starters', sortOrder: 2 } });
  const mains = await prisma.category.upsert({ where: { name: 'Mains' }, update: {}, create: { name: 'Mains', sortOrder: 3 } });
  const biryani = await prisma.category.upsert({ where: { name: 'Biryani & Rice' }, update: {}, create: { name: 'Biryani & Rice', sortOrder: 4 } });
  const drinks = await prisma.category.upsert({ where: { name: 'Drinks' }, update: {}, create: { name: 'Drinks', sortOrder: 5 } });
  const desserts = await prisma.category.upsert({ where: { name: 'Desserts' }, update: {}, create: { name: 'Desserts', sortOrder: 6 } });

  const menuItems = [
    // Breads
    { categoryId: breads.id, name: 'Butter Naan', price: 55, isVeg: true, sortOrder: 1 },
    { categoryId: breads.id, name: 'Garlic Naan', price: 65, isVeg: true, sortOrder: 2 },
    { categoryId: breads.id, name: 'Stuffed Naan', price: 85, isVeg: true, sortOrder: 3 },
    { categoryId: breads.id, name: 'Tandoori Roti', price: 40, isVeg: true, sortOrder: 4 },
    { categoryId: breads.id, name: 'Lachha Paratha', price: 70, isVeg: true, sortOrder: 5 },
    // Starters
    { categoryId: starters.id, name: 'Paneer Tikka', price: 260, isVeg: true, sortOrder: 1 },
    { categoryId: starters.id, name: 'Hara Bhara Kebab', price: 220, isVeg: true, sortOrder: 2 },
    { categoryId: starters.id, name: 'Chicken Seekh Kebab', price: 340, isVeg: false, sortOrder: 3 },
    { categoryId: starters.id, name: 'Chicken Tikka', price: 320, isVeg: false, sortOrder: 4 },
    { categoryId: starters.id, name: 'Mutton Galouti Kebab', price: 380, isVeg: false, sortOrder: 5 },
    // Mains
    { categoryId: mains.id, name: 'Dal Makhani', price: 280, isVeg: true, sortOrder: 1, description: 'Slow-cooked black lentils, cream, butter' },
    { categoryId: mains.id, name: 'Paneer Butter Masala', price: 320, isVeg: true, sortOrder: 2 },
    { categoryId: mains.id, name: 'Shahi Paneer', price: 340, isVeg: true, sortOrder: 3 },
    { categoryId: mains.id, name: 'Kadhai Paneer', price: 320, isVeg: true, sortOrder: 4 },
    { categoryId: mains.id, name: 'Chicken Tikka Masala', price: 380, isVeg: false, sortOrder: 5 },
    { categoryId: mains.id, name: 'Butter Chicken', price: 380, isVeg: false, sortOrder: 6 },
    { categoryId: mains.id, name: 'Mutton Rogan Josh', price: 420, isVeg: false, sortOrder: 7 },
    { categoryId: mains.id, name: 'Kadhai Chicken', price: 360, isVeg: false, sortOrder: 8 },
    // Biryani
    { categoryId: biryani.id, name: 'Veg Biryani', price: 280, isVeg: true, sortOrder: 1 },
    { categoryId: biryani.id, name: 'Chicken Biryani', price: 360, isVeg: false, sortOrder: 2 },
    { categoryId: biryani.id, name: 'Mutton Biryani', price: 420, isVeg: false, sortOrder: 3 },
    { categoryId: biryani.id, name: 'Jeera Rice', price: 140, isVeg: true, sortOrder: 4 },
    // Drinks
    { categoryId: drinks.id, name: 'Mango Lassi', price: 90, isVeg: true, sortOrder: 1 },
    { categoryId: drinks.id, name: 'Sweet Lassi', price: 80, isVeg: true, sortOrder: 2 },
    { categoryId: drinks.id, name: 'Masala Chai', price: 50, isVeg: true, sortOrder: 3 },
    { categoryId: drinks.id, name: 'Fresh Lime Soda', price: 70, isVeg: true, sortOrder: 4 },
    { categoryId: drinks.id, name: 'Shikanji', price: 60, isVeg: true, sortOrder: 5 },
    // Desserts
    { categoryId: desserts.id, name: 'Gulab Jamun', price: 110, isVeg: true, sortOrder: 1 },
    { categoryId: desserts.id, name: 'Rasmalai', price: 130, isVeg: true, sortOrder: 2 },
    { categoryId: desserts.id, name: 'Kulfi', price: 120, isVeg: true, sortOrder: 3 },
  ];

  for (const item of menuItems) {
    await prisma.menuItem.upsert({
      where: { id: item.name }, // won't match, will create
      update: {},
      create: item,
    }).catch(() => prisma.menuItem.create({ data: item }));
  }
  console.log(`Seeded ${menuItems.length} menu items`);

  // Create default admin
  const adminHash = await bcrypt.hash('admin@naansense123', 12);
  await prisma.admin.upsert({
    where: { email: 'admin@absolutenaansense.com' },
    update: {},
    create: {
      name: 'Absolute Naansense Admin',
      email: 'admin@absolutenaansense.com',
      passwordHash: adminHash,
    },
  });
  console.log('Default admin created: admin@absolutenaansense.com / admin@naansense123');
  console.log('⚠️  Change the admin password immediately after first login!');
  console.log('Seeding complete.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
