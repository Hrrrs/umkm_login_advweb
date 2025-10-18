const express = require('express');
const router = express.Router();
const { readDb } = require('../lib/db');
const { requireAuth } = require('../middleware/auth');
const mysql = require('../lib/mysql');

router.get('/api/report/summary', requireAuth, async (req, res) => {
  const s = await mysql.reportSummary();
  return res.json({ summary: s });
});

router.get('/api/report/:type-csv', requireAuth, async (req, res) => {
  const full = req.path.split('/').pop(); // items-csv
  const type = full ? full.replace(/-csv$/i, '') : null;
  const allowed = ['items', 'customers', 'students'];
  if (!type || !allowed.includes(type)) return res.status(400).json({ error: 'Invalid report type' });
  const rows = await mysql.listCollection(type) || [];
  if (rows.length === 0) {
    res.header('Content-Type', 'text/csv');
    res.attachment(`${type}.csv`);
    return res.send('');
  }
  const keys = Array.from(new Set(rows.flatMap(r => Object.keys(r))));
  const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csvLines = [keys.join(',')];
  for (const r of rows) csvLines.push(keys.map(k => escape(r[k])).join(','));
  const csv = csvLines.join('\n');
  res.header('Content-Type', 'text/csv');
  res.attachment(`${type}.csv`);
  res.send(csv);
});

module.exports = router;
