const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const mysql = require('../lib/mysql');

// List items
router.get('/items', requireAuth, async (req, res) => {
  try {
    if (!mysql.mysqlEnabled()) {
      return res.redirect('/?error=' + encodeURIComponent('Database is not configured'));
    }
    const user = await mysql.getUserById(req.session.userId);
    if (!user) return res.redirect('/?error=' + encodeURIComponent('Session expired'));

    const rows = await mysql.listCollection('items');
    const rowsHtml = (rows || []).map(r => `
      <tr>
        <td>${r.id}</td>
        <td>${r.name}</td>
        <td>${Number(r.price).toFixed(2)}</td>
        <td>
          <div style="display:flex;gap:8px">
            <a class="btn" href="/items/${r.id}/edit" style="background:#4f46e5;color:#fff;padding:6px 10px;border-radius:6px;text-decoration:none">Edit</a>
            <form method="post" action="/items/${r.id}/delete" onsubmit="return confirm('Delete this item?');">
              <button class="btn" type="submit" style="background:#ef4444;color:#fff;padding:6px 10px;border:none;border-radius:6px;cursor:pointer">Delete</button>
            </form>
          </div>
        </td>
      </tr>`).join('') || `<tr><td colspan="4" style="text-align:center;color:#6b7280;padding:16px">No items</td></tr>`;

    return res.type('html').send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Items - PKM</title>
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
  <div><h1>Items</h1><p>Welcome, <strong>${user.username}</strong> (${user.role})</p></div>
  <div>
    <a class="btn" href="/items/new">Add Item</a>
    <a class="btn" href="/menu" style="background:#6b7280">Back to Menu</a>
  </div>
 </header>
 <table><thead><tr><th style="width:80px">ID</th><th>Name</th><th style="width:140px">Price</th><th style="width:220px">Actions</th></tr></thead>
 <tbody>${rowsHtml}</tbody>
 </table>
 </body></html>`);
  } catch (err) {
    console.error('Items list error:', err.message);
    return res.status(500).send('Failed to load items');
  }
});

// New item form
router.get('/items/new', requireAuth, async (req, res) => {
  try {
    const user = await mysql.getUserById(req.session.userId);
    if (!user) return res.redirect('/?error=' + encodeURIComponent('Session expired'));
    const form = (error, item) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${item ? 'Edit Item' : 'New Item'} - PKM</title>
    <style>body{font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;max-width:640px;margin:32px auto;padding:0 16px;color:#1f2937}
    a.btn,button.btn{background:#4f46e5;color:#fff;padding:8px 12px;border-radius:8px;text-decoration:none;border:none;cursor:pointer}
    a.btn:hover,button.btn:hover{background:#4338ca}
    form{display:flex;flex-direction:column;gap:12px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px}
    label{display:flex;flex-direction:column;gap:6px;font-size:14px} input{padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px}
    .error{background:#fee2e2;color:#991b1b;border:1px solid #fecaca;padding:10px 12px;border-radius:8px}
    .bar{display:flex;gap:8px;margin-bottom:12px}
    </style></head><body>
    <div class="bar"><a class="btn" href="/items" style="background:#6b7280">Back</a></div>
    <h1>${item ? 'Edit Item' : 'New Item'}</h1>
    <p>Welcome, <strong>${user.username}</strong> (${user.role})</p>
    ${error ? `<p class="error">${error}</p>` : ''}
    <form method="post" action="${item ? ('/items/'+item.id) : '/items'}">
      <label>Name<input name="name" value="${item ? (item.name||'') : ''}" required /></label>
      <label>Price<input name="price" type="number" step="0.01" min="0" value="${item ? (item.price||'') : ''}" required /></label>
      <button class="btn" type="submit">${item ? 'Update' : 'Create'}</button>
    </form>
    ${item ? `<form method=\"post\" action=\"/items/${item.id}/delete\" onsubmit=\"return confirm('Delete this item?');\" style=\"margin-top:12px\"><button class=\"btn\" type=\"submit\" style=\"background:#ef4444\">Delete</button></form>` : ''}
    </body></html>`;
    return res.type('html').send(form(null, null));
  } catch (err) {
    console.error('Items new form error:', err.message);
    return res.status(500).send('Failed to open form');
  }
});

// Create item
router.post('/items', requireAuth, async (req, res) => {
  try {
    const { name, price } = req.body || {};
    const nameTrim = (name || '').trim();
    const priceNum = Number(price);
    if (!nameTrim) {
      const user = await mysql.getUserById(req.session.userId);
      const errHtml = `<!doctype html><html><body><p style='color:#991b1b'>Item name is required</p><p><a href='/items/new'>Back</a></p></body></html>`;
      return res.status(400).type('html').send(errHtml);
    }
    if (Number.isNaN(priceNum) || priceNum < 0) {
      const user = await mysql.getUserById(req.session.userId);
      const errHtml = `<!doctype html><html><body><p style='color:#991b1b'>Price must be a non-negative number</p><p><a href='/items/new'>Back</a></p></body></html>`;
      return res.status(400).type('html').send(errHtml);
    }
    await mysql.createCollectionItem('items', { name: nameTrim, price: priceNum });
    return res.redirect('/items');
  } catch (err) {
    console.error('Items create error:', err.message);
    const user = await mysql.getUserById(req.session.userId).catch(() => null);
    const errHtml = `<!doctype html><html><body><p style='color:#991b1b'>${err.message || 'Failed to create item'}</p><p><a href='/items/new'>Back</a></p></body></html>`;
    return res.status(400).type('html').send(errHtml);
  }
});

// Edit form
router.get('/items/:id/edit', requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const user = await mysql.getUserById(req.session.userId);
    if (!user) return res.redirect('/?error=' + encodeURIComponent('Session expired'));

    const rows = await mysql.listCollection('items');
    const item = rows.find(r => r.id === id) || null;
    if (!item) return res.status(404).send('Item not found');

    const form = (error, item) => `<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><title>Edit Item - PKM</title></head><body><h1>Edit Item</h1>${error ? `<p style='color:#991b1b'>${error}</p>` : ''}<form method='post' action='/items/${item.id}'><label>Name<input name='name' value='${item.name || ''}' required /></label><label>Price<input name='price' type='number' step='0.01' min='0' value='${item.price || ''}' required /></label><button type='submit'>Update</button></form><p><a href='/items'>Back</a></p></body></html>`;
    return res.type('html').send(form(null, item));
  } catch (err) {
    console.error('Items edit form error:', err.message);
    return res.status(500).send('Failed to open edit form');
  }
});

// Update item
router.post('/items/:id', requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, price } = req.body || {};
    const nameTrim = (name || '').trim();
    const priceNum = Number(price);
    if (!nameTrim) {
      const user = await mysql.getUserById(req.session.userId);
      const errHtml = `<!doctype html><html><body><p style='color:#991b1b'>Item name is required</p><p><a href='/items/${id}/edit'>Back</a></p></body></html>`;
      return res.status(400).type('html').send(errHtml);
    }
    if (Number.isNaN(priceNum) || priceNum < 0) {
      const user = await mysql.getUserById(req.session.userId);
      const errHtml = `<!doctype html><html><body><p style='color:#991b1b'>Price must be a non-negative number</p><p><a href='/items/${id}/edit'>Back</a></p></body></html>`;
      return res.status(400).type('html').send(errHtml);
    }
    const updated = await mysql.updateCollectionItem('items', id, { name: nameTrim, price: priceNum });
    if (!updated) return res.status(404).send('Item not found');
    return res.redirect('/items');
  } catch (err) {
    console.error('Items update error:', err.message);
    const user = await mysql.getUserById(req.session.userId).catch(() => null);
    const errHtml = `<!doctype html><html><body><p style='color:#991b1b'>${err.message || 'Failed to update item'}</p><p><a href='/items/${req.params.id}/edit'>Back</a></p></body></html>`;
    return res.status(400).type('html').send(errHtml);
  }
});

// Delete item
router.post('/items/:id/delete', requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await mysql.deleteCollectionItem('items', id);
    return res.redirect('/items');
  } catch (err) {
    console.error('Items delete error:', err.message);
    return res.status(500).send('Failed to delete item');
  }
});

module.exports = router;
