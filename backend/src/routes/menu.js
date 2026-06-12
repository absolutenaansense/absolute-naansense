const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticateAdmin } = require('../middleware/auth');

const prisma = new PrismaClient();

// GET /api/menu — public, returns full menu grouped by category
router.get('/', async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        menuItems: {
          where: { isAvailable: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    res.json({ categories });
  } catch (err) { next(err); }
});

// POST /api/menu/categories — admin only
router.post('/categories', authenticateAdmin, async (req, res, next) => {
  try {
    const { name, sortOrder } = req.body;
    const cat = await prisma.category.create({ data: { name, sortOrder } });
    res.status(201).json({ category: cat });
  } catch (err) { next(err); }
});

// POST /api/menu/items — admin only
router.post('/items', authenticateAdmin, async (req, res, next) => {
  try {
    const { categoryId, name, description, price, isVeg, imageUrl, sortOrder } = req.body;
    const item = await prisma.menuItem.create({
      data: { categoryId, name, description, price, isVeg, imageUrl, sortOrder },
    });
    res.status(201).json({ item });
  } catch (err) { next(err); }
});

// PATCH /api/menu/items/:id — admin only
router.patch('/items/:id', authenticateAdmin, async (req, res, next) => {
  try {
    const { name, description, price, isVeg, isAvailable, imageUrl } = req.body;
    const item = await prisma.menuItem.update({
      where: { id: req.params.id },
      data: { name, description, price, isVeg, isAvailable, imageUrl },
    });
    res.json({ item });
  } catch (err) { next(err); }
});

// PATCH /api/menu/items/:id/toggle — toggle availability
router.patch('/items/:id/toggle', authenticateAdmin, async (req, res, next) => {
  try {
    const item = await prisma.menuItem.findUnique({ where: { id: req.params.id } });
    const updated = await prisma.menuItem.update({
      where: { id: req.params.id },
      data: { isAvailable: !item.isAvailable },
    });
    res.json({ item: updated });
  } catch (err) { next(err); }
});

module.exports = router;
