const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const mysql = require('../lib/mysql');

// List students
router.get('/students', requireAuth, async (req, res) => {
  try {
    if (!mysql.mysqlEnabled()) {
      return res.redirect('/?error=' + encodeURIComponent('Database is not configured'));
    }
    const user = await mysql.getUserById(req.user.id);
    if (!user) return res.redirect('/?error=' + encodeURIComponent('Session expired'));

    const rows = await mysql.listCollection('students');
    const rowsHtml = (rows || []).map(r => `
      <tr>
        <td>${r.id}</td>
        <td>${r.name}</td>
        <td>${r.nis || '-'}</td>
        <td>
          <div style="display:flex;gap:8px">
            <a class="btn" href="/students/${r.id}/edit" style="background:#4f46e5;color:#fff;padding:6px 10px;border-radius:6px;text-decoration:none">Edit</a>
            <form method="post" action="/students/${r.id}/delete" onsubmit="return confirm('Delete this student?');">
              <button class="btn" type="submit" style="background:#ef4444;color:#fff;padding:6px 10px;border:none;border-radius:6px;cursor:pointer">Delete</button>
            </form>
          </div>
        </td>
      </tr>`).join('') || `<tr><td colspan="4" style="text-align:center;color:#6b7280;padding:16px">No students</td></tr>`;

    return res.type('html').send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Students - PKM</title>
<style>
 body{font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;max-width:960px;margin:32px auto;padding:0 16px;color:#1f2937}
 header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
 a.btn,button.btn{background:#4f46e5;color:#fff;padding:8px 12px;border-radius:8px;text-decoration:none;border:none;cursor:pointer}
 a.btn:hover,button.btn:hover{background:#4338ca}
 table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden}
 th,td{padding:10px;border-bottom:1px solid #e5e7eb} th{text-align:left;background:#f9fafb}
 .row-actions{display:flex;gap:8px}
 </style></head><body>
 <header>
  <div><h1>Students</h1><p>Welcome, <strong>${user.username}</strong> (${user.role})</p></div>
  <div>
    <a class="btn" href="/students/new">Add Student</a>
    <a class="btn" href="/menu" style="background:#6b7280">Back to Menu</a>
  </div>
 </header>
 <table><thead><tr><th style="width:80px">ID</th><th>Name</th><th style="width:180px">NIS</th><th style="width:220px">Actions</th></tr></thead>
 <tbody>${rowsHtml}</tbody>
 </table>
 </body></html>`);
  } catch (err) {
    console.error('Students list error:', err.message);
    return res.status(500).send('Failed to load students');
  }
});

// New student form
router.get('/students/new', requireAuth, async (req, res) => {
  try {
    const user = await mysql.getUserById(req.session.userId);
    if (!user) return res.redirect('/?error=' + encodeURIComponent('Session expired'));
    const form = (error, item) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${item ? 'Edit Student' : 'New Student'} - PKM</title>
    <style>body{font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;max-width:640px;margin:32px auto;padding:0 16px;color:#1f2937}
    a.btn,button.btn{background:#4f46e5;color:#fff;padding:8px 12px;border-radius:8px;text-decoration:none;border:none;cursor:pointer}
    a.btn:hover,button.btn:hover{background:#4338ca}
    form{display:flex;flex-direction:column;gap:12px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px}
    label{display:flex;flex-direction:column;gap:6px;font-size:14px} input{padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px}
    .error{background:#fee2e2;color:#991b1b;border:1px solid #fecaca;padding:10px 12px;border-radius:8px}
    .bar{display:flex;gap:8px;margin-bottom:12px}
    </style></head><body>
    <div class="bar"><a class="btn" href="/students" style="background:#6b7280">Back</a></div>
    <h1>${item ? 'Edit Student' : 'New Student'}</h1>
    <p>Welcome, <strong>${user.username}</strong> (${user.role})</p>
    ${error ? `<p class="error">${error}</p>` : ''}
    <form method="post" action="${item ? ('/students/'+item.id) : '/students'}">
      <label>Name<input name="name" value="${item ? (item.name||'') : ''}" required /></label>
      <label>NIS (optional)<input name="nis" value="${item ? (item.nis||'') : ''}" /></label>
      <button class="btn" type="submit">${item ? 'Update' : 'Create'}</button>
    </form>
    ${item ? `<form method="post" action="/students/${item.id}/delete" onsubmit="return confirm('Delete this student?');" style="margin-top:12px"><button class="btn" type="submit" style="background:#ef4444">Delete</button></form>` : ''}
    </body></html>`;
    return res.type('html').send(form(null, null));
  } catch (err) {
    console.error('Students new form error:', err.message);
    return res.status(500).send('Failed to open form');
  }
});

// Create student
router.post('/students', requireAuth, async (req, res) => {
  try {
    const { name, nis } = req.body || {};
    if (!name || String(name).trim().length === 0) {
      const user = await mysql.getUserById(req.user.id);
      const form = (error, item) => `<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><title>${item ? 'Edit Student' : 'New Student'} - PKM</title></head><body>${error ? `<p style='color:#991b1b'>${error}</p>` : ''}<form method='post' action='/students'><label>Name<input name='name' required /></label><label>NIS<input name='nis' /></label><button type='submit'>Create</button></form><p><a href='/students'>Back</a></p></body></html>`;
      return res.status(400).type('html').send(form('Student name is required', null));
    }
    await mysql.createCollectionItem('students', { name: String(name).trim(), nis: (nis || '').trim() || null });
    return res.redirect('/students');
  } catch (err) {
    console.error('Students create error:', err.message);
    const user = await mysql.getUserById(req.user.id).catch(() => null);
    const errHtml = `<!doctype html><html><body><p style='color:#991b1b'>${err.message || 'Failed to create student'}</p><p><a href='/students/new'>Back</a></p></body></html>`;
    return res.status(400).type('html').send(errHtml);
  }
});

// Edit form
router.get('/students/:id/edit', requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const user = await mysql.getUserById(req.user.id);
    if (!user) return res.redirect('/?error=' + encodeURIComponent('Session expired'));

    const rows = await mysql.listCollection('students');
    const item = rows.find(r => r.id === id) || null;
    if (!item) return res.status(404).send('Student not found');

    const form = (error, item) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Edit Student - PKM</title></head><body><h1>Edit Student</h1>${error ? `<p style='color:#991b1b'>${error}</p>` : ''}<form method='post' action='/students/${item.id}'><label>Name<input name='name' value='${item.name || ''}' required /></label><label>NIS<input name='nis' value='${item.nis || ''}' /></label><button type='submit'>Update</button></form><p><a href='/students'>Back</a></p></body></html>`;
    return res.type('html').send(form(null, item));
  } catch (err) {
    console.error('Students edit form error:', err.message);
    return res.status(500).send('Failed to open edit form');
  }
});

// Update student
router.post('/students/:id', requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, nis } = req.body || {};
    if (!name || String(name).trim().length === 0) {
      const user = await mysql.getUserById(req.user.id);
      const errHtml = `<!doctype html><html><body><p style='color:#991b1b'>Student name is required</p><p><a href='/students/${id}/edit'>Back</a></p></body></html>`;
      return res.status(400).type('html').send(errHtml);
    }
    const updated = await mysql.updateCollectionItem('students', id, { name: String(name).trim(), nis: (nis || '').trim() || null });
    if (!updated) return res.status(404).send('Student not found');
    return res.redirect('/students');
  } catch (err) {
    console.error('Students update error:', err.message);
    const user = await mysql.getUserById(req.user.id).catch(() => null);
    const errHtml = `<!doctype html><html><body><p style='color:#991b1b'>${err.message || 'Failed to update student'}</p><p><a href='/students/${req.params.id}/edit'>Back</a></p></body></html>`;
    return res.status(400).type('html').send(errHtml);
  }
});

// Delete student
router.post('/students/:id/delete', requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await mysql.deleteCollectionItem('students', id);
    return res.redirect('/students');
  } catch (err) {
    console.error('Students delete error:', err.message);
    return res.status(500).send('Failed to delete student');
  }
});

module.exports = router;
