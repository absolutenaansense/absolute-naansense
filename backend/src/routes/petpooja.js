const express = require('express');
const router = express.Router();
const { authenticateAdmin } = require('../middleware/auth');
const petpoojaService = require('../services/petpooja');

// GET /api/petpooja/sync-menu — pull menu from PetPooja
router.get('/sync-menu', authenticateAdmin, async (req, res, next) => {
  try {
    const menu = await petpoojaService.fetchPetpoojaMenu();
    res.json({ menu });
  } catch (err) { next(err); }
});

// POST /api/petpooja/test — test PetPooja connection
router.post('/test', authenticateAdmin, async (req, res, next) => {
  try {
    const menu = await petpoojaService.fetchPetpoojaMenu();
    res.json({ connected: true, restaurantName: menu?.restaurant?.restaurant_name });
  } catch (err) {
    res.json({ connected: false, error: err.message });
  }
});

module.exports = router;
