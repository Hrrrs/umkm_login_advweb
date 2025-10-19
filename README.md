PKM Prototype Web App (Node.js + Express + MySQL)

Overview

This is a prototype web app for the PKM (Community Service) project. It provides:

- Login module (session-based) with server-side validation
- Main Menu with role-based links (admin/user)
- Master modules: CRUD for `items`, `customers`, `students` (MySQL)
- Reports page: summary, search/filter, print, and CSV export
- Inline HTML pages (no EJS required)

Quick start

1. Install dependencies

```powershell
cd c:\Users\User\Desktop\umkm_login_advweb
npm install
```

2. Configure MySQL (environment variables)

Set these before running. Example (PowerShell on Windows):

```powershell
$env:MYSQL_ENABLED = '1'
$env:MYSQL_HOST = '127.0.0.1'
$env:MYSQL_PORT = '3306'
$env:MYSQL_USER = 'root'
$env:MYSQL_PASSWORD = ''
$env:MYSQL_DATABASE = 'pkm_demo'
```

3. Run the server

```powershell
npm start
# or development with auto-reload (requires nodemon)
npm run dev
```

4. Open http://localhost:3000

Default admin user: `admin` / `admin` (you can reset with `scripts/reset_admin.js`)

User management

- Admin can create users via `POST /register` (send JSON `{ username, password, role }`)
- List users: `GET /api/users` (admin only)
- Update user: `PUT /api/users/:id` (admin only)
- Delete user: `DELETE /api/users/:id` (admin only)

Configuration (MySQL)

- Tables are auto-created at startup by `lib/mysql.js` (`ensureSchema()`).
- You do not need to ship an SQL file for a fresh setup.
- If you want to migrate existing local data, export/import a SQL dump manually.

API summary

- `POST /login` body `{ username, password }`
- `GET /logout`
- `GET /menu` (requires session)

Master CRUD (requires session):
- `GET /api/master/:col` — list (col = `items|customers|students`)
- `GET /api/master/:col?q=keyword` — list with search/filter
- `POST /api/master/:col` — create
- `PUT /api/master/:col/:id` — update
- `DELETE /api/master/:col/:id` — delete

Reports (requires session):
- `GET /reports` — summary cards, search UI, print
- `GET /api/report/summary`
- `GET /api/report/:type-csv` (e.g. `/api/report/items-csv`)

Notes

- This prototype uses MySQL with bcrypt-hashed passwords, sessions, and inline HTML (no EJS).
- Configure environment variables (do not commit secrets). See `.gitignore`.
- Use `curl.exe` on Windows PowerShell to avoid alias conflicts with `Invoke-WebRequest`.

Next steps (optional)

- Add more robust input validation (e.g., express-validator)
- Fine-grained authorization on master and report modules
- CI/CD and production logging/metrics
- Optional SPA frontend if needed

Deployment (hosting)

- Provision a managed MySQL database and set `MYSQL_*` env vars on the host.
- First run will auto-create tables. To migrate existing data, import your SQL dump.
- Ensure `MYSQL_HOST` is reachable from your app and MySQL port is secured.

