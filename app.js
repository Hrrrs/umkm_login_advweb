const express = require('express');
const cookieParser = require('cookie-parser');
const { initDb } = require('./lib/db');
const mysql = require('./lib/mysql');

// Routes
const authRoutes = require('./routes/auth');
const menuRoutes = require('./routes/menu');
const masterRoutes = require('./routes/master');
const reportRoutes = require('./routes/report');
const adminRoutes = require('./routes/admin');
const studentsPages = require('./routes/students_pages');
const customersPages = require('./routes/customers_pages');
const itemsPages = require('./routes/items_pages');
const reportPages = require('./routes/report_pages');
const profilePages = require('./routes/profile_pages');

const app = express();

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Ensure DB initialization on cold start/serverless
let initialized = false;
let initPromise = null;
async function ensureInit() {
  if (initialized) return;
  if (!initPromise) {
    initPromise = (async () => {
      try {
        // If MySQL is enabled, skip file DB init to avoid slow fs + hashing on serverless
        const withTimeout = (p, ms) => Promise.race([
          p,
          new Promise((_, rej) => setTimeout(() => rej(new Error('init timeout')), ms))
        ]);
        if (mysql.mysqlEnabled()) {
          await withTimeout(mysql.init(), Number(process.env.INIT_TIMEOUT_MS || 6000));
        } else {
          await withTimeout(initDb(), Number(process.env.INIT_TIMEOUT_MS || 6000));
        }
        initialized = true;
      } catch (err) {
        console.error('Initialization error:', err && err.message ? err.message : err);
        // Do not rethrow to avoid crashing cold start; let routes handle mysqlEnabled checks
        initialized = true; // prevent endless retries on every request
      }
    })();
  }
  return initPromise;
}

// Init gate for each request (no-op after first success)
app.use(async (req, res, next) => {
  try {
    await ensureInit();
  } catch (_) {}
  next();
});

// Mount modular routes
app.use('/', authRoutes);
app.use('/', menuRoutes);
app.use('/', masterRoutes);
app.use('/', reportRoutes);
app.use('/', adminRoutes);
app.use('/', studentsPages);
app.use('/', customersPages);
app.use('/', itemsPages);
app.use('/', reportPages);
app.use('/', profilePages);

// Very fast endpoints to reduce noise and help diagnose
app.get('/health', (req, res) => {
  return res.json({ ok: true, mysqlEnabled: mysql.mysqlEnabled() });
});

app.get('/favicon.ico', (req, res) => res.status(204).end());

// Root/Login page (kept here so app.js is self-contained)
app.get('/', (req, res) => {
  const error = req.query.error || null;
  const errorHtml = error ? `<div class="error">${error}</div>` : '';
  return res.type('html').send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>PKM Prototype - Login</title>
  <style>
    body{font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;max-width:520px;margin:48px auto;padding:0 16px;color:#1f2937}
    h1{font-size:24px;margin-bottom:6px}
    p.note{color:#6b7280;margin-bottom:16px}
    .error{background:#fee2e2;color:#991b1b;border:1px solid #fecaca;padding:10px 12px;border-radius:8px;margin-bottom:12px}
    form{display:flex;flex-direction:column;gap:10px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px}
    label{display:flex;flex-direction:column;gap:6px;font-size:14px}
    input{padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px}
    button{padding:10px 14px;border:none;border-radius:8px;background:#4f46e5;color:white;font-weight:600;cursor:pointer}
    button:hover{background:#4338ca}
  </style>
  </head>
  <body>
    <h1>PKM Prototype</h1>
    <p class="note">Default (prototype): <strong>admin</strong> / <strong>admin</strong></p>
    ${errorHtml}
    <form method="post" action="/login">
      <label>Username
        <input name="username" autocomplete="username" required autofocus />
      </label>
      <label>Password
        <input name="password" type="password" autocomplete="current-password" required />
      </label>
      <button type="submit">Login</button>
    </form>
    <p class="note">After successful login you will be redirected to <code>/menu</code>.</p>
  </body>
</html>`);
});

module.exports = app;
