# Backend Survey & Specification Report

## 1. Observation

Direct examination of `apps/api` (FastAPI backend), `alembic` migrations, database models, schemas, routers, services, tests, and configuration files reveals the following:

### 1.1 Architecture & Stack Configuration
- **Framework**: FastAPI (>=0.115.0) with Pydantic v2 (>=2.10.0) (`apps/api/pyproject.toml:8,10`).
- **Database ORM**: SQLAlchemy 2.0 async engine (`apps/api/app/core/database.py:6-20`) using `asyncpg` for async runtime and `psycopg2-binary` for sync Alembic migrations.
- **Database Connection**: PostgreSQL 15 on port 5435 (`docker-compose.yml:11`, `apps/api/app/core/config.py:10-14`), database `tazkiyah_db`, user `postgres`, password `password`.
- **CORS**: `apps/api/app/main.py:14-20` configures `CORSMiddleware` with `allow_origins=["*"]`, `allow_credentials=True`, `allow_methods=["*"]`, `allow_headers=["*"]`.
- **API Prefix**: All API v1 routes are mounted under `/api/v1` (`apps/api/app/main.py:22`, `apps/api/app/api/v1/router.py:4-12`).

---

### 1.2 Data Models Inventory (`apps/api/app/models/`)
The database schema consists of 8 core tables with UUID primary keys and timestamp tracking (`TimestampMixin` in `app/models/base.py`):

1. **`Household` (`households`)** (`app/models/household.py:7-19`)
   - `id`: UUID (PK, default uuid4)
   - `name`: String(255), nullable=False
   - `base_currency`: String(3), default="PKR", nullable=False
   - `created_at`, `updated_at`: DateTime(timezone=True)
   - Relationships: `users`, `accounts`, `envelope_groups`, `canonical_items`, `transactions`, `goals` (all `cascade="all, delete-orphan"`).

2. **`User` (`users`)** (`app/models/household.py:20-30`)
   - `id`: UUID (PK)
   - `household_id`: UUID (FK -> `households.id`, ondelete="CASCADE", index=True)
   - `email`: String(255), unique=True, nullable=True, index=True
   - `phone_number`: String(30), unique=True, nullable=False, index=True
   - `full_name`: String(255), nullable=False
   - `role`: String(50), default="MEMBER", nullable=False
   - Relationship: `household` (many-to-1).

3. **`Account` (`accounts`)** (`app/models/account.py:14-29`)
   - `id`: UUID (PK)
   - `household_id`: UUID (FK -> `households.id`, ondelete="CASCADE", index=True)
   - `name`: String(100), nullable=False
   - `type`: Enum `AccountType` (`CASH`, `BANK`, `EMI`, `CREDIT`), default `AccountType.BANK`
   - `current_balance`: Numeric(15, 2), default=0.00, nullable=False
   - `is_active`: Boolean, default=True, nullable=False
   - Property `is_overdrawn`: `self.current_balance < 0`
   - Relationships: `household`, `transactions`.

4. **`EnvelopeGroup` (`envelope_groups`)** (`app/models/envelope.py:7-16`)
   - `id`: UUID (PK)
   - `household_id`: UUID (FK -> `households.id`, ondelete="CASCADE", index=True)
   - `name`: String(100), nullable=False
   - `sort_order`: Integer, default=0, nullable=False
   - Relationships: `household`, `envelopes` (cascade="all, delete-orphan").

5. **`Envelope` (`envelopes`)** (`app/models/envelope.py:17-33`)
   - `id`: UUID (PK)
   - `group_id`: UUID (FK -> `envelope_groups.id`, ondelete="CASCADE", index=True)
   - `name`: String(100), nullable=False
   - `assigned_amount`: Numeric(15, 2), default=0.00, nullable=False
   - `spent_amount`: Numeric(15, 2), default=0.00, nullable=False
   - `target_amount`: Numeric(15, 2), nullable=True
   - Property `available_balance`: `float(self.assigned_amount) - float(self.spent_amount)`
   - Relationships: `group`, `transactions`, `goal` (1-to-1).

