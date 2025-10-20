const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const mysql = require('../lib/mysql');

router.get('/admin', requireAuth, async (req, res) => {
  const user = await mysql.getUserById(req.user.id);
  if (!user || user.role !== 'admin') return res.status(403).type('html').send('<p>Forbidden</p>');
  res.type('html').send(`
    <!doctype html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Admin - PKM Prototype</title>
      <style>
        body{font-family:Arial,Helvetica,sans-serif;max-width:900px;margin:20px auto;padding:10px}
        section{margin-bottom:24px}
        table{border-collapse:collapse;width:100%}
        th,td{border:1px solid #ddd;padding:8px}
        th{background:#f4f4f4}
        .topbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
        .btn{background:#6b7280;color:#fff;padding:6px 10px;border-radius:6px;text-decoration:none;border:none;cursor:pointer}
        .btn:hover{background:#4b5563}
      </style>
    </head>
    <body>
      <div class="topbar">
        <div>
          <h1 style="margin:0">Admin Panel</h1>
          <p style="margin:4px 0 0 0">Logged in as <strong>${user.username}</strong> — <a href="/logout">Sign out</a></p>
        </div>
        <div>
          <a class="btn" href="/menu">Back to Menu</a>
        </div>
      </div>

      <section id="users">
        <h2>Users</h2>
        <form id="userForm">
          <input name="username" placeholder="username" required />
          <input name="password" placeholder="password" required />
          <select name="role"><option value="user">user</option><option value="admin">admin</option></select>
          <button type="submit">Create user</button>
        </form>
        <div id="userMsg"></div>
        <table id="usersTable"><thead><tr><th>ID</th><th>Username</th><th>Role</th><th>Actions</th></tr></thead><tbody></tbody></table>
      </section>

      <section id="items">
        <h2>Items</h2>
        <form id="itemForm">
          <input name="name" placeholder="name" required />
          <input name="price" placeholder="price" type="number" required />
          <button type="submit">Create item</button>
        </form>
        <div id="itemMsg"></div>
        <table id="itemsTable"><thead><tr><th>ID</th><th>Name</th><th>Price</th><th>Actions</th></tr></thead><tbody></tbody></table>
      </section>

      <section id="customers">
        <h2>Customers</h2>
        <form id="customerForm">
          <input name="name" placeholder="name" required />
          <input name="contact" placeholder="contact (optional)" />
          <button type="submit">Create customer</button>
        </form>
        <div id="customerMsg"></div>
        <table id="customersTable"><thead><tr><th>ID</th><th>Name</th><th>Contact</th><th>Actions</th></tr></thead><tbody></tbody></table>
      </section>

      <section id="students">
        <h2>Students</h2>
        <form id="studentForm">
          <input name="name" placeholder="name" required />
          <input name="nis" placeholder="NIS (optional)" />
          <button type="submit">Create student</button>
        </form>
        <div id="studentMsg"></div>
        <table id="studentsTable"><thead><tr><th>ID</th><th>Name</th><th>NIS</th><th>Actions</th></tr></thead><tbody></tbody></table>
      </section>

      <script>
        async function loadUsers(){
          const res = await fetch('/api/users');
          if (!res.ok) return document.getElementById('userMsg').innerText = 'Failed to load users';
          const data = await res.json();
          const users = Array.isArray(data) ? data : (Array.isArray(data.users) ? data.users : []);
          const tbody = document.querySelector('#usersTable tbody'); tbody.innerHTML='';
          users.forEach(u=>{
            const tr = document.createElement('tr');
            tr.innerHTML = '<td>'+u.id+'</td><td>'+u.username+'</td><td>'+u.role+'</td><td><button data-id="'+u.id+'" class="delUser">Delete</button></td>';
            tbody.appendChild(tr);
          });
        }
        async function loadItems(){
          const res = await fetch('/api/master/items');
          if (!res.ok) return document.getElementById('itemMsg').innerText = 'Failed to load items';
          const items = await res.json();
          const tbody = document.querySelector('#itemsTable tbody'); tbody.innerHTML='';
          items.forEach(it=>{
            const tr = document.createElement('tr');
            tr.innerHTML = '<td>'+it.id+'</td><td>'+(it.name||'')+'</td><td>'+(it.price||'')+'</td><td><button data-id="'+it.id+'" class="delItem">Delete</button></td>';
            tbody.appendChild(tr);
          });
        }

        async function loadCustomers(){
          const res = await fetch('/api/master/customers');
          if (!res.ok) return document.getElementById('customerMsg').innerText = 'Failed to load customers';
          const rows = await res.json();
          const tbody = document.querySelector('#customersTable tbody'); tbody.innerHTML='';
          rows.forEach(c=>{
            const tr = document.createElement('tr');
            tr.innerHTML = '<td>'+c.id+'</td><td>'+(c.name||'')+'</td><td>'+(c.contact||'-')+'</td><td><button data-id="'+c.id+'" class="delCustomer">Delete</button></td>';
            tbody.appendChild(tr);
          });
        }

        async function loadStudents(){
          const res = await fetch('/api/master/students');
          if (!res.ok) return document.getElementById('studentMsg').innerText = 'Failed to load students';
          const rows = await res.json();
          const tbody = document.querySelector('#studentsTable tbody'); tbody.innerHTML='';
          rows.forEach(s=>{
            const tr = document.createElement('tr');
            tr.innerHTML = '<td>'+s.id+'</td><td>'+(s.name||'')+'</td><td>'+(s.nis||'-')+'</td><td><button data-id="'+s.id+'" class="delStudent">Delete</button></td>';
            tbody.appendChild(tr);
          });
        }

        document.getElementById('userForm').addEventListener('submit', async e=>{
          e.preventDefault();
          const fd = new FormData(e.target);
          const body = { username: fd.get('username'), password: fd.get('password'), role: fd.get('role') };
          const res = await fetch('/register', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
          const txt = document.getElementById('userMsg');
          if (!res.ok) { txt.innerText = 'Create user failed'; return; }
          txt.innerText = 'User created'; e.target.reset(); loadUsers();
        });

        document.getElementById('itemForm').addEventListener('submit', async e=>{
          e.preventDefault();
          const fd = new FormData(e.target);
          const body = { name: fd.get('name'), price: Number(fd.get('price')) };
          const res = await fetch('/api/master/items', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
          const txt = document.getElementById('itemMsg');
          if (!res.ok) { txt.innerText = 'Create item failed'; return; }
          txt.innerText = 'Item created'; e.target.reset(); loadItems();
        });

        document.getElementById('customerForm').addEventListener('submit', async e=>{
          e.preventDefault();
          const fd = new FormData(e.target);
          const body = { name: fd.get('name'), contact: fd.get('contact') };
          const res = await fetch('/api/master/customers', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
          const txt = document.getElementById('customerMsg');
          if (!res.ok) { txt.innerText = 'Create customer failed'; return; }
          txt.innerText = 'Customer created'; e.target.reset(); loadCustomers();
        });

        document.getElementById('studentForm').addEventListener('submit', async e=>{
          e.preventDefault();
          const fd = new FormData(e.target);
          const body = { name: fd.get('name'), nis: fd.get('nis') };
          const res = await fetch('/api/master/students', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
          const txt = document.getElementById('studentMsg');
          if (!res.ok) { txt.innerText = 'Create student failed'; return; }
          txt.innerText = 'Student created'; e.target.reset(); loadStudents();
        });

        document.addEventListener('click', async e=>{
          if (e.target.classList.contains('delUser')){
            const id = e.target.dataset.id;
            if (!confirm('Delete user '+id+'?')) return;
            const res = await fetch('/api/users/'+id, { method:'DELETE' });
            if (res.ok) loadUsers();
          }
          if (e.target.classList.contains('delItem')){
            const id = e.target.dataset.id;
            if (!confirm('Delete item '+id+'?')) return;
            const res = await fetch('/api/master/items/'+id, { method:'DELETE' });
            if (res.ok) loadItems();
          }
          if (e.target.classList.contains('delCustomer')){
            const id = e.target.dataset.id;
            if (!confirm('Delete customer '+id+'?')) return;
            const res = await fetch('/api/master/customers/'+id, { method:'DELETE' });
            if (res.ok) loadCustomers();
          }
          if (e.target.classList.contains('delStudent')){
            const id = e.target.dataset.id;
            if (!confirm('Delete student '+id+'?')) return;
            const res = await fetch('/api/master/students/'+id, { method:'DELETE' });
            if (res.ok) loadStudents();
          }
        });

        // initial load
        loadUsers(); loadItems(); loadCustomers(); loadStudents();
      </script>
    </body>
    </html>
  `);
});

module.exports = router;
