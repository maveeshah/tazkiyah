import type {
  AccountCreate,
  AccountResponse,
  AccountUpdate,
  AuthResponse,
  CPITrendItem,
  EnvelopeCreate,
  EnvelopeGroupCreate,
  EnvelopeGroupResponse,
  EnvelopeRebalance,
  EnvelopeResponse,
  GoalCreate,
  GoalResponse,
  GoalUpdate,
  HouseholdResponse,
  RebalanceResponse,
  TransactionCreate,
  TransactionResponse,
  TransactionUpdate,
  UserCreate,
  UserRegisterRequest,
  UserResponse,
  UserUpdate,
  ZBBSummaryResponse,
} from '../types/api';

// Set EXPO_PUBLIC_API_URL for local dev (e.g. http://localhost:8000/api/v1 or a
// LAN IP for a device). Release builds fall back to the deployed API.
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (__DEV__ ? 'http://localhost:8000/api/v1' : 'https://api.tazkiyah.co/api/v1');

// Simple in-memory store
let _householdId: string | null = null;
let _currentUser: UserResponse | null = null;

export function setHouseholdId(id: string | null) {
  _householdId = id;
}

export function getHouseholdId(): string | null {
  return _householdId;
}

export function setCurrentUser(user: UserResponse | null) {
  _currentUser = user;
}

export function getCurrentUser(): UserResponse | null {
  return _currentUser;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options.headers as Record<string, string> ?? {}) };
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    let detail = res.statusText;
    try { detail = (await res.json()).detail ?? detail; } catch {}
    throw new Error(`API ${res.status}: ${detail}`);
  }
  return res.json() as Promise<T>;
}

// ── Auth & User Management ─────────────────────────────────────────────────
export async function bootstrapHousehold(): Promise<AuthResponse> {
  return request<AuthResponse>('/households/bootstrap');
}

export async function listHouseholds(): Promise<HouseholdResponse[]> {
  return request<HouseholdResponse[]>('/households');
}

export async function fetchHousehold(householdId: string): Promise<HouseholdResponse> {
  return request<HouseholdResponse>(`/households/${householdId}`);
}

export async function createHousehold(name: string, baseCurrency = 'PKR'): Promise<HouseholdResponse> {
  return request<HouseholdResponse>('/households', {
    method: 'POST',
    body: JSON.stringify({ name, base_currency: baseCurrency }),
  });
}

export async function listHouseholdUsers(householdId: string): Promise<UserResponse[]> {
  return request<UserResponse[]>(`/households/${householdId}/users`);
}