6. **`CanonicalItem` (`canonical_items`)** (`app/models/canonical_item.py:9-24`)
   - `id`: UUID (PK)
   - `household_id`: UUID (FK -> `households.id`, ondelete="CASCADE", index=True)
   - `name`: String(100), nullable=False
   - `category`: String(100), default="General", nullable=False
   - `standard_unit`: String(30), default="piece", nullable=False
   - UniqueConstraint: `("household_id", "name", name="uq_household_canonical_item_name")`
   - Relationships: `household`, `price_history` (cascade="all, delete-orphan"), `line_items`.

7. **`PriceHistory` (`price_history`)** (`app/models/canonical_item.py:25-36`)
   - `id`: UUID (PK, default uuid4)
   - `canonical_item_id`: UUID (FK -> `canonical_items.id`, ondelete="CASCADE", index=True)
   - `unit_price`: Numeric(15, 2), nullable=False
   - `unit`: String(30), nullable=False
   - `merchant`: String(255), nullable=True
   - `recorded_at`: DateTime(timezone=True), default=utcnow, index=True
   - Relationship: `canonical_item`.

8. **`Transaction` (`transactions`)** (`app/models/transaction.py:14-30`)
   - `id`: UUID (PK)
   - `household_id`: UUID (FK -> `households.id`, ondelete="CASCADE", index=True)
   - `account_id`: UUID (FK -> `accounts.id`, ondelete="RESTRICT", index=True)
   - `envelope_id`: UUID (FK -> `envelopes.id`, ondelete="RESTRICT", index=True)
   - `total_amount`: Numeric(15, 2), nullable=False
   - `merchant`: String(255), nullable=True
   - `source`: Enum `TransactionSource` (`WHATSAPP`, `WEB`, `MOBILE`), default `WHATSAPP`
   - `raw_input`: Text, nullable=True
   - `transacted_at`: DateTime(timezone=True), default=utcnow, index=True
   - Relationships: `household`, `account`, `envelope`, `line_items` (cascade="all, delete-orphan").

9. **`LineItem` (`line_items`)** (`app/models/transaction.py:31-45`)
   - `id`: UUID (PK)
   - `transaction_id`: UUID (FK -> `transactions.id`, ondelete="CASCADE", index=True)
   - `canonical_item_id`: UUID (FK -> `canonical_items.id`, ondelete="SET NULL", nullable=True, index=True)
   - `raw_item_name`: String(255), nullable=False
   - `quantity`: Numeric(10, 3), default=1.000, nullable=False
   - `unit`: String(30), default="piece", nullable=False
   - `unit_price`: Numeric(15, 2), nullable=True
   - `total_price`: Numeric(15, 2), nullable=False
   - `notes`: Text, nullable=True
   - Relationships: `transaction`, `canonical_item`.

10. **`Goal` (`goals`)** (`app/models/goal.py:13-26`)
    - `id`: UUID (PK)
    - `household_id`: UUID (FK -> `households.id`, ondelete="CASCADE", index=True)
    - `envelope_id`: UUID (FK -> `envelopes.id`, ondelete="SET NULL", unique=True, nullable=True)
    - `name`: String(255), nullable=False
    - `goal_type`: Enum `GoalType` (`TARGET_BY_DATE`, `TARGET_CAP`, `SINKING_FUND`), default `TARGET_BY_DATE`
    - `target_amount`: Numeric(15, 2), nullable=False
    - `target_date`: Date, nullable=True
    - `current_balance`: Numeric(15, 2), default=0.00, nullable=False
    - Relationships: `household`, `envelope`.

---

### 1.3 Complete API Contract Definitions

