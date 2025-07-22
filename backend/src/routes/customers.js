const express = require('express');
const router = express.Router();
const db = require('../database');

// GET all customers
router.get('/', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM customers ORDER BY company_name');
    const customers = stmt.all();
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

module.exports = router;