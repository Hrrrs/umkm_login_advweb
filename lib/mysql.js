const mysql = require('mysql2/promise');

let pool = null;

function mysqlEnabled() {
  const v = (process.env.MYSQL_ENABLED || '1').toLowerCase();
  return v === '1' || v === 'true';
}

async function init() {
  if (!mysqlEnabled()) return;
  if (pool) return pool;
  const cfg = {
    host: process.env.MYSQL_HOST || 'localhost',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'pkm_demo',
  connectionLimit: 10,
  // Fail fast when MySQL is unreachable
  connectTimeout: Number(process.env.MYSQL_CONNECT_TIMEOUT_MS || 2000)
  };
  pool = mysql.createPool(cfg);
  await ensureSchema();
  return pool;
}

async function ensureSchema() {
  if (!pool) throw new Error('Pool not initialized');
  await pool.query(`CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    createdAt DATETIME
  ) ENGINE=InnoDB;`);

  await pool.query(`CREATE TABLE IF NOT EXISTS items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255),
    price DECIMAL(12,2),
    createdAt DATETIME,
    updatedAt DATETIME
  ) ENGINE=InnoDB;`);

  await pool.query(`CREATE TABLE IF NOT EXISTS customers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255),
    contact VARCHAR(255),
    createdAt DATETIME,
    updatedAt DATETIME
  ) ENGINE=InnoDB;`);

  await pool.query(`CREATE TABLE IF NOT EXISTS students (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255),
    nis VARCHAR(50),
    createdAt DATETIME,
    updatedAt DATETIME
  ) ENGINE=InnoDB;`);
}

// Users
async function findUserByUsername(username) {
  if (!mysqlEnabled()) throw new Error('MySQL not enabled');
  const p = await init();
  const [rows] = await p.query('SELECT * FROM users WHERE username = ? LIMIT 1', [username]);
  return rows[0] || null;
}

async function getUserById(id) {
  if (!mysqlEnabled()) throw new Error('MySQL not enabled');
  const p = await init();
  const [rows] = await p.query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

async function createUser({ username, password, role }) {
  const p = await init();
  const [res] = await p.query('INSERT INTO users (username,password,role,createdAt) VALUES (?,?,?,?)', [username, password, role || 'user', new Date()]);
  return { id: res.insertId, username, role: role || 'user' };
}

async function listUsers() {
  const p = await init();
  const [rows] = await p.query('SELECT id,username,role,createdAt FROM users ORDER BY id');
  return rows;
}

async function updateUser(id, { password, role }) {
  const p = await init();
  if (password) await p.query('UPDATE users SET password = ? WHERE id = ?', [password, id]);
  if (role) await p.query('UPDATE users SET role = ? WHERE id = ?', [role, id]);
  const user = await getUserById(id);
  return user;
}

async function deleteUser(id) {
  const p = await init();
  const [rows] = await p.query('SELECT id,username FROM users WHERE id = ?', [id]);
  if (!rows || rows.length === 0) return null;
  await p.query('DELETE FROM users WHERE id = ?', [id]);
  return rows[0];
}

// Generic collection CRUD
const COLLECTION_MAP = {
  items: { table: 'items', fields: ['name','price','createdAt','updatedAt'] },
  customers: { table: 'customers', fields: ['name','contact','createdAt','updatedAt'] },
  students: { table: 'students', fields: ['name','nis','createdAt','updatedAt'] }
};

async function listCollection(col) {
  if (!COLLECTION_MAP[col]) throw new Error('Unknown collection');
  const p = await init();
  const [rows] = await p.query(`SELECT * FROM \`${COLLECTION_MAP[col].table}\` ORDER BY id`);
  return rows;
}

async function createCollectionItem(col, payload) {
  if (!COLLECTION_MAP[col]) throw new Error('Unknown collection');
  const p = await init();
  const table = COLLECTION_MAP[col].table;
  const createdAt = new Date();
  const fields = Object.keys(payload).filter(k => k !== 'id');
  const values = fields.map(k => payload[k]);
  const qFields = fields.length ? fields.join(',') + ',createdAt' : 'createdAt';
  const placeholders = fields.map(_ => '?').join(',') + (fields.length ? ',?' : '?');
  const params = values.concat([createdAt]);
  const sql = `INSERT INTO \`${table}\` (${qFields}) VALUES (${placeholders})`;
  const [res] = await p.query(sql, params);
  const [rows] = await p.query(`SELECT * FROM \`${table}\` WHERE id = ? LIMIT 1`, [res.insertId]);
  return rows[0];
}

async function updateCollectionItem(col, id, payload) {
  if (!COLLECTION_MAP[col]) throw new Error('Unknown collection');
  const p = await init();
  const table = COLLECTION_MAP[col].table;
  const fields = Object.keys(payload).filter(k => k !== 'id');
  if (fields.length === 0) return await listCollection(col).then(rows => rows.find(r => String(r.id) === String(id)));
  const sets = fields.map(f => `\`${f}\` = ?`).join(',');
  const params = fields.map(f => payload[f]);
  params.push(new Date()); // updatedAt
  params.push(id);
  const sql = `UPDATE \`${table}\` SET ${sets}, updatedAt = ? WHERE id = ?`;
  await p.query(sql, params);
  const [rows] = await p.query(`SELECT * FROM \`${table}\` WHERE id = ? LIMIT 1`, [id]);
  return rows[0];
}

async function deleteCollectionItem(col, id) {
  if (!COLLECTION_MAP[col]) throw new Error('Unknown collection');
  const p = await init();
  const table = COLLECTION_MAP[col].table;
  const [rows] = await p.query(`SELECT * FROM \`${table}\` WHERE id = ? LIMIT 1`, [id]);
  if (!rows || rows.length === 0) return null;
  await p.query(`DELETE FROM \`${table}\` WHERE id = ?`, [id]);
  return rows[0];
}

async function reportSummary() {
  const p = await init();
  const [[{ c: usersCount }]] = await p.query('SELECT COUNT(*) AS c FROM users');
  const [[{ c: itemsCount }]] = await p.query('SELECT COUNT(*) AS c FROM items');
  const [[{ c: customersCount }]] = await p.query('SELECT COUNT(*) AS c FROM customers');
  const [[{ c: studentsCount }]] = await p.query('SELECT COUNT(*) AS c FROM students');
  return { usersCount, itemsCount, customersCount, studentsCount };
}

module.exports = {
  mysqlEnabled,
  init,
  findUserByUsername,
  getUserById,
  createUser,
  listUsers,
  updateUser,
  deleteUser,
  listCollection,
  createCollectionItem,
  updateCollectionItem,
  deleteCollectionItem,
  reportSummary
};