| Category | HTTP Method | Route URL | Query / Path Params | Request Body Schema | Response Schema | Status Codes |
|---|---|---|---|---|---|---|
| **Health** | `GET` | `/api/v1/health` | None | None | `{"status": str, "service": str, "version": str}` | 200 |
| **Households** | `POST` | `/api/v1/households` | None | `HouseholdCreate` (`name: str`, `base_currency: str = "PKR"`) | `HouseholdResponse` (`id`, `name`, `base_currency`, `created_at`) | 200 |
| **Households** | `GET` | `/api/v1/households/{household_id}` | Path: `household_id: UUID` | None | `HouseholdResponse` | 200, 404 |
| **Households** | `POST` | `/api/v1/households/{household_id}/users` | Path: `household_id: UUID` | `UserCreate` (`phone_number`, `full_name`, `email?`, `role = "MEMBER"`) | `UserResponse` (`id`, `household_id`, `phone_number`, `full_name`, `email`, `role`, `created_at`) | 200 |
| **Accounts** | `POST` | `/api/v1/accounts` | None | `AccountCreate` (`household_id`, `name`, `type`, `current_balance`, `is_active`) | `AccountResponse` (`id`, `household_id`, `name`, `type`, `current_balance`, `is_active`, `is_overdrawn`, `created_at`) | 200 |
| **Accounts** | `GET` | `/api/v1/accounts/household/{household_id}` | Path: `household_id: UUID` | None | `List[AccountResponse]` | 200 |
| **Accounts** | `GET` | `/api/v1/accounts/{account_id}` | Path: `account_id: UUID`<br>Query: `household_id: UUID` | None | `AccountResponse` | 200, 404, 422 |
| **Envelopes** | `POST` | `/api/v1/envelopes/groups` | None | `EnvelopeGroupCreate` (`household_id`, `name`, `sort_order`) | `EnvelopeGroupResponse` (`id`, `household_id`, `name`, `sort_order`, `envelopes`, `created_at`) | 200 |
| **Envelopes** | `GET` | `/api/v1/envelopes/groups/household/{household_id}` | Path: `household_id: UUID` | None | `List[EnvelopeGroupResponse]` (with nested `envelopes`) | 200 |
| **Envelopes** | `POST` | `/api/v1/envelopes` | None | `EnvelopeCreate` (`group_id`, `name`, `target_amount?`) | `EnvelopeResponse` (`id`, `group_id`, `name`, `assigned_amount`, `spent_amount`, `target_amount`, `available_balance`, `created_at`) | 200 |
| **Envelopes** | `GET` | `/api/v1/envelopes/summary/{household_id}` | Path: `household_id: UUID` | None | `ZBBSummaryResponse` (`total_inflow`, `total_assigned`, `unassigned_cash`, `total_spent`, `overspent_envelopes_count`) | 200 |
| **Envelopes** | `POST` | `/api/v1/envelopes/assign` | Query: `household_id: UUID` | `EnvelopeAssign` (`envelope_id: UUID`, `assigned_amount: Decimal`) | `EnvelopeResponse` | 200, 400, 404 |
| **Envelopes** | `POST` | `/api/v1/envelopes/rebalance` | Query: `household_id: UUID` | `EnvelopeRebalance` (`from_envelope_id: UUID`, `to_envelope_id: UUID`, `amount: Decimal`) | `{"status": str, "message": str, "from_envelope": EnvelopeResponse, "to_envelope": EnvelopeResponse}` | 200, 400, 404 |
| **Envelopes** | `GET` | `/api/v1/envelopes/overspent/{household_id}` | Path: `household_id: UUID` | None | `List[EnvelopeResponse]` | 200 |
| **Transactions** | `POST` | `/api/v1/transactions` | None | `TransactionCreate` (`household_id`, `account_id`, `envelope_id`, `total_amount`, `merchant?`, `source`, `raw_input?`, `transacted_at?`, `line_items`) | `TransactionResponse` (with loaded `line_items`) | 200, 404 |
| **Transactions** | `GET` | `/api/v1/transactions/household/{household_id}` | Path: `household_id: UUID`<br>Query: `limit: int = 50` | None | `List[TransactionResponse]` | 200 |
| **CPI** | `GET` | `/api/v1/cpi/trends/{household_id}` | Path: `household_id: UUID` | None | `List[CPITrendItem]` (`canonical_item_id`, `name`, `category`, `standard_unit`, `latest_price`, `previous_price`, `inflation_rate_percentage`, `history: List[PricePointResponse]`) | 200 |
| **Goals** | `POST` | `/api/v1/goals` | None | `GoalCreate` (`household_id`, `envelope_id?`, `name`, `goal_type`, `target_amount`, `target_date?`, `current_balance`) | `GoalResponse` (`id`, `household_id`, `envelope_id`, `name`, `goal_type`, `target_amount`, `target_date`, `current_balance`, `monthly_pacing`, `created_at`) | 200 |
| **Goals** | `GET` | `/api/v1/goals/household/{household_id}` | Path: `household_id: UUID` | None | `List[GoalResponse]` (each including `monthly_pacing`) | 200 |
| **Webhook** | `GET` | `/api/v1/webhook/whatsapp` | Query: `hub.mode`, `hub.challenge`, `hub.verify_token` | None | Challenge string in plain text | 200, 403 |
| **Webhook** | `POST` | `/api/v1/webhook/whatsapp` | None | `WhatsAppWebhookPayload` | `{"status": "received"}` | 200 |
| **Webhook** | `POST` | `/api/v1/webhook/simulate` | None | `WebhookSimulateRequest` (`phone_number`, `message_type`, `content`, `media_url?`, `media_mime_type?`) | `{"simulation_result": Dict}` | 200 |

