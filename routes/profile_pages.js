const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const mysql = require('../lib/mysql');

router.get('/profile', requireAuth, async (req, res) => {
  try {
    if (!mysql.mysqlEnabled()) {
      return res.redirect('/?error=' + encodeURIComponent('Database is not configured'));
    }
    const user = await mysql.getUserById(req.session.userId);
    if (!user) return res.redirect('/?error=' + encodeURIComponent('Session expired'));
    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Profile - PKM</title>
  <style>
    body{font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;max-width:640px;margin:32px auto;padding:0 16px;color:#1f2937}
    a.btn{background:#4f46e5;color:#fff;padding:8px 12px;border-radius:8px;text-decoration:none}
    a.btn:hover{background:#4338ca}
    .card{background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px}
    .row{display:flex;gap:8px}
    .label{width:140px;color:#6b7280}
  </style>
</head>
<body>
  <h1>Profile</h1>
  <p>Welcome, <strong>${user.username}</strong> (${user.role})</p>

  <div class="card">
    <div class="row"><div class="label">Username</div><div>${user.username}</div></div>
    <div class="row"><div class="label">Role</div><div>${user.role}</div></div>
    <div class="row"><div class="label">Created At</div><div>${user.createdAt}</div></div>
  </div>

  <p style="margin-top:12px">
    <a class="btn" href="/menu" style="background:#6b7280">Back to Menu</a>
  </p>
</body>
</html>`;
    return res.type('html').send(html);
  } catch (err) {
    console.error('Profile load error:', err.message);
    return res.status(500).send('Failed to load profile');
  }
});

module.exports = router;
