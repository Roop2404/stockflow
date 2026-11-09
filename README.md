# StockFlow

StockFlow is a multi-tenant inventory management SaaS foundation.

## Phase 1 services

- PostgreSQL 17 via Docker Compose: `docker compose -f infrastructure/docker-compose.yml up -d db`
- Backend in `backend/`: Python 3.13, FastAPI, SQLAlchemy, Alembic.
- Frontend in `frontend/`: Next.js 15 App Router, TypeScript, Tailwind.

## Backend setup

From `backend/`, create/activate a virtual environment, install `requirements.txt`, then copy `.env.example` to `.env`. Replace the example JWT and BFF values with independent secrets generated from at least 32 cryptographically random bytes. The validators require canonical base64 values that decode to at least 32 varied bytes and reject placeholder values. Generate each value separately, for example:

```sh
python -c "import base64,secrets; print(base64.b64encode(secrets.token_bytes(48)).decode())"
```

Use one generated value for `JWT_SECRET_KEY` and a different generated value for `BFF_SHARED_SECRET`. Never commit secrets or reuse development secrets in production. Apply migrations with `alembic upgrade head`, then run `uvicorn app.main:app --reload`.

Migration `0002_auth` adds the owner name/status, single-owner constraint, and refresh-session table. It checks for null or duplicate organization membership before adding the constraint. It does not alter `0001_initial`.

## Frontend setup

From `frontend/`, run `npm install`, then copy `.env.example` to `.env.local`. Set `API_INTERNAL_URL` to the backend URL and use the same BFF secret as the backend. Generate a separate `CSRF_SECRET` using the command above. Frontend startup validates the CSRF and BFF secrets, the origin, and the cookie mode before accepting requests. These values are server-only; do not prefix them with `NEXT_PUBLIC_`.

In development, use `NODE_ENV=development` and an HTTP loopback origin such as `http://localhost:3000`; the app uses `stockflow_dev_*` cookies. For production, set `APP_ENV=production` for FastAPI and `NODE_ENV=production` for Next.js. Set `FRONTEND_URL` in the backend and `FRONTEND_ORIGIN` in the frontend to the same exact HTTPS origin, without a trailing slash, path, query, or fragment. Production rejects HTTP, localhost, and loopback origins. Production session cookies use only `__Host-stockflow_access` and `__Host-stockflow_refresh`, with Secure, HttpOnly, SameSite=Lax, Path=/, and no Domain attribute. Production CSRF cookies use `__Host-stockflow_csrf` with Secure, SameSite=Lax, Path=/, and no Domain attribute. Never reuse development secrets in production.

Run `npm run dev` for local HTTP development. For production, build and start Next.js with production secrets and HTTPS origin configured before startup; startup fails when required values are absent or invalid.

The browser calls only same-origin Next.js Route Handlers. In production, keep FastAPI authentication endpoints on a private network and allow only server-to-server BFF traffic. The BFF secret is an additional guard, not a substitute for private ingress.

## Authentication

Registration creates an organization, its owner, default settings, and initial refresh session in one database transaction. Passwords use Argon2id. Access JWTs last 15 minutes; rotating refresh families expire absolutely after 14 days. Each replacement inherits the initial family expiry. Logout and refresh-token reuse revoke the family.

Production cookies use the `__Host-stockflow_*` names, Secure, HttpOnly, SameSite=Lax, Path=/, and no Domain. Local HTTP uses separate `stockflow_dev_*` cookie names with Secure disabled only for development. Do not weaken production settings.

The frontend includes `/register` and `/login`; the protected workspace pages are described below.

## Phase 3 inventory

Authenticated inventory endpoints are available through the Next.js same-origin BFF under `/api/app/*`; FastAPI exposes organization-scoped routes under `/api/products`, `/api/dashboard/summary`, and `/api/organization/settings`. Product SKU uniqueness and numeric constraints are enforced by the existing PostgreSQL schema, so Phase 3 does not add a migration. Product and dashboard queries take the organization only from the authenticated database user.

The protected frontend includes the organization dashboard, product list/create/detail pages, inventory quantity updates, and the organization default low-stock setting. Products with no individual threshold use the organization default for dashboard low-stock calculations.