---

### 1.4 Business Logic & Calculation Formulas

1. **Zero-Based Budgeting (ZBB) Core Formulas (`app/services/zbb_service.py`)**:
   - **Total Inflow**: $\text{Total Inflow} = \sum_{\text{active accounts}} \text{current\_balance}$
   - **Total Assigned**: $\text{Total Assigned} = \sum_{\text{envelopes}} \text{assigned\_amount}$
   - **Total Spent**: $\text{Total Spent} = \sum_{\text{envelopes}} \text{spent\_amount}$
   - **Unassigned Cash**: $\text{Unassigned Cash} = \text{Total Inflow} - \text{Total Assigned}$
   - **Envelope Available Balance**: $\text{Available} = \text{assigned\_amount} - \text{spent\_amount}$
   - **Overspent Envelopes**: Envelopes where $\text{spent\_amount} > \text{assigned\_amount}$ (i.e. $\text{available\_balance} < 0$).
   - **Assign Envelope Invariant**: Assigned amount must be $\ge 0$ and $\le (\text{unassigned\_cash} + \text{current assigned\_amount})$.
   - **Rebalance Envelopes Invariant**: Transfer amount must be $> 0$ and $\le \text{from\_envelope.assigned\_amount}$.

2. **Goal Monthly Pacing Formula (`app/api/v1/goals.py:14-28`)**:
   - Applies when `goal_type == GoalType.TARGET_BY_DATE` and `target_date is not None`.
   - Let $\Delta m = (\text{target\_year} - \text{current\_year}) \times 12 + (\text{target\_month} - \text{current\_month})$.
   - If $\text{target\_date} \le \text{today}$ or $\Delta m \le 0$: $\Delta m = 1$.
   - $\text{Remaining} = \max(0, \text{target\_amount} - \text{current\_balance})$.
   - $\text{Monthly Pacing} = \text{round}\left(\frac{\text{Remaining}}{\Delta m}, 2\right)$.

