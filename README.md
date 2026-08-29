# Tazkiyah — Daily Finance & Wealth OS

A privacy-first personal finance, daily expense tracking, and wealth management platform built from scratch.

## Monorepo Layout

- `apps/api`: FastAPI backend (Async SQLAlchemy 2 + PostgreSQL + Alembic + Gemini multimodal parser + WhatsApp webhook)
- `apps/web`: React 19 + Vite dashboard
- `apps/mobile`: React Native / Expo (SDK 54, expo-router) app — parity with the web dashboard

Managed with `pnpm` workspaces + `turbo`. From the repo root:

| Command | Runs |
|---|---|
| `pnpm run type-check` | `tsc --noEmit` for web + mobile |
| `pnpm run lint` | `eslint` (web + mobile) + `ruff check` (API) |
| `pnpm run test` | `pytest` for the API (129 tests) |
| `pnpm run build` | web (vite) + mobile (`expo export`) bundles |

> `pnpm run lint` / `pnpm run test` shell out to the API's Python venv. Its `activate`
> script has a **stale hardcoded path** — either recreate the venv, or run the tools
> directly: `apps/api/.venv/bin/ruff check .`, `apps/api/.venv/bin/python -m pytest`.
> `npx turbo run lint --filter='!@tazkiyah/api'` runs just the frontend eslint. CI
> creates a fresh venv and installs from `apps/api/requirements.lock`.

## Docs

- [`CONTEXT.md`](./CONTEXT.md): domain glossary — Household, Account, Envelope, Goal, …
- [`PROJECT.md`](./PROJECT.md): architecture, feature inventory, milestones, interface contracts
- [`COMPLETION_REPORT.md`](./COMPLETION_REPORT.md): what shipped, verification, roadmap
- [`docs/adr/`](./docs/adr/): architecture decision records

## Quick Start

### 1. Infrastructure — PostgreSQL (host port 5435) & Redis (6381)

```bash
docker compose up -d
```

This starts **only** the database and Redis. The API is run manually (next step).

### 2. API backend

```bash
cd apps/api
python -m venv .venv && source .venv/bin/activate    # first time only
pip install -r requirements.lock && pip install -e . --no-deps   # first time only
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

Port 8000 is the default; change `--port` if another local project is using it (and
set `VITE_API_PROXY_TARGET` for the web dev server — see step 4).

### 3. Seed demo data (optional but recommended)

```bash
cd apps/api
python -m scripts.seed_demo_data      # idempotent — safe to re-run
python -m scripts.verify_demo_data    # independent consistency check
```

The web dashboard also auto-bootstraps this demo household on first load.

### 4. Web dashboard

```bash
pnpm --filter @tazkiyah/web dev       # http://localhost:5173, proxies /api/v1 → :8000
# API on a non-default port? VITE_API_PROXY_TARGET=http://localhost:8010 pnpm --filter @tazkiyah/web dev
```

### 5. Mobile app

```bash
cd apps/mobile
cp .env.example .env.local            # set EXPO_PUBLIC_API_URL (LAN IP for a physical device)
npx expo start
```
