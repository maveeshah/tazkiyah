# BRIEFING — 2026-08-22T15:20:00Z

## Mission
Conduct a thorough, read-only survey of backend services, models, API routes, schemas, calculation algorithms, and seed scripts in `apps/api` for the Tazkiyah personal finance platform.

## 🔒 My Identity
- Archetype: teamwork_preview_spec_miner
- Roles: Specification Miner, Backend Surveyor
- Working directory: /home/mavee/tazkiyah/.agents/spec_miner_backend_survey_1
- Original parent: 39560258-203d-400a-9860-b8fa3cd3d4a7
- Milestone: Backend Specification & Inventory Survey

## 🔒 Key Constraints
- Read-only investigation: probe and document, do NOT implement or alter application code.
- Thoroughly inventory all models, endpoints, schemas, formulas, relationships, and seed data.
- Check compliance with R1-R6 from ORIGINAL_REQUEST.md.

## Current Parent
- Conversation ID: 39560258-203d-400a-9860-b8fa3cd3d4a7
- Updated: 2026-08-22T15:20:00Z

## Task Summary
- **What to build**: Comprehensive backend survey and specification report (`handoff.md`).
- **Success criteria**: Full catalog of backend endpoints, models, business logic formulas (CPI, runway, zero-based balance), seed data requirements, and gaps against R1-R6.
- **Interface contracts**: `/home/mavee/tazkiyah/ORIGINAL_REQUEST.md`

## Key Decisions Made
- Fully documented all 8 data models (`Household`, `User`, `Account`, `EnvelopeGroup`, `Envelope`, `CanonicalItem`, `PriceHistory`, `Transaction`, `LineItem`, `Goal`).
- Documented all 14 API endpoints across `/api/v1` (Health, Households, Accounts, Envelopes, Transactions, CPI, Goals, Webhook).
- Formulated exact mathematical equations for ZBB invariants, Goal monthly pacing, and CPI staple inflation rate.
- Highlighted query param requirements on `/api/v1/envelopes/assign?household_id=...` and `/api/v1/envelopes/rebalance?household_id=...`.
- Identified that `seed_demo_data.py` needs to be created to populate multi-month data for R1-R6.

## Artifact Index
- `/home/mavee/tazkiyah/.agents/spec_miner_backend_survey_1/DISPATCH.md` — Dispatch record
- `/home/mavee/tazkiyah/.agents/spec_miner_backend_survey_1/BRIEFING.md` — Situational awareness
- `/home/mavee/tazkiyah/.agents/spec_miner_backend_survey_1/progress.md` — Progress tracker
- `/home/mavee/tazkiyah/.agents/spec_miner_backend_survey_1/handoff.md` — Detailed handoff report
