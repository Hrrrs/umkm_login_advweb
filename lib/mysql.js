const mysql = require('mysql2/promise');

let pool = null;

// ==================== CONFIG ====================
function mysqlEnabled() {
  const v = (process.env.MYSQL_ENABLED || '1').toLowerCase();
  return v === '1' || v === 'true';
}

function getConfig() {
  // Prefer standard MYSQL_* variables, but support Clever Cloud fallbacks:
  // MYSQL_ADDON_URI, MYSQL_ADDON_HOST, MYSQL_ADDON_PORT, MYSQL_ADDON_USER, MYSQL_ADDON_PASSWORD, MYSQL_ADDON_DB
  const env = process.env || {};

  let host = env.MYSQL_HOST;
  let port = env.MYSQL_PORT;
  let user = env.MYSQL_USER;
  let password = env.MYSQL_PASSWORD;
  let database = env.MYSQL_DATABASE;

  // If any core field missing, try parsing MYSQL_ADDON_URI (e.g., mysql://user:pass@host:3306/db)
  if ((!host || !user || !database) && env.MYSQL_ADDON_URI) {
    try {
      const uri = new URL(env.MYSQL_ADDON_URI);
      host = host || uri.hostname;
      port = port || uri.port;
      user = user || decodeURIComponent(uri.username);
      password = password || decodeURIComponent(uri.password);
      database = database || (uri.pathname ? uri.pathname.replace(/^\//, '') : undefined);
    } catch (e) {
      // ignore URI parse errors; we'll try individual vars next
    }
  }

  // Fallback to individual MYSQL_ADDON_* vars if still missing
  host = host || env.MYSQL_ADDON_HOST;
  port = port || env.MYSQL_ADDON_PORT;
  user = user || env.MYSQL_ADDON_USER;
  password = password || env.MYSQL_ADDON_PASSWORD;
  database = database || env.MYSQL_ADDON_DB;

  return {
    host: host || 'localhost',
    port: Number(port || 3306),
    user: user || 'root',
    password: password || '',
    database: database || 'pkm_demo',
    connectionLimit: 10,
    connectTimeout: Number(env.MYSQL_CONNECT_TIMEOUT_MS || 5000),
    // Better error handling
    waitForConnections: true,
    queueLimit: 0,
    // Keep the TCP connection alive across invocations to reduce latency
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000
  };
}

// ==================== INITIALIZATION ====================
async function init() {
  if (!mysqlEnabled()) {
    console.warn('⚠️  MySQL is disabled. Set MYSQL_ENABLED=1 to enable.');
    return null;
  }
  
  if (pool) return pool;

  try {
    const cfg = getConfig();
    pool = mysql.createPool(cfg);
    
    // Test connection
    const conn = await pool.getConnection();
    console.log('✅ MySQL connected successfully');
    conn.release();
    
    if ((process.env.SKIP_SCHEMA_INIT || '0').toLowerCase() !== '1') {
      await ensureSchema();
      console.log('✅ Database schema initialized');
    } else {
      console.log('⏭️  Skipping schema initialization (SKIP_SCHEMA_INIT=1)');
    }
    
    return pool;
  } catch (err) {
    console.error('❌ MySQL initialization failed:', err.message);
    pool = null;
    throw new Error(`MySQL init failed: ${err.message}`);
  }
}

async function ensureSchema() {
  if (!pool) throw new Error('Pool not initialized');
  
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS users (
      id INT PRIMARY KEY AUTO_INCREMENT,
      username VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'user',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_username (username)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);

    await pool.query(`CREATE TABLE IF NOT EXISTS items (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL,
      price DECIMAL(12,2) DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_name (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);

    await pool.query(`CREATE TABLE IF NOT EXISTS customers (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL,
      contact VARCHAR(255),
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_name (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);

    await pool.query(`CREATE TABLE IF NOT EXISTS students (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL,
      nis VARCHAR(50),
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_nis (nis),
      INDEX idx_name (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);
  } catch (err) {
    console.error('❌ Schema creation failed:', err.message);
    throw err;
  }
}

// ==================== HELPERS ====================
function assertMySQLEnabled() {
  if (!mysqlEnabled()) {
    throw new Error('MySQL is not enabled');
  }
}

async function getPool() {
  assertMySQLEnabled();
  if (!pool) await init();
  if (!pool) throw new Error('Failed to initialize MySQL pool');
  return pool;
}

function sanitizeInput(str, maxLength = 255) {
  if (!str) return '';
  return String(str).trim().substring(0, maxLength);
}

// ==================== USER OPERATIONS ====================
async function findUserByUsername(username) {
  try {
    const p = await getPool();
    const [rows] = await p.query(
      'SELECT * FROM users WHERE username = ? LIMIT 1',
      [sanitizeInput(username, 100)]
    );
    return rows[0] || null;
  } catch (err) {
    console.error('Error finding user:', err.message);
    throw new Error('Database error while finding user');
  }
}

async function getUserById(id) {
  try {
    const p = await getPool();
    const [rows] = await p.query(
      'SELECT * FROM users WHERE id = ? LIMIT 1',
      [Number(id)]
    );
    return rows[0] || null;
  } catch (err) {
    console.error('Error getting user by id:', err.message);
    throw new Error('Database error while getting user');
  }
}

async function createUser({ username, password, role }) {
  try {
    // Validation
    if (!username || username.length < 3) {
      throw new Error('Username must be at least 3 characters');
    }
    if (!password || password.length < 60) { // bcrypt hash length
      throw new Error('Password must be hashed');
    }
    if (!['user', 'admin'].includes(role)) {
      throw new Error('Invalid role');
    }

    const p = await getPool();
    const [res] = await p.query(
      'INSERT INTO users (username, password, role, createdAt) VALUES (?, ?, ?, NOW())',
      [sanitizeInput(username, 100), password, role]
    );
    
    return {
      id: res.insertId,
      username: sanitizeInput(username, 100),
      role
    };
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      throw new Error('Username already exists');
    }
    console.error('Error creating user:', err.message);
    throw new Error(err.message || 'Database error while creating user');
  }
}

async function listUsers() {
  try {
    const p = await getPool();
    const [rows] = await p.query(
      'SELECT id, username, role, createdAt FROM users ORDER BY id'
    );
    return rows;
  } catch (err) {
    console.error('Error listing users:', err.message);
    throw new Error('Database error while listing users');
  }
}

async function updateUser(id, { password, role }) {
  try {
    const p = await getPool();
    const updates = [];
    const params = [];

    if (password) {
      updates.push('password = ?');
      params.push(password);
    }
    if (role) {
      if (!['user', 'admin'].includes(role)) {
        throw new Error('Invalid role');
      }
      updates.push('role = ?');
      params.push(role);
    }

    if (updates.length === 0) {
      return await getUserById(id);
    }

    params.push(Number(id));
    await p.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    return await getUserById(id);
  } catch (err) {
    console.error('Error updating user:', err.message);
    throw new Error('Database error while updating user');
  }
}

async function deleteUser(id) {
  try {
    const p = await getPool();
    const user = await getUserById(id);
    if (!user) return null;

    await p.query('DELETE FROM users WHERE id = ?', [Number(id)]);
    return { id: user.id, username: user.username };
  } catch (err) {
    console.error('Error deleting user:', err.message);
    throw new Error('Database error while deleting user');
  }
}

// ==================== COLLECTION OPERATIONS ====================
const COLLECTION_MAP = {
  items: {
    table: 'items',
    fields: ['name', 'price'],
    required: ['name']
  },
  customers: {
    table: 'customers',
    fields: ['name', 'contact'],
    required: ['name']
  },
  students: {
    table: 'students',
    fields: ['name', 'nis'],
    required: ['name']
  }
};

function validateCollection(col) {
  if (!COLLECTION_MAP[col]) {
    throw new Error('Invalid collection');
  }
  return COLLECTION_MAP[col];
}

async function listCollection(col) {
  try {
    const meta = validateCollection(col);
    const p = await getPool();
    const [rows] = await p.query(
      `SELECT * FROM \`${meta.table}\` ORDER BY id`
    );
    return rows;
  } catch (err) {
    console.error(`Error listing ${col}:`, err.message);
    throw new Error(`Database error while listing ${col}`);
  }
}

async function searchCollection(col, q) {
  try {
    const meta = validateCollection(col);
    const p = await getPool();
    const term = `%${sanitizeInput(q, 100)}%`;
    let where = '';
    let params = [];
    if (col === 'items') {
      // Search by name
      where = 'WHERE `name` LIKE ?';
      params = [term];
    } else if (col === 'customers') {
      // Search by name or contact
      where = 'WHERE `name` LIKE ? OR `contact` LIKE ?';
      params = [term, term];
    } else if (col === 'students') {
      // Search by name or nis
      where = 'WHERE `name` LIKE ? OR `nis` LIKE ?';
      params = [term, term];
    }
    const [rows] = await p.query(
      `SELECT * FROM \`${meta.table}\` ${where} ORDER BY id`,
      params
    );
    return rows;
  } catch (err) {
    console.error(`Error searching ${col}:`, err.message);
    throw new Error(`Database error while searching ${col}`);
  }
}

async function createCollectionItem(col, payload) {
  try {
    const meta = validateCollection(col);
    
    // Validate required fields
    for (const req of meta.required) {
      if (!payload[req]) {
        throw new Error(`Field '${req}' is required`);
      }
    }

    const p = await getPool();
    const fields = meta.fields.filter(f => payload[f] !== undefined);
    const values = fields.map(f => payload[f]);
    
    const fieldList = fields.join(', ');
    const placeholders = fields.map(() => '?').join(', ');
    
    const sql = `INSERT INTO \`${meta.table}\` (${fieldList}, createdAt) VALUES (${placeholders}, NOW())`;
    const [res] = await p.query(sql, values);
    
    const [rows] = await p.query(
      `SELECT * FROM \`${meta.table}\` WHERE id = ? LIMIT 1`,
      [res.insertId]
    );
    return rows[0];
  } catch (err) {
    console.error(`Error creating ${col}:`, err.message);
    throw new Error(err.message || `Database error while creating ${col}`);
  }
}

async function updateCollectionItem(col, id, payload) {
  try {
    const meta = validateCollection(col);
    const p = await getPool();
    
    const fields = meta.fields.filter(f => payload[f] !== undefined);
    if (fields.length === 0) {
      const [rows] = await p.query(
        `SELECT * FROM \`${meta.table}\` WHERE id = ? LIMIT 1`,
        [Number(id)]
      );
      return rows[0] || null;
    }
    
    const sets = fields.map(f => `\`${f}\` = ?`).join(', ');
    const params = fields.map(f => payload[f]);
    params.push(Number(id));
    
    const sql = `UPDATE \`${meta.table}\` SET ${sets}, updatedAt = NOW() WHERE id = ?`;
    await p.query(sql, params);
    
    const [rows] = await p.query(
      `SELECT * FROM \`${meta.table}\` WHERE id = ? LIMIT 1`,
      [Number(id)]
    );
    return rows[0] || null;
  } catch (err) {
    console.error(`Error updating ${col}:`, err.message);
    throw new Error(`Database error while updating ${col}`);
  }
}

async function deleteCollectionItem(col, id) {
  try {
    const meta = validateCollection(col);
    const p = await getPool();
    
    const [rows] = await p.query(
      `SELECT * FROM \`${meta.table}\` WHERE id = ? LIMIT 1`,
      [Number(id)]
    );
    if (!rows || rows.length === 0) return null;
    
    await p.query(`DELETE FROM \`${meta.table}\` WHERE id = ?`, [Number(id)]);
    return rows[0];
  } catch (err) {
    console.error(`Error deleting ${col}:`, err.message);
    throw new Error(`Database error while deleting ${col}`);
  }
}

// ==================== REPORTS ====================
async function reportSummary() {
  try {
    const p = await getPool();
    const [[{ usersCount }]] = await p.query('SELECT COUNT(*) AS usersCount FROM users');
    const [[{ itemsCount }]] = await p.query('SELECT COUNT(*) AS itemsCount FROM items');
    const [[{ customersCount }]] = await p.query('SELECT COUNT(*) AS customersCount FROM customers');
    const [[{ studentsCount }]] = await p.query('SELECT COUNT(*) AS studentsCount FROM students');
    
    return { usersCount, itemsCount, customersCount, studentsCount };
  } catch (err) {
    console.error('Error getting report summary:', err.message);
    throw new Error('Database error while getting report summary');
  }
}

// ==================== EXPORTS ====================
module.exports = {
  mysqlEnabled,
  init,
  
  // User operations
  findUserByUsername,
  getUserById,
  createUser,
  listUsers,
  updateUser,
  deleteUser,
  
  // Collection operations
  listCollection,
  searchCollection,
  createCollectionItem,
  updateCollectionItem,
  deleteCollectionItem,
  
  // Reports
  reportSummary
};