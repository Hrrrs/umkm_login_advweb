PKM Prototype Backend (Node.js + JSON DB)

Overview

This is a small prototype backend for the PKM (Community Service) website. It provides:

- Login module (session-based)
- Main menu endpoint
- Master modules: CRUD for `items`, `customers`, `students`
- Report endpoints (summary and CSV export)
- Simple JSON file DB (db.json). MySQL can be added later.

Quick start

1. Install dependencies

```powershell
cd c:\Users\User\Desktop\umkm_login_advweb
npm install
```

2. Run the server

```powershell
npm start
# or for development with auto-reload
npm run dev
```

3. Open http://localhost:3000

Default admin user: `admin` / `admin` (created automatically on first run)

User management

- Admin can create users via POST /register (send JSON { username, password, role })
- List users: GET /api/users (admin only)
- Update user: PUT /api/users/:id (admin only)
- Delete user: DELETE /api/users/:id (admin only)

MySQL migration

1. Create a MySQL database and set environment variables:

```powershell
$env:MYSQL_HOST = '127.0.0.1'
$env:MYSQL_PORT = '3306'
$env:MYSQL_USER = 'root'
$env:MYSQL_PASSWORD = 'yourpassword'
$env:MYSQL_DATABASE = 'pkm_demo'
```

2. Run the migration script to create tables and copy existing JSON data:

```powershell
node mysql_migrate.js
```

After migration, you can switch handlers to use MySQL instead of the JSON file. The migration script creates tables with auto-increment primary keys.

API summary

- POST /login { username, password }
- GET /logout
- GET /menu (requires session)

Master CRUD (requires session):
- GET /api/master/:col  -- list (col = items|customers|students)
- POST /api/master/:col -- create
- PUT /api/master/:col/:id -- update
- DELETE /api/master/:col/:id -- delete

Reports (requires session):
- GET /api/report/summary
- GET /api/report/:type-csv (e.g. /api/report/items-csv)

Notes

- This is a prototype. Passwords are stored in plaintext in `db.json` for simplicity; use hashing and a proper DB for production.
- To switch to MySQL, add a DB layer and update the handlers.

Next steps (optional)

- Add input validation (Joi / express-validator)
- Add role-based permissions
- Replace JSON DB with MySQL and connection pooling
- Add a frontend (React/Vue) or simple server-side templates

