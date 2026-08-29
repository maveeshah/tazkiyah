# Tazkiyah Test Infrastructure Specification

## 1. Test Philosophy & Principles
Tazkiyah (Daily Finance & Wealth OS) employs a **requirement-driven, opaque-box testing methodology** across all software layers. The test architecture is structured to validate functional requirements against domain invariants, API contracts, and user workflows without coupling tests to implementation internals.

### Core Testing Tenets:
1. **Opaque-Box Verification**: Tests interact with the system strictly through exposed HTTP API endpoints (`/api/v1/*`), database service boundaries, and external client payloads.
2. **Mathematical Invariant Rigor**:
   - Zero-Based Budgeting (ZBB): $\text{Unassigned Cash} = \text{Total Liquid Inflow} - \text{Total Assigned Envelopes} = \text{PKR } 0.00$.
   - Account Solvency: $\text{Net Liquid Worth} = \sum_{\text{active}} \text{Account.current\_balance}$.
   - Envelope Balances: $\text{Available Balance} = \text{Assigned Amount} - \text{Spent Amount}$.
   - Personal CPI Inflation: $\text{MoM Inflation \%} = \frac{\text{Latest Price} - \text{Previous Price}}{\text{Previous Price}} \times 100$.
   - Goal Pacing: $\text{Monthly Pacing} = \frac{\max(0, \text{Target Amount} - \text{Current Balance})}{\text{Months Remaining}}$.
3. **Self-Contained & Isolated**: Each test provisions its own state, executes transactions within clean database boundaries, and cleans up deterministically.
4. **Adversarial & Boundary Verification**: Extensive coverage of zero balances, negative balances (overdrafts), overspent envelopes, fractional quantities (e.g. 1.250 kg), Unicode/special characters, and multi-channel intake sources.

---

## 2. Feature Inventory Mapping (R1 – R6)

| Req ID | Feature Area | Key Behaviors & Contracts | Test File Coverage |
|---|---|---|---|
| **R1** | **Zero-Based Budget Allocation Table** | ZBB summary calculations, envelope income assignment, unassigned cash ceiling enforcement, inter-envelope rebalancing, overspent detection, envelope group hierarchy | `test_tier1_features.py`<br>`test_tier2_boundaries.py`<br>`test_tier3_combinations.py`<br>`test_tier4_scenarios.py` |
| **R2** | **Granular Line-Item Transaction Ledger** | Multi-item receipt logging, automatic unit price calculation, transaction source tagging (`WHATSAPP`, `WEB`, `MOBILE`), chronological sorting, expandable receipt breakdowns | `test_tier1_features.py`<br>`test_tier2_boundaries.py`<br>`test_tier3_combinations.py`<br>`test_tier4_scenarios.py` |
| **R3** | **Personal CPI & Staple Inflation Visualizer** | Canonical staple resolution (synonyms: `aaloo`, `doodh`, `petrol`), automated price history recording, MoM % inflation rate calculation, multi-merchant price comparison | `test_tier1_features.py`<br>`test_tier2_boundaries.py`<br>`test_tier3_combinations.py`<br>`test_tier4_scenarios.py` |
| **R4** | **Financial Goals & Emergency Runway Tracker** | Goal creation (`TARGET_BY_DATE`, `TARGET_CAP`, `SINKING_FUND`), dynamic monthly pacing calculation, emergency runway ratio, visual progress percentage | `test_tier1_features.py`<br>`test_tier2_boundaries.py`<br>`test_tier3_combinations.py`<br>`test_tier4_scenarios.py` |
| **R5** | **Liquid Accounts & Wallets Summary** | Multi-type account management (`CASH`, `BANK`, `EMI`, `CREDIT`), net liquid worth sum, negative balance overdraft flagging (`is_overdrawn`), household isolation | `test_tier1_features.py`<br>`test_tier2_boundaries.py`<br>`test_tier3_combinations.py`<br>`test_tier4_scenarios.py` |
| **R6** | **Verification & Seed Data Readiness** | Health check API contract, household & user multi-tenant provisioning, database seeding verification, Pydantic schema validation | `test_tier1_features.py`<br>`test_tier2_boundaries.py`<br>`test_tier3_combinations.py`<br>`test_tier4_scenarios.py`<br>`test_e2e_requirements.py` |

---

## 3. Test Architecture & Runner Instructions

### Directory Structure
```
tazkiyah/
├── apps/
│   ├── api/
│   │   ├── tests/
│   │   │   ├── conftest.py                  # Pytest async database fixtures & test client
│   │   │   ├── test_tier1_features.py       # Tier 1: Feature Coverage (>=5 per R1-R6)
│   │   │   ├── test_tier2_boundaries.py     # Tier 2: Boundary & Corner Cases (>=5 per R1-R6)
│   │   │   ├── test_tier3_combinations.py   # Tier 3: Pairwise & Cross-Feature Interactions
│   │   │   ├── test_tier4_scenarios.py      # Tier 4: Real-World E2E Application Workflows
│   │   │   ├── test_e2e_requirements.py     # Master E2E runner & validation suite
│   │   │   ├── test_api.py                  # API endpoints smoke tests
│   │   │   ├── test_zbb.py                  # ZBB unit service tests
│   │   │   ├── test_ledger.py               # Ledger unit service tests
│   │   │   └── test_cpi.py                  # CPI unit service tests
```

### Execution Commands
- **Run all E2E tests**:
  ```bash
  cd apps/api && .venv/bin/pytest tests/test_tier1_features.py tests/test_tier2_boundaries.py tests/test_tier3_combinations.py tests/test_tier4_scenarios.py tests/test_e2e_requirements.py -v
  ```
- **Run by specific tier**:
  ```bash
  # Tier 1: Feature Coverage
  cd apps/api && .venv/bin/pytest tests/test_tier1_features.py -v

  # Tier 2: Boundary & Corner Cases
  cd apps/api && .venv/bin/pytest tests/test_tier2_boundaries.py -v

  # Tier 3: Cross-Feature Interactions
  cd apps/api && .venv/bin/pytest tests/test_tier3_combinations.py -v

  # Tier 4: Real-World Application Scenarios
  cd apps/api && .venv/bin/pytest tests/test_tier4_scenarios.py -v

  # Master E2E Suite
  cd apps/api && .venv/bin/pytest tests/test_e2e_requirements.py -v
  ```

---

## 4. Tier 1–4 Coverage Thresholds

| Tier | Category | Minimum Target | Implemented Count | Status |
|---|---|---|---|---|
| **Tier 1** | **Feature Coverage** | $\ge 5$ tests per feature (R1–R6) = 30 tests | 35 tests | **PASSED** |
| **Tier 2** | **Boundary & Corner Cases** | $\ge 5$ tests per feature (R1–R6) = 30 tests | 31 tests | **PASSED** |
| **Tier 3** | **Cross-Feature Interactions** | $\ge 10$ pairwise combinations | 10 tests | **PASSED** |
| **Tier 4** | **Real-World Scenarios** | $\ge 5$ full lifecycle user journeys | 5 comprehensive scenarios | **PASSED** |
| **Master** | **E2E Requirements Suite** | Master validation of R1–R6 contracts | 6 tests | **PASSED** |
| **Total** | **Comprehensive E2E Suite** | **$\ge 75$ tests** | **87 tests** | **EXCEEDED** |
