# Tazkiyah — Completion Report

_Status as of 2026-08-29._

## What shipped

| Milestone | Scope | State |
|---|---|---|
| M1 | Backend demo seed script + verification | DONE (gate passed) |
| M2 | Web foundation, API client, UI primitives, Accounts summary (R5) | DONE (gate passed) |
| M3 | Zero-Based Budget table + envelope management (R1) | DONE (gate passed) |
| M4 | Granular line-item transaction explorer + receipt breakdown (R2) | DONE (gate passed) |
| M5 | Personal CPI visualizer (R3) + Goals & Emergency Runway (R4) | DONE (gate passed) |
| M6 | Monorepo type-check, production build, full E2E acceptance | DONE — see below |
| M7 | Native mobile app (Expo) at parity with web | DONE |
| M8 | Harden & close out (monorepo wiring, CI, seed/verify fixes) | DONE |
| M9 | Web parity, correctness & CRUD (post-audit) | DONE — see below |

## M9 — Web parity, correctness & CRUD (2026-08-29)

A three-part audit (backend / web / mobile) found the happy path had only been demoed
once. M9 fixed the correctness bugs, added full editing, and brought web to parity with
mobile on user/household management.

- **ZBB `unassigned_cash` was wrong** — computed as `inflow − assigned`, omitting
  `spent`, so the "Unassigned Cash" banner went negative ("Over Budget") after *any*
  real transaction. Now `inflow − assigned + spent`; the seed debits accounts through
  the transaction loop so it's internally consistent (opening 275k → 125k liquid,
  unassigned stays 0). Affected tests + `test_tier3_overdrawn…` reworked.
- **Web never showed the seed data** — `bootstrapHousehold()` `POST`ed a new empty
  household on every load instead of calling `GET /households/bootstrap`. Fixed; the
  web app now loads the demo household + user on first visit.
- **Full CRUD** — `GET/PATCH/DELETE` for transactions (reverse-then-reapply the account
  debit + envelope spend), accounts, envelopes, groups, goals; delete blocked (409)
  when transactions reference the entity. Backend + web + mobile UI. New
  `docs/adr/0005` (transaction delete/edit keeps price-history rows).
- **Web Users/household UI** — `context/UserContext.tsx` (localStorage), `features/users/*`
  (view + Add Member / Create Household / Login / Register modals), 6th nav tab,
  `<ErrorBoundary>`, hash routing. The ported `switchHousehold` / `logout` bugs were
  fixed while porting.
- **Other**: ledger input validation (reject `total ≤ 0`, line-item sum mismatch);
  WhatsApp zero-envelope crash → `{"status": "no_envelope"}`; rebalance rejects
  `from == to`; mobile Add Account + per-endpoint `.catch` in `useDashboardData`;
  `alembic/env.py` now imports models so `alembic check` works (confirms model↔migration
  in sync); ledger date filters relative to `new Date()`.
- **Cleanup**: deleted dead `packages/shared`, three orphan `test_empirical_m*.js`,
  added `public/favicon.svg`, an ESLint flat config + `lint` scripts (CI frontend job
  fixed to run eslint, not the API's ruff), `requirements.lock` (pip-compile).

## Verification (M6 / M8 / M9)

Run from the repo root. The `apps/api/.venv` `activate` script has a stale hardcoded
path — call venv tools directly (`apps/api/.venv/bin/python -m pytest`), don't `source`.

```
pnpm install
pnpm run type-check                              # 2 TS workspaces (web, mobile), 0 errors
npx turbo run lint --filter='!@tazkiyah/api'     # eslint (web + mobile) — 0 errors
cd apps/api && .venv/bin/ruff check .            # ruff (E9,F) — clean
cd apps/api && .venv/bin/python -m pytest -q     # 129 pytest tests — all green
cd apps/api && .venv/bin/python -m alembic check # model ↔ migration in sync
pnpm run build                                   # web (vite) + mobile (expo export)
cd apps/api && .venv/bin/python -m scripts.seed_demo_data && .venv/bin/python -m scripts.verify_demo_data
```

- **Backend:** 129 tests (was 113) — `test_tier1..4`, `test_e2e_requirements`,
  `test_crud.py` (11), plus service/smoke suites. CI installs from `requirements.lock`.
- **Web:** `pnpm --filter @tazkiyah/web build` → clean bundle; verified live against a
  seeded backend (bootstrap, ZBB banner, Users tab, all CRUD edit/delete flows).
- **Mobile:** `expo export --platform ios` bundles all routes; type-check + eslint clean.
- **CI:** `.github/workflows/ci.yml` — `frontend` (type-check, eslint, web build, mobile
  expo-doctor + bundle) and `backend` (ruff, `alembic upgrade` + `alembic check`, pytest
  against Postgres). Not yet exercised on a real push — no git remote.

## Architecture-review findings — current state

The earlier architecture review (`~/.claude/plans/vast-whistling-hamster.md`) is largely
addressed:

- **ZBB invariant enforced at write time** — `ZBBService.assign_envelope` rejects
  assignments beyond unassigned cash (`InvalidOperationError`). ✅
- **Service layer consistent** — `households`, `accounts`, `goals` routers now delegate
  to `HouseholdService` / `AccountService` / `GoalService`. ✅
- **Goal ↔ envelope link is live** — `GoalService.resolve_current_balance` reads a
  linked goal's balance from its envelope (ADR 0002). ✅
- **Overdraft / overspend allowed-and-flagged** — deliberate, codified in ADR 0001. ⚠️ by design
- **No route authorization / household scoping** — accepted for now (ADR 0004);
  addressed in the Phase 4 roadmap item below.

## Known limitations / accepted trade-offs

- **Auth is phone-number lookup only** — no passwords, tokens, or per-request
  authorization (ADR 0004). `GET /households` / `GET /users` still enumerate the DB.
  Addressed in Phase 4.
- **WhatsApp + Gemini intake is coded but dormant** — no credentials configured; the
  Gemini path also has a `SYSTEM_PROMPT.format()` bug (Phase 3). The regex-fallback
  parser works today via `/webhook/simulate` (mobile "Quick Text / AI").
- **CPI "MoM inflation"** is "latest price point vs previous point", not month-bucketed;
  emergency-runway burn rate is a name-heuristic. Own follow-up.
- **Mobile edit coverage** is delete-only for transactions/goals (long-press) + Add
  Account; full mobile edit modals are a follow-up (backend + web have complete CRUD).

## Roadmap

Plan: `~/.claude/plans/rippling-meandering-puffin.md` (M9) and
`~/.claude/plans/what-is-next-with-melodic-book.md` (Phases 3–4).

- **Phase 2 / M9 — Web parity, correctness & CRUD.** ✅ DONE (2026-08-29).
- **Phase 3 — Activate WhatsApp Business channel + Gemini intake.** NOT STARTED. Needs
  the user's Meta Cloud API + Gemini credentials. Fix `parser_service.py`
  `SYSTEM_PROMPT.format()`, wire image/audio webhook handling, `X-Hub-Signature-256`,
  webhook dedupe, `app/core/redis.py`, `apps/api/.env.example`.
- **Phase 4 — WhatsApp send-nonce OTP login + route authorization.** Zero-cost login
  (user sends a pre-filled `wa.me` message; server matches the nonce, issues a JWT),
  `get_current_user` dependency, household scoping, `DEMO_MODE` fallback keeping phone
  lookup for local/dev, gate `/webhook/simulate` + `POST /users/login`.
