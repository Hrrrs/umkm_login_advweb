const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const mysql = require('../lib/mysql');

// Report summary page (SSR)
router.get('/reports', requireAuth, async (req, res) => {
  try {
    if (!mysql.mysqlEnabled()) {
      return res.redirect('/?error=' + encodeURIComponent('Database is not configured'));
    }
    const user = await mysql.getUserById(req.user.id);
    if (!user) return res.redirect('/?error=' + encodeURIComponent('Session expired'));

    const summary = await mysql.reportSummary();
    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Reports - PKM</title>
  <style>
    body{font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;max-width:900px;margin:32px auto;padding:0 16px;color:#1f2937}
    header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
    a.btn{background:#4f46e5;color:#fff;padding:8px 12px;border-radius:8px;text-decoration:none}
    a.btn:hover{background:#4338ca}
    .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}
    .card{background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px}
    .title{color:#6b7280;font-size:12px;text-transform:uppercase}
    .value{font-size:28px;font-weight:700}
    .exports{margin-top:16px}
    .exports a{margin-right:8px}
  </style>
</head>
<body>
  <header>
    <div>
      <h1>Report Summary</h1>
      <p>Welcome, <strong>${user.username}</strong> (${user.role})</p>
    </div>
    <div>
      <a class="btn" href="/menu" style="background:#6b7280">Back to Menu</a>
    </div>
  </header>

  <div class="cards">
    <div class="card"><div class="title">Users</div><div class="value">${summary.usersCount}</div></div>
    <div class="card"><div class="title">Items</div><div class="value">${summary.itemsCount}</div></div>
    <div class="card"><div class="title">Customers</div><div class="value">${summary.customersCount}</div></div>
    <div class="card"><div class="title">Students</div><div class="value">${summary.studentsCount}</div></div>
  </div>

  <div class="exports">
    <h3>Export CSV</h3>
    <a class="btn" href="/api/report/items-csv">Items CSV</a>
    <a class="btn" href="/api/report/customers-csv">Customers CSV</a>
    <a class="btn" href="/api/report/students-csv">Students CSV</a>
  </div>

  <hr style="margin:20px 0;border:none;border-top:1px solid #e5e7eb" />

  <section>
    <h2 style="margin-bottom:8px">Search Data</h2>
    <form id="searchForm" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px">
      <label>Type
        <select id="type" style="padding:8px;border:1px solid #cbd5e1;border-radius:8px">
          <option value="items">Items</option>
          <option value="customers">Customers</option>
          <option value="students">Students</option>
        </select>
      </label>
      <label>Keyword
        <input id="q" placeholder="Search keyword..." style="padding:8px 10px;border:1px solid #cbd5e1;border-radius:8px;min-width:220px" />
      </label>
      <button class="btn" type="submit">Search</button>
      <button class="btn" type="button" id="printBtn" style="background:#10b981">Print</button>
    </form>

    <div id="resultWrap">
      <table id="resultTable" style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
        <thead><tr id="theadRow"></tr></thead>
        <tbody id="tbody"></tbody>
      </table>
      <div id="empty" style="display:none;color:#6b7280;margin-top:8px">No results</div>
    </div>
  </section>

  <script>
    const form = document.getElementById('searchForm');
    const typeEl = document.getElementById('type');
    const qEl = document.getElementById('q');
    const theadRow = document.getElementById('theadRow');
    const tbody = document.getElementById('tbody');
    const empty = document.getElementById('empty');
    const printBtn = document.getElementById('printBtn');

    function renderTable(rows){
      tbody.innerHTML = '';
      theadRow.innerHTML = '';
      if (!rows || rows.length === 0){
        empty.style.display = 'block';
        return;
      }
      empty.style.display = 'none';
      const keys = Object.keys(rows[0]);
      for (const k of keys){
        const th = document.createElement('th');
        th.style.textAlign = 'left'; th.style.padding = '10px'; th.style.background = '#f9fafb'; th.style.borderBottom = '1px solid #e5e7eb';
        th.textContent = k;
        theadRow.appendChild(th);
      }
      for (const r of rows){
        const tr = document.createElement('tr');
        for (const k of keys){
          const td = document.createElement('td');
          td.style.padding = '10px'; td.style.borderBottom = '1px solid #e5e7eb';
          td.textContent = r[k] == null ? '' : r[k];
          tr.appendChild(td);
        }
        tbody.appendChild(tr);
      }
    }

    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const type = typeEl.value;
      const q = qEl.value || '';
      const url = q.trim().length ? ('/api/master/' + type + '?q=' + encodeURIComponent(q)) : ('/api/master/' + type);
      const res = await fetch(url);
      if (!res.ok){
        tbody.innerHTML = '';
        theadRow.innerHTML = '';
        empty.style.display = 'block';
        return;
      }
      const rows = await res.json();
      renderTable(rows);
    });

    printBtn.addEventListener('click', ()=>{
      window.print();
    });
  </script>
</body>
</html>`;
    return res.type('html').send(html);
  } catch (err) {
    console.error('Report summary error:', err.message);
    return res.status(500).send('Failed to load report summary');
  }
});

module.exports = router;
