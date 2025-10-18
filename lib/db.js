const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '..', 'db.json');

async function readDb() {
  try {
    const raw = await fs.readFile(DB_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    const init = { meta: {}, users: [], items: [], customers: [], students: [] };
    await writeDb(init);
    return init;
  }
}

async function writeDb(obj) {
  await fs.writeFile(DB_PATH, JSON.stringify(obj, null, 2), 'utf8');
}

function ensureMeta(db) {
  if (!db.meta) db.meta = {};
  db.meta.nextUserId = db.meta.nextUserId || 1;
  db.meta.nextItemId = db.meta.nextItemId || 1;
  db.meta.nextCustomerId = db.meta.nextCustomerId || 1;
  db.meta.nextStudentId = db.meta.nextStudentId || 1;
}

async function initDb() {
  const db = await readDb();
  ensureMeta(db);
  if (!db.users || db.users.length === 0) {
    // Create default admin with hashed password (async)
    const pwd = await bcrypt.hash('admin', 10);
    db.users = [{ id: 1, username: 'admin', password: pwd, role: 'admin', createdAt: new Date().toISOString() }];
    db.meta.nextUserId = Math.max(db.meta.nextUserId || 1, 2);
    await writeDb(db);
    console.log('Initialized db.json with default admin/admin (id=1)');
  } else {
    // normalize nextUserId and ensure passwords are hashed
    const numeric = db.users.map(u => Number(u.id)).filter(n => Number.isFinite(n));
    const maxId = numeric.length ? Math.max(...numeric) : 0;
    db.meta.nextUserId = Math.max(db.meta.nextUserId || 1, maxId + 1);
    // Hash any plaintext passwords (simple heuristic: bcrypt hash starts with $2)
    let changed = false;
    for (let u of db.users) {
      if (typeof u.password === 'string' && !u.password.startsWith('$2')) {
        // use async hashing to avoid blocking the event loop
        u.password = await bcrypt.hash(String(u.password), 10);
        changed = true;
      }
    }
    if (changed) await writeDb(db);
  }
  return db;
}

function metaKeyForCollection(col) {
  return {
    items: 'nextItemId',
    customers: 'nextCustomerId',
    students: 'nextStudentId',
    users: 'nextUserId'
  }[col];
}

function getNextIdFor(db, col) {
  if (!db.meta) db.meta = {};
  const key = metaKeyForCollection(col);
  if (!key) throw new Error('Unknown collection for next id');
  if (!db.meta[key]) db.meta[key] = 1;
  const id = db.meta[key];
  db.meta[key] = id + 1;
  return id;
}

module.exports = { readDb, writeDb, initDb, getNextIdFor };
