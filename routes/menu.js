const express = require('express');
const router = express.Router();
const { readDb } = require('../lib/db');
const { requireAuth } = require('../middleware/auth');
const mysql = require('../lib/mysql');

router.get('/menu', requireAuth, async (req, res) => {
  // fetch user using MySQL when enabled, otherwise JSON DB
  let u = null;
  if (mysql.mysqlEnabled()) {
    u = await mysql.getUserById(req.session.userId);
  } else {
    const { readDb } = require('../lib/db');
    const db = await readDb();
    u = (db.users || []).find(x => String(x.id) === String(req.session.userId)) || null;
  }
  const username = u ? u.username : 'unknown';
  const role = u ? u.role : 'guest';

  const menusByRole = {
    admin: [
      { id: 'master', title: 'Master Data', modules: ['items', 'customers', 'students'] },
      { id: 'report', title: 'Reports' },
      { id: 'profile', title: 'Profile' }
    ],
    user: [
      { id: 'report', title: 'Reports' },
      { id: 'profile', title: 'Profile' }
    ],
    guest: [ { id: 'profile', title: 'Profile' } ]
  };

  const menuList = menusByRole[role] || menusByRole['guest'];

  const accept = (req.headers && req.headers.accept) || '';
  const wantsHtml = accept.includes('text/html') || accept.includes('*/*');
  if (wantsHtml) {
    const itemsHtml = menuList.map(m => {
      const modules = m.modules ? `<small>Modules: ${m.modules.join(', ')}</small>` : '';
      return `<li><strong>${m.title}</strong> ${modules}</li>`;
    }).join('\n');
    return res.type('html').send(`
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Main Menu - PKM Prototype</title>
        <style>body{font-family:Arial,Helvetica,sans-serif;max-width:720px;margin:28px auto;padding:0 16px}ul{padding-left:18px}li{margin:8px 0}</style>
      </head>
      <body>
        <h1>Main Menu</h1>
        <p>Signed in as: <strong>${username}</strong> (<em>${role}</em>)</p>
        <h2>Available Menus</h2>
        <ul>
          ${itemsHtml}
        </ul>
        <p><a href="/logout">Sign out</a></p>
      </body>
      </html>
    `);
  }

  res.json({ username, role, menu: menuList, signout: '/logout' });
});

module.exports = router;