export async function createUser(householdId: string, payload: UserCreate): Promise<UserResponse> {
  return request<UserResponse>(`/households/${householdId}/users`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function loginUser(phoneNumber: string): Promise<AuthResponse> {
  return request<AuthResponse>('/users/login', {
    method: 'POST',
    body: JSON.stringify({ phone_number: phoneNumber }),
  });
}

export async function registerUser(payload: UserRegisterRequest): Promise<AuthResponse> {
  return request<AuthResponse>('/users/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function listAllUsers(): Promise<UserResponse[]> {
  return request<UserResponse[]>('/users');
}

export async function updateUser(userId: string, payload: UserUpdate): Promise<UserResponse> {
  return request<UserResponse>(`/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteUser(userId: string): Promise<{ status: string; message: string }> {
  return request<{ status: string; message: string }>(`/users/${userId}`, {
    method: 'DELETE',
  });
}

// ── Accounts ───────────────────────────────────────────────────────────────
export async function fetchAccounts(householdId: string): Promise<AccountResponse[]> {
  return request<AccountResponse[]>(`/accounts/household/${householdId}`);
}

export async function createAccount(payload: AccountCreate): Promise<AccountResponse> {
  return request<AccountResponse>('/accounts', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateAccount(
  accountId: string,
  householdId: string,
  payload: AccountUpdate,
): Promise<AccountResponse> {
  return request<AccountResponse>(`/accounts/${accountId}?household_id=${householdId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteAccount(accountId: string, householdId: string): Promise<{ status: string }> {
  return request(`/accounts/${accountId}?household_id=${householdId}`, { method: 'DELETE' });
}

// ── ZBB / Envelopes ────────────────────────────────────────────────────────
export async function fetchZBBSummary(householdId: string): Promise<ZBBSummaryResponse> {
  return request<ZBBSummaryResponse>(`/envelopes/summary/${householdId}`);
}

export async function fetchEnvelopeGroups(householdId: string): Promise<EnvelopeGroupResponse[]> {
  return request<EnvelopeGroupResponse[]>(`/envelopes/groups/household/${householdId}`);
}

export async function assignEnvelope(
  householdId: string,
  envelopeId: string,
  amount: number,
): Promise<EnvelopeResponse> {
  return request<EnvelopeResponse>(`/envelopes/assign?household_id=${householdId}`, {
    method: 'POST',
    body: JSON.stringify({ envelope_id: envelopeId, assigned_amount: amount }),
  });
}

export async function rebalanceEnvelopes(
  householdId: string,
  payload: EnvelopeRebalance,
): Promise<RebalanceResponse> {
  return request<RebalanceResponse>(`/envelopes/rebalance?household_id=${householdId}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function createEnvelope(payload: EnvelopeCreate): Promise<EnvelopeResponse> {
  return request<EnvelopeResponse>('/envelopes', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function createEnvelopeGroup(
  payload: EnvelopeGroupCreate,
): Promise<EnvelopeGroupResponse> {
  return request<EnvelopeGroupResponse>('/envelopes/groups', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ── Transactions ───────────────────────────────────────────────────────────
export async function fetchTransactions(
  householdId: string,
  limit = 30,
): Promise<TransactionResponse[]> {
  return request<TransactionResponse[]>(`/transactions/household/${householdId}?limit=${limit}`);
}

export async function createTransaction(payload: TransactionCreate): Promise<TransactionResponse> {
  return request<TransactionResponse>('/transactions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateTransaction(
  transactionId: string,
  householdId: string,
  payload: TransactionUpdate,
): Promise<TransactionResponse> {
  return request<TransactionResponse>(`/transactions/${transactionId}?household_id=${householdId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteTransaction(
  transactionId: string,
  householdId: string,
): Promise<{ status: string }> {
  return request(`/transactions/${transactionId}?household_id=${householdId}`, { method: 'DELETE' });
}

// ── Goals ──────────────────────────────────────────────────────────────────
export async function fetchGoals(householdId: string): Promise<GoalResponse[]> {
  return request<GoalResponse[]>(`/goals/household/${householdId}`);
}

export async function createGoal(payload: GoalCreate): Promise<GoalResponse> {
  return request<GoalResponse>('/goals', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateGoal(
  goalId: string,
  householdId: string,
  payload: GoalUpdate,
): Promise<GoalResponse> {
  return request<GoalResponse>(`/goals/${goalId}?household_id=${householdId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteGoal(goalId: string, householdId: string): Promise<{ status: string }> {
  return request(`/goals/${goalId}?household_id=${householdId}`, { method: 'DELETE' });
}

// ── CPI ────────────────────────────────────────────────────────────────────
export async function fetchCPITrends(householdId: string): Promise<CPITrendItem[]> {
  return request<CPITrendItem[]>(`/cpi/trends/${householdId}`);
}

// ── Simulator (dev only) ───────────────────────────────────────────────────
export async function simulateWhatsApp(
  phoneNumber: string,
  text: string,
): Promise<{ simulation_result: { status: string; total_amount?: number } }> {
  return request('/webhook/simulate', {
    method: 'POST',
    body: JSON.stringify({
      phone_number: phoneNumber,
      message_type: 'text',
      content: text,
    }),
  });
}
