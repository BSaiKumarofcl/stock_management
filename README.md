# StockFlow MVP v0.1

Minimal multi-tenant SaaS inventory app (React + FastAPI + SQLAlchemy). Implements the 6-hour MVP PRD:
signup/login with an organization, product CRUD, quick stock adjustments, a dashboard with low-stock items, and a default low-stock threshold setting.

## Stack
- **Backend:** FastAPI, SQLAlchemy 2, JWT (PyJWT) + bcrypt. SQLite by default, PostgreSQL supported.
- **Frontend:** React 18, React Router, Vite (plain CSS).
- **Tests:** pytest (auth, CRUD, low-stock logic, stock adjustments, tenant isolation).

## Run locally (no Docker)

**Backend** (http://localhost:8000, docs at /docs)
```bash
cd backend
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend** (http://localhost:5173) — in a second terminal
```bash
cd frontend
npm install
npm run dev
```
Vite proxies `/api` to the backend. Open http://localhost:5173 and sign up.

## Run with Docker (PostgreSQL)
```bash
docker compose up --build
```
Open http://localhost:8080. Set `SECRET_KEY` in your environment for anything beyond a demo.

## Tests
```bash
cd backend && pytest
```

## Features (PRD mapping)
| PRD | Implementation |
|-----|----------------|
| FR-1 Signup/Login | `POST /api/auth/signup`, `/login`; email + password + organization name; bcrypt hashing; JWT |
| FR-2 Org context | Every query filtered by the user's `organization_id`; other orgs' records return 404 |
| FR-3/4 Product CRUD | `/api/products`; SKU unique per org (409 on duplicate); confirm dialog on delete (hard delete) |
| FR-5 Stock updates | Edit form + inline "± Stock" modal with note; negative stock rejected; `last_updated_by` stored |
| FR-6 Dashboard | Total products, total units, low-stock table (stock strictly below the effective threshold) |
| FR-7 Settings | Default low-stock threshold (used when a product has none) |

Search by name/SKU is a backend `ilike` query (debounced in the UI).

## API summary
```
POST /api/auth/signup | /api/auth/login      GET /api/auth/me
GET/POST /api/products                       GET/PUT/DELETE /api/products/{id}
POST /api/products/{id}/adjust               GET /api/dashboard
GET/PUT /api/settings                        GET /api/health
```

## Project layout
```
backend/app/      config, database, models, schemas, security, deps, routers/
backend/tests/    pytest suite
frontend/src/     api.js, auth.jsx, App.jsx, components/, pages/, styles.css
docker-compose.yml
```

## Next steps (out of MVP scope)
Immutable stock-movement ledger, audit log, CSV import/export, low-stock email alerts, roles/invites, Alembic migrations, password reset.
