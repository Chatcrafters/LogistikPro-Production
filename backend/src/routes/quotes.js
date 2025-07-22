const express = require('express');
const router = express.Router();
const db = require('../database');

// GET all quotes with customer name
router.get('/', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT q.*, c.company_name 
      FROM quotes q 
      LEFT JOIN customers c ON q.customer_id = c.id 
      ORDER BY q.id DESC
    `);
    const quotes = stmt.all();
    res.json(quotes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch quotes' });
  }
});

// POST a new quote
router.post('/', (req, res) => {
  const { customer_id, origin, destination, weight } = req.body;
  if (!customer_id || !origin || !destination || !weight) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const year = new Date().getFullYear().toString().slice(-2);
    const countResult = db.prepare("SELECT COUNT(*) as count FROM quotes WHERE quote_number LIKE ?").get(`Q${year}-%`);
    const quoteNumber = `Q${year}-${String(countResult.count + 1).padStart(4, '0')}`;
    
    const stmt = db.prepare('INSERT INTO quotes (quote_number, customer_id, origin, destination, weight) VALUES (?, ?, ?, ?, ?)');
    const info = stmt.run(quoteNumber, customer_id, origin, destination, weight);
    
    const newQuote = db.prepare('SELECT * FROM quotes WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(newQuote);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create quote' });
  }
});

module.exports = router;