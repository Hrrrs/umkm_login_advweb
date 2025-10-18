const express = require('express');
const session = require('express-session');
const path = require('path');
const { initDb } = require('./lib/db');
const authRoutes = require('./routes/auth');
const menuRoutes = require('./routes/menu');
const masterRoutes = require('./routes/master');
const reportRoutes = require('./routes/report');
const adminRoutes = require('./routes/admin');
const mysql = require('./lib/mysql');

const PORT = process.env.PORT || 3000;

const app = express();
// parse JSON bodies
app.use(express.json());
// parse HTML form submissions (application/x-www-form-urlencoded)
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: 'pkm-prototype-secret', resave: false, saveUninitialized: false }));

// Mount modular routes
app.use('/', authRoutes);
app.use('/', menuRoutes);
app.use('/', masterRoutes);
app.use('/', reportRoutes);
app.use('/', adminRoutes);

app.get('/', (req, res) => {
        res.type('html').send(`
<!doctype html>
<html>
<head>
    <meta charset="utf-8">
    <title>PKM Prototype - Login</title>
    <style>body{font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:40px auto;padding:0 16px}form{display:flex;flex-direction:column;gap:8px}input{padding:8px}button{padding:10px}</style>
</head>
<body>
    <h1>PKM Prototype</h1>
    <p class="note">Please login to access the main menu. Default (prototype): <strong>admin</strong> / <strong>admin</strong></p>
    <form method="post" action="/login">
        <label>Username
            <input name="username" required autofocus />
        </label>
        <label>Password
            <input name="password" type="password" required />
        </label>
        <button type="submit">Login</button>
    </form>
    <p class="note">After successful login you will be redirected to <code>/menu</code>.</p>
</body>
</html>
        `);
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