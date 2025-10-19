const express = require('express');
const session = require('express-session');
const { initDb } = require('./lib/db');
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
const mysql = require('./lib/mysql');

const PORT = process.env.PORT || 3000;

const app = express();
// parse JSON bodies
app.use(express.json());
// parse HTML form submissions (application/x-www-form-urlencoded)
app.use(express.urlencoded({ extended: true }));
// sessions with basic timeout
app.use(session({
        secret: 'pkm-prototype-secret',
        resave: false,
        saveUninitialized: false,
        cookie: {
                maxAge: 1000 * 60 * 30, // 30 minutes
                sameSite: 'lax'
        }
}));

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

// Initialize DB and start server
(async () => {
        try {
                await initDb();
                if (mysql.mysqlEnabled()) {
                    // Initialize MySQL in background so server startup isn't blocked by DB connectivity.
                    mysql.init()
                        .then(() => console.log('MySQL initialized'))
                        .catch(err => console.error('MySQL init failed (non-fatal):', err && err.message ? err.message : err));
                }
                app.listen(PORT, () => console.log(`PKM prototype running at http://localhost:${PORT}`));
        } catch (err) {
                console.error('Failed to initialize DB', err);
                process.exit(1);
        }
})();