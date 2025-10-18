const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { requireAuth } = require('../middleware/auth');
const mysql = require('../lib/mysql');
// This application now requires MySQL. Fail fast if not enabled.
if (!mysql.mysqlEnabled()) {
  console.warn('Warning: MYSQL_ENABLED is not set. Auth routes require MySQL. Set MYSQL_ENABLED=1 to enable MySQL.');
}

// POST /login
router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });
  if (!mysql.mysqlEnabled()) return res.status(500).json({ error: 'MySQL not enabled on server' });
  const user = await mysql.findUserByUsername(username);
  if (!user) return res.status(401).json({ error: 'Login failed: invalid username or password' });
  const ok = await bcrypt.compare(String(password), String(user.password));
  if (!ok) return res.status(401).json({ error: 'Login failed: invalid username or password' });
  req.session.userId = user.id;
  const accept = (req.headers && req.headers.accept) || '';
  const contentType = (req.headers && req.headers['content-type']) || '';
  const wantsHtml = accept.includes('text/html') || contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data');
  if (wantsHtml) return res.redirect('/menu');
  return res.json({ message: 'Logged in', user: { id: user.id, username: user.username, role: user.role }, redirect: '/menu' });
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => res.json({ message: 'Logged out' }));
});

// Admin-only user management
// POST /register (admin creates users)
router.post('/register', requireAuth, async (req, res) => {
  if (!mysql.mysqlEnabled()) return res.status(500).json({ error: 'MySQL not enabled' });
  const current = await mysql.getUserById(req.session.userId);
  if (!current || current.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const { username, password, role } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  const existing = await mysql.findUserByUsername(username);
  if (existing) return res.status(409).json({ error: 'username exists' });
  const hash = await bcrypt.hash(password, 10);
  const created = await mysql.createUser({ username, password: hash, role });
  return res.status(201).json(created);
});

// GET /api/users
router.get('/api/users', requireAuth, async (req, res) => {
  if (!mysql.mysqlEnabled()) return res.status(500).json({ error: 'MySQL not enabled' });
  const current = await mysql.getUserById(req.session.userId);
  if (!current || current.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const rows = await mysql.listUsers();
  return res.json(rows);
});

// PUT /api/users/:id
router.put('/api/users/:id', requireAuth, async (req, res) => {
  if (!mysql.mysqlEnabled()) return res.status(500).json({ error: 'MySQL not enabled' });
  const current = await mysql.getUserById(req.session.userId);
  if (!current || current.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const id = req.params.id;
  const changes = {};
  if (req.body.password) changes.password = await bcrypt.hash(req.body.password, 10);
  if (req.body.role) changes.role = req.body.role;
  const user = await mysql.updateUser(id, changes);
  if (!user) return res.status(404).json({ error: 'Not found' });
  return res.json({ id: user.id, username: user.username, role: user.role });
});

// DELETE /api/users/:id
router.delete('/api/users/:id', requireAuth, async (req, res) => {
  if (!mysql.mysqlEnabled()) return res.status(500).json({ error: 'MySQL not enabled' });
  const current = await mysql.getUserById(req.session.userId);
  if (!current || current.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const id = req.params.id;
  const removed = await mysql.deleteUser(id);
  if (!removed) return res.status(404).json({ error: 'Not found' });
  return res.json({ removed });
});

module.exports = router;

