const express = require('express');
const router = express.Router();
const { readDb, writeDb, getNextIdFor } = require('../lib/db');
const mysql = require('../lib/mysql');
const { requireAuth } = require('../middleware/auth');

const VALID = ['items', 'customers', 'students'];

router.get('/api/master/:col', requireAuth, async (req, res) => {
  const col = req.params.col;
  if (!VALID.includes(col)) return res.status(400).json({ error: 'Invalid collection' });
  const rows = await mysql.listCollection(col);
  res.json(rows || []);
});

router.post('/api/master/:col', requireAuth, async (req, res) => {
  const col = req.params.col;
  if (!VALID.includes(col)) return res.status(400).json({ error: 'Invalid collection' });
  const payload = req.body || {};
  const row = await mysql.createCollectionItem(col, payload);
  return res.status(201).json(row);
});

router.put('/api/master/:col/:id', requireAuth, async (req, res) => {
  const col = req.params.col;
  const id = req.params.id;
  if (!VALID.includes(col)) return res.status(400).json({ error: 'Invalid collection' });
  const row = await mysql.updateCollectionItem(col, id, req.body || {});
  if (!row) return res.status(404).json({ error: 'Not found' });
  return res.json(row);
});

router.delete('/api/master/:col/:id', requireAuth, async (req, res) => {
  const col = req.params.col;
  const id = req.params.id;
  if (!VALID.includes(col)) return res.status(400).json({ error: 'Invalid collection' });
  const removed = await mysql.deleteCollectionItem(col, id);
  if (!removed) return res.status(404).json({ error: 'Not found' });
  return res.json({ removed });
});

module.exports = router;
