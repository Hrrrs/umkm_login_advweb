/*
Simple migration script: reads db.json and creates tables in MySQL, then inserts existing rows.
Configure via environment variables:
  MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE
Run: node mysql_migrate.js
*/
const fs = require('fs').promises;
const mysql = require('mysql2/promise');
const path = require('path');

const DB_PATH = path.join(__dirname, 'db.json');

async function migrate() {
  const cfg = {
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'pkm_demo'
  };

  const conn = await mysql.createConnection({
    host: cfg.host, port: cfg.port, user: cfg.user, password: cfg.password
  });

  // ensure database exists
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${cfg.database}\``);
  await conn.changeUser({ database: cfg.database });

  // read JSON DB
  const raw = await fs.readFile(DB_PATH, 'utf8');
  const db = JSON.parse(raw);

  // create tables
  await conn.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT PRIMARY KEY AUTO_INCREMENT,
      username VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'user',
      createdAt DATETIME
    ) ENGINE=InnoDB;
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS items (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(255),
      price DECIMAL(12,2),
      createdAt DATETIME,
      updatedAt DATETIME
    ) ENGINE=InnoDB;
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS customers (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(255),
      contact VARCHAR(255),
      createdAt DATETIME,
      updatedAt DATETIME
    ) ENGINE=InnoDB;
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS students (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(255),
      nis VARCHAR(50),
      createdAt DATETIME,
      updatedAt DATETIME
    ) ENGINE=InnoDB;
  `);

  // insert data
  if (Array.isArray(db.users)) {
    for (const u of db.users) {
      await conn.query(`INSERT IGNORE INTO users (username,password,role,createdAt) VALUES (?,?,?,?)`, [u.username, u.password, u.role || 'user', u.createdAt ? new Date(u.createdAt) : new Date()]);
    }
  }

  if (Array.isArray(db.items)) {
    for (const r of db.items) {
      await conn.query(`INSERT INTO items (name,price,createdAt,updatedAt) VALUES (?,?,?,?)`, [r.name || null, r.price || null, r.createdAt ? new Date(r.createdAt) : new Date(), r.updatedAt ? new Date(r.updatedAt) : null]);
    }
  }

  if (Array.isArray(db.customers)) {
    for (const r of db.customers) {
      await conn.query(`INSERT INTO customers (name,contact,createdAt,updatedAt) VALUES (?,?,?,?)`, [r.name || null, r.contact || null, r.createdAt ? new Date(r.createdAt) : new Date(), r.updatedAt ? new Date(r.updatedAt) : null]);
    }
  }

  if (Array.isArray(db.students)) {
    for (const r of db.students) {
      await conn.query(`INSERT INTO students (name,nis,createdAt,updatedAt) VALUES (?,?,?,?)`, [r.name || null, r.nis || null, r.createdAt ? new Date(r.createdAt) : new Date(), r.updatedAt ? new Date(r.updatedAt) : null]);
    }
  }

  console.log('Migration complete.');
  await conn.end();
}

migrate().catch(err => {
  console.error(err);
  process.exit(1);
});
