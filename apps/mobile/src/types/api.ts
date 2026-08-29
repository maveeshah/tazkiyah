// Re-export from shared types — same contracts as the web app
export type AccountType = 'CASH' | 'BANK' | 'EMI' | 'CREDIT';
export type TransactionSource = 'WHATSAPP' | 'WEB' | 'MOBILE';
export type GoalType = 'TARGET_BY_DATE' | 'TARGET_CAP' | 'SINKING_FUND';

export interface UserResponse {
  id: string;
  household_id: string;
  phone_number: string;
  full_name: string;
  email?: string | null;
  role: string;
  created_at: string;
}

export interface UserCreate {
  phone_number: string;
  full_name: string;
  email?: string | null;
  role?: string;
}

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

export interface AuthResponse {
  user: UserResponse;
  household: HouseholdResponse;
}

export interface HouseholdResponse {
  id: string;
  name: string;
  base_currency: string;
  created_at: string;
}

export interface AccountResponse {
  id: string;
  household_id: string;
  name: string;
  type: AccountType;
  current_balance: number | string;
  is_active: boolean;
  is_overdrawn: boolean;
  created_at: string;
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

export interface GoalUpdate {
  name?: string;
  goal_type?: GoalType;
  target_amount?: number | string;
  target_date?: string | null;
  current_balance?: number | string;
  envelope_id?: string | null;
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

export interface EnvelopeResponse {
  id: string;
  group_id: string;
  name: string;
  assigned_amount: number | string;
  spent_amount: number | string;
  available_balance: number;
  target_amount?: number | string | null;
  created_at: string;
}

export interface EnvelopeGroupResponse {
  id: string;
  household_id: string;
  name: string;
  sort_order: number;
  envelopes: EnvelopeResponse[];
  created_at: string;
}

export interface EnvelopeCreate {
  group_id: string;
  name: string;
  target_amount?: number | string | null;
}

export interface EnvelopeGroupCreate {
  household_id: string;
  name: string;
  sort_order?: number;
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

export interface LineItemResponse {
  id: string;
  transaction_id: string;
  raw_item_name: string;
  quantity: number | string;
  unit: string;
  unit_price?: number | string | null;
  total_price: number | string;
  notes?: string | null;
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

export interface TransactionCreate {
  household_id: string;
  account_id: string;
  envelope_id: string;
  total_amount: number | string;
  merchant?: string | null;
  source?: TransactionSource;
  raw_input?: string | null;
  line_items?: LineItemCreate[];
}

export interface LineItemCreate {
  raw_item_name: string;
  quantity?: number | string;
  unit?: string;
  unit_price?: number | string | null;
  total_price: number | string;
  notes?: string | null;
}

export interface GoalResponse {
  id: string;
  household_id: string;
  name: string;
  goal_type: GoalType;
  target_amount: number | string;
  current_balance: number | string;
  target_date?: string | null;
  envelope_id?: string | null;
  monthly_pacing?: number | string | null;
  created_at: string;
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

export interface CPITrendItem {
  canonical_item_id: string;
  name: string;
  category: string;
  standard_unit: string;
  latest_price?: number | string | null;
  previous_price?: number | string | null;
  inflation_rate_percentage?: number | null;
  history: { unit_price: number | string; recorded_at: string; merchant?: string | null }[];
}
