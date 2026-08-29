/**
 * Tazkiyah API Type Definitions
 * Exact TypeScript interfaces matching FastAPI /api/v1 backend schemas (snake_case)
 */

export type AccountType = 'CASH' | 'BANK' | 'EMI' | 'CREDIT';

export interface HouseholdBase {
  name: string;
  base_currency: string;
}

export interface HouseholdCreate extends HouseholdBase {}

export interface HouseholdResponse extends HouseholdBase {
  id: string;
  created_at: string;
}

export interface UserBase {
  phone_number: string;
  full_name: string;
  email?: string | null;
  role: string;
}

export interface UserCreate extends UserBase {}

export interface UserUpdate {
  full_name?: string;
  email?: string | null;
  role?: string;
}

export interface UserLoginRequest {
  phone_number: string;
}

export interface UserRegisterRequest {
  phone_number: string;
  full_name: string;
  email?: string | null;
  role?: string;
  household_id?: string | null;
  household_name?: string | null;
}

export interface UserResponse extends UserBase {
  id: string;
  household_id: string;
  created_at: string;
}

export interface AuthResponse {
  user: UserResponse;
  household: HouseholdResponse;
}

export interface AccountBase {
  name: string;
  type: AccountType;
  current_balance: number | string;
  is_active: boolean;
}

export interface AccountCreate {
  household_id: string;
  name: string;
  type?: AccountType;
  current_balance?: number | string;
  is_active?: boolean;
}

export interface AccountUpdate {
  name?: string;
  type?: AccountType;
  current_balance?: number | string;
  is_active?: boolean;
}

export interface AccountResponse extends AccountBase {
  id: string;
  household_id: string;
  is_overdrawn: boolean;
  created_at: string;
}

export interface EnvelopeBase {
  name: string;
  assigned_amount: number | string;
  spent_amount: number | string;
  target_amount?: number | string | null;
}

export interface EnvelopeCreate {
  group_id: string;
  name: string;
  target_amount?: number | string | null;
}

export interface EnvelopeUpdate {
  name?: string;
  target_amount?: number | string | null;
}

export interface EnvelopeGroupUpdate {
  name?: string;
  sort_order?: number;
}

export interface EnvelopeResponse extends EnvelopeBase {
  id: string;
  group_id: string;
  available_balance: number;
  created_at: string;
}

export interface EnvelopeGroupBase {
  name: string;
  sort_order: number;
}

export interface EnvelopeGroupCreate {
  household_id: string;
  name: string;
  sort_order?: number;
}

export interface EnvelopeGroupResponse extends EnvelopeGroupBase {
  id: string;
  household_id: string;
  envelopes: EnvelopeResponse[];
  created_at: string;
}

export interface EnvelopeAssign {
  envelope_id: string;
  assigned_amount: number | string;
}

export interface EnvelopeRebalance {
  from_envelope_id: string;
  to_envelope_id: string;
  amount: number | string;
}

export interface RebalanceResponse {
  status: string;
  message: string;
  from_envelope: EnvelopeResponse;
  to_envelope: EnvelopeResponse;
}

export interface ZBBSummaryResponse {
  total_inflow: number | string;
  total_assigned: number | string;
  unassigned_cash: number | string;
  total_spent: number | string;
  overspent_envelopes_count: number;
}

export type TransactionSource = 'WHATSAPP' | 'WEB' | 'MOBILE';

export interface LineItemCreate {
  raw_item_name: string;
  quantity?: number | string;
  unit?: string;
  unit_price?: number | string | null;
  total_price: number | string;
  notes?: string | null;
}

export interface LineItemResponse {
  id: string;
  transaction_id: string;
  canonical_item_id?: string | null;
  raw_item_name: string;
  quantity: number | string;
  unit: string;
  unit_price?: number | string | null;
  total_price: number | string;
  notes?: string | null;
}

export interface TransactionCreate {
  household_id: string;
  account_id: string;
  envelope_id: string;
  total_amount: number | string;
  merchant?: string | null;
  source?: TransactionSource;
  raw_input?: string | null;
  transacted_at?: string | null;
  line_items?: LineItemCreate[];
}

export interface TransactionUpdate {
  account_id?: string;
  envelope_id?: string;
  total_amount?: number | string;
  merchant?: string | null;
  raw_input?: string | null;
  transacted_at?: string | null;
  line_items?: LineItemCreate[];
}

export interface TransactionResponse {
  id: string;
  household_id: string;
  account_id: string;
  envelope_id: string;
  total_amount: number | string;
  merchant?: string | null;
  source: TransactionSource;
  raw_input?: string | null;
  transacted_at: string;
  created_at: string;
  line_items: LineItemResponse[];
}

export interface PricePointResponse {
  id: string;
  canonical_item_id: string;
  unit_price: number | string;
  unit: string;
  merchant?: string | null;
  recorded_at: string;
}

export interface CPITrendItem {
  canonical_item_id: string;
  name: string;
  category: string;
  standard_unit: string;
  latest_price?: number | string | null;
  previous_price?: number | string | null;
  inflation_rate_percentage?: number | null;
  history: PricePointResponse[];
}

export type GoalType = 'TARGET_BY_DATE' | 'TARGET_CAP' | 'SINKING_FUND';

export interface GoalBase {
  name: string;
  goal_type: GoalType;
  target_amount: number | string;
  target_date?: string | null;
  current_balance: number | string;
}

export interface GoalCreate {
  household_id: string;
  envelope_id?: string | null;
  name: string;
  goal_type: GoalType;
  target_amount: number | string;
  target_date?: string | null;
  current_balance?: number | string;
}

export interface GoalUpdate {
  name?: string;
  goal_type?: GoalType;
  target_amount?: number | string;
  target_date?: string | null;
  current_balance?: number | string;
  envelope_id?: string | null;
}

export interface GoalResponse extends GoalBase {
  id: string;
  household_id: string;
  envelope_id?: string | null;
  monthly_pacing?: number | string | null;
  created_at: string;
}

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
}
