## 2026-08-22T15:15:36Z
You are a teamwork_preview_spec_miner.
Your working directory is: /home/mavee/tazkiyah/.agents/spec_miner_backend_survey_1
The project root is: /home/mavee/tazkiyah
The original user request is at: /home/mavee/tazkiyah/ORIGINAL_REQUEST.md
Parent conversation ID: 39560258-203d-400a-9860-b8fa3cd3d4a7

MISSION:
Conduct a thorough, read-only survey of the backend services, database models, API routes, schemas, calculations, and seed scripts in `apps/api` (and any related backend packages/scripts).

SCOPE & INVESTIGATION GOALS:
1. Read `/home/mavee/tazkiyah/ORIGINAL_REQUEST.md` carefully to understand the required features:
   - R1: Zero-Based Budget Allocation Table (Budgets, categories, envelope/zero-based allocations, actual spend, variances)
   - R2: Granular Line-Item Transaction Explorer (Transactions, line items, merchant, tax, splits, category breakdown, search/filter)
   - R3: Personal CPI & Staple Inflation Visualizer (Commodity/staple price tracking, personal consumption basket, inflation index, time-series)
   - R4: Financial Goals & Emergency Runway Tracker (Target amounts, current savings, monthly burn rate, runway in months, target dates, monthly contribution calculator)
   - R5: Liquid Accounts & Wallets Summary (Bank accounts, cash/wallets, credit cards, balances, liquidity status, currency)
   - R6: Verification & Seed Data script (`apps/api/scripts/seed_demo_data.py` or similar)
2. Explore existing backend implementation in `apps/api`:
   - Framework (FastAPI, SQLModel/SQLAlchemy, Pydantic, Alembic, etc.)
   - Existing database models, tables, relationships, migrations
   - Existing API routers, endpoints (GET/POST/PUT/DELETE), query parameters, response schemas
   - Existing business logic (e.g. CPI calculations, runway formulas, budget balance logic)
   - What backend endpoints already exist vs what might be missing or need seed data
   - How authentication/user context is handled (e.g. demo user ID, headers, sessions)
   - How the seed data script is set up or needs to be set up to populate realistic demo data for R1-R5.

DELIVERABLE:
Write a comprehensive report to `/home/mavee/tazkiyah/.agents/spec_miner_backend_survey_1/handoff.md` including:
- Complete inventory of backend models, endpoints, request/response schemas, and data types
- API contract definitions (URLs, HTTP methods, payloads, query params, responses)
- Data model relationships and calculation algorithms (e.g., inflation index formula, runway formula, zero-based budget balance)
- Status of seed script (`seed_demo_data.py`) and exact demo data requirements
- Any gaps between current backend APIs and frontend requirements (R1-R6)

Send a message when your handoff is written.