3. **Staple Inflation Calculation (`app/services/cpi_service.py:111-159`)**:
   - For each canonical item, retrieve price history points sorted descending by `recorded_at`.
   - Let $P_{\text{latest}} = \text{history}[0].\text{unit\_price}$ and $P_{\text{prev}} = \text{history}[1].\text{unit\_price}$.
   - If $P_{\text{latest}}$ and $P_{\text{prev}} > 0$:
     $$\text{Inflation Rate (\%)} = \left(\frac{P_{\text{latest}} - P_{\text{prev}}}{P_{\text{prev}}}\right) \times 100$$
   - Synonyms automatically mapped to Canonical Items:
     - `aaloo` / `aalu` $\to$ `Potato` (`Fresh Produce`)
     - `pyaz` / `pyaaz` $\to$ `Onion` (`Fresh Produce`)
     - `tamatar` $\to$ `Tomato` (`Fresh Produce`)
     - `doodh` $\to$ `Milk` (`Dairy`)
     - `anday` / `egg` $\to$ `Eggs` (`Poultry & Dairy`)
     - `petrol` / `fuel` $\to$ `Petrol` (`Fuel`)
     - `diesel` $\to$ `Diesel` (`Fuel`)
     - `atta` $\to$ `Flour` (`Grains & Staples`)
     - `cheeni` $\to$ `Sugar` (`Grains & Staples`)
     - `chaawal` $\to$ `Rice` (`Grains & Staples`)
     - `oil` $\to$ `Cooking Oil` (`Cooking Essentials`)

4. **Ledger Double-Entry Updates (`app/services/ledger_service.py:41-96`)**:
   - When a transaction of $\text{total\_amount}$ is posted:
     - $\text{account.current\_balance} \leftarrow \text{account.current\_balance} - \text{total\_amount}$
     - $\text{envelope.spent\_amount} \leftarrow \text{envelope.spent\_amount} + \text{total\_amount}$
     - Each line item auto-calculates $\text{unit\_price} = \text{total\_price} / \text{quantity}$ if missing, resolves/creates the canonical item, and records a new entry in `price_history`.

---

## 2. Logic Chain

1. **Alignment with Acceptance Criteria R1–R6**:
   - **R1 (Zero-Based Budget Allocation Table)**: Supported by `GET /api/v1/envelopes/summary/{household_id}`, `GET /api/v1/envelopes/groups/household/{household_id}`, `POST /api/v1/envelopes/assign`, and `POST /api/v1/envelopes/rebalance`.
   - **R2 (Granular Line-Item Transaction Explorer)**: Supported by `GET /api/v1/transactions/household/{household_id}` and `POST /api/v1/transactions` returning full line-item details (`quantity`, `unit`, `unit_price`, `total_price`, `raw_item_name`, `notes`).
   - **R3 (Personal CPI & Staple Inflation Visualizer)**: Supported by `GET /api/v1/cpi/trends/{household_id}` delivering canonical item trends, latest/previous unit prices, percentage change, and multi-point time-series history.
   - **R4 (Financial Goals & Emergency Runway Tracker)**: Supported by `GET /api/v1/goals/household/{household_id}` with monthly pacing. Runway in months can be computed on the frontend using $(\text{Total Liquid Inflow} / \text{Monthly Burn Rate})$.
   - **R5 (Liquid Accounts & Wallets Summary)**: Supported by `GET /api/v1/accounts/household/{household_id}` providing real-time balances, overdrawn flags, and account types (`CASH`, `BANK`, `EMI`, `CREDIT`).
   - **R6 (Verification & Seed Data Script)**: The backend code is fully implemented and tested, but the dedicated seed script file (`apps/api/scripts/seed_demo_data.py` or `scripts/seed_demo_data.py`) has not yet been created.

2. **Query vs Path Parameters Nuance**:
   - `POST /api/v1/envelopes/assign` and `POST /api/v1/envelopes/rebalance` take `household_id: UUID` as a **query parameter** (`/api/v1/envelopes/assign?household_id=<id>`), while `payload` is sent in the request JSON body.
   - `GET /api/v1/accounts/{account_id}` takes `account_id` as a path parameter and `household_id` as a **query parameter**.

