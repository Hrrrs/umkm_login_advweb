PKM Prototype Web App (Node.js + Express + MySQL)

Overview

This is a prototype web app for the PKM (Community Service) project. It provides:

- Login module (JWT cookie-based) with server-side validation
- Main Menu with role-based links (admin/user)
- Master modules: CRUD for `items`, `customers`, `students` (MySQL)
- Reports page: summary, search/filter, print, and CSV export
- Inline HTML pages (no EJS required)

Quick start (local)

1) Install dependencies

```powershell
cd c:\Users\User\Desktop\umkm_login_advweb
npm install
```

2) Configure environment variables

Minimal local example (PowerShell):

```powershell
$env:MYSQL_ENABLED = '1'
$env:MYSQL_HOST = '127.0.0.1'
$env:MYSQL_PORT = '3306'
$env:MYSQL_USER = 'root'
$env:MYSQL_PASSWORD = ''
$env:MYSQL_DATABASE = 'pkm_demo'
$env:JWT_SECRET = 'dev-jwt-secret'  # replace with a strong secret in production
```

3) Run the server

```powershell
npm start            # runs Express locally (index.js)
# or development with auto-reload (requires nodemon)
npm run dev
```

4) Open http://localhost:3000

Default admin user: `admin` / `admin` (auto-created).

Authentication

- On successful `POST /login`, the server issues an HttpOnly cookie `auth` with a signed JWT.
- Use `GET /logout` to clear the cookie.
- Protected routes verify the JWT via middleware in `middleware/auth.js` and set `req.user`.

API summary

- `POST /login` body `{ username, password }`
- `GET /logout`
- `GET /menu` (requires JWT)

Master CRUD (requires JWT):
- `GET /api/master/:col` — list (col = `items|customers|students`)
- `GET /api/master/:col?q=keyword` — list with search/filter
- `POST /api/master/:col` — create
- `PUT /api/master/:col/:id` — update
- `DELETE /api/master/:col/:id` — delete

Reports (requires JWT):
- `GET /reports` — summary cards, search UI, print
- `GET /api/report/:type-csv` (e.g. `/api/report/items-csv`)

MySQL schema

- Tables are auto-created on first MySQL init by `lib/mysql.js` (`ensureSchema()`).
- To speed up serverless cold starts you may set `SKIP_SCHEMA_INIT=1` (tables must already exist).

Project structure

```
umkm_login_advweb/
├─ index.js                # main Express entry (listens on PORT)
├─ lib/
│  └─ mysql.js             # MySQL pool, schema and CRUD helpers
├─ middleware/
│  └─ auth.js              # JWT verification (sets req.user)
├─ routes/
│  ├─ auth.js              # /login, /logout, users admin APIs
│  ├─ admin.js             # Admin panel (users, items, customers, students)
│  ├─ menu.js              # /menu (uses JWT claims)
│  ├─ master.js            # REST for items/customers/students
│  ├─ items_pages.js       # Items pages
│  ├─ customers_pages.js   # Customers pages
│  ├─ students_pages.js    # Students pages
│  ├─ report.js            # Reports API
│  ├─ report_pages.js      # Reports page
│  └─ profile_pages.js     # Profile page
├─ scripts/
│  ├─ reset_admin.js       # optional utilities
│  ├─ mysql_migrate.js
│  └─ debug_login.js
├─ package.json            # start: node index.js
└─ README.md
```

Deployment (Railway)

This project runs as a standard Node/Express service.

- Install: `npm install`
- Start: `node index.js` (Railway sets `PORT` automatically)
- Environment variables (Railway → Variables):
  - `MYSQL_ENABLED=1`
  - Either `MYSQL_ADDON_URI=mysql://USER:PASS@HOST:3306/DB`
    or individual fields: `MYSQL_ADDON_HOST`, `MYSQL_ADDON_PORT`, `MYSQL_ADDON_USER`, `MYSQL_ADDON_PASSWORD`, `MYSQL_ADDON_DB`
  - `JWT_SECRET=<strong random secret>`
  - `NODE_ENV=production`
  - Recommended: `MYSQL_POOL_LIMIT=2`, `MYSQL_CONNECT_TIMEOUT_MS=5000`, `SKIP_SCHEMA_INIT=1`

Notes

- Inline HTML is used for simplicity; no EJS templates.
- Do not commit secrets. Use environment variables for credentials.
- Use `curl.exe` on Windows PowerShell to avoid alias conflicts with `Invoke-WebRequest`.

Admin panel

- Visit `/admin` (admin role required) to manage:
  - Users: create/delete
  - Items: create/delete
  - Customers: create/delete
  - Students: create/delete