3. **Field Naming & JSON Serialization**:
   - Backend FastAPI returns responses in standard Python/Pydantic `snake_case` (e.g., `assigned_amount`, `spent_amount`, `available_balance`, `unassigned_cash`, `total_inflow`, `total_assigned`, `overspent_envelopes_count`, `monthly_pacing`).
   - `packages/shared/src/types.ts` defines `camelCase` interfaces. The frontend API client layer must ensure property names are normalized or typed to match the FastAPI `snake_case` responses.

---

## 3. Caveats

1. **No Seed Script File Currently Present**: `apps/api/scripts/seed_demo_data.py` does not exist yet in the repo. A comprehensive seed script must be provided to populate a realistic demo household, accounts, envelope groups, multi-month transactions, and CPI price points.
2. **Household Discovery Endpoint**: There is currently no `GET /api/v1/households` endpoint to list all households (only `GET /api/v1/households/{household_id}`). Providing a well-known demo household ID or adding a listing/bootstrap helper ensures the web frontend connects seamlessly on load.
3. **Frontend Client Implementation Needed**: `apps/web/src` contains an initial App skeleton without active API client hooks yet.

---

## 4. Conclusion

The backend in `apps/api` provides a complete, robust FastAPI service with all required business logic, database models, and endpoints for R1–R5:
- Full Zero-Based Budgeting (ZBB) with assign, rebalance, and envelope invariants.
- Granular line-item transactions with automated CPI price tracking and Roman Urdu canonicalization.
- CPI trend analytics with percentage inflation tracking and multi-point time series.
- Goal pacing calculation for target-date sinking funds.
- Account liquidity and overdrawn tracking.

To fulfill R6 and power the frontend dashboard with rich visual data, a seed script `apps/api/scripts/seed_demo_data.py` must populate:
- 1 Demo Household ("Mavee Household", PKR) with 1 User ("Mavee", +923001234567).
- 4 Accounts (Wallet Cash, Meezan Bank, Sadapay, Nayapay) totaling ~PKR 275,000 liquid inflow.
- 3 Envelope Groups (Daily Living, Discretionary, Savings & Sinking Funds) with 8 Envelopes (Grocery, Fuel, Utilities, Dining Out [overspent], Shopping, Umrah 2027, Emergency Cushion, Vehicle Maintenance).
- 6 Canonical Staple Items (Potato, Milk, Eggs, Petrol, Flour, Cooking Oil) with historical price points across 4+ months (May–Aug 2026) showing realistic inflation trends.
- 15+ Granular Multi-Item Transactions across accounts, envelopes, and merchants (Imtiaz, Shell, Al-Fatah, Kolachi, Monal, etc.).
- 3 Goals (Umrah 2027, Emergency Cushion, Home Renovation) with target dates and balances.

---

## 5. Verification Method

To verify these backend findings independently:

1. **Inspect Model Definitions**:
   `view_file` on `apps/api/app/models/account.py`, `envelope.py`, `transaction.py`, `canonical_item.py`, `goal.py`, `household.py`.
2. **Inspect Route Implementations**:
   `view_file` on `apps/api/app/api/v1/envelopes.py`, `transactions.py`, `cpi.py`, `goals.py`, `accounts.py`, `households.py`.
3. **Inspect Services & Logic**:
   `view_file` on `apps/api/app/services/zbb_service.py`, `ledger_service.py`, `cpi_service.py`.
4. **Inspect Test Suite**:
   `view_file` on `apps/api/tests/test_api.py`, `test_zbb.py`, `test_ledger.py`, `test_cpi.py`.
5. **Run Backend Tests** (when Docker PostgreSQL is running on port 5435):
   ```bash
   cd /home/mavee/tazkiyah/apps/api && pytest
   ```
