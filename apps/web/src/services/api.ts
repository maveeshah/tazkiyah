import type {
  AccountCreate,
  AccountResponse,
  AccountUpdate,
  AuthResponse,
  CPITrendItem,
  EnvelopeAssign,
  EnvelopeCreate,
  EnvelopeGroupCreate,
  EnvelopeGroupResponse,
  EnvelopeGroupUpdate,
  EnvelopeRebalance,
  EnvelopeResponse,
  EnvelopeUpdate,
  GoalCreate,
  GoalResponse,
  GoalUpdate,
  HealthResponse,
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

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

class ApiClientError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.data = data;
  }
}

function extractDetail(errorData: unknown, fallback: string): string {
  if (typeof errorData === 'object' && errorData !== null && 'detail' in errorData) {
    const detail = (errorData as { detail: unknown }).detail;
    if (typeof detail === 'string') return detail;
    // FastAPI 422 returns an array of {loc, msg, type}
    if (Array.isArray(detail)) {
      return detail
        .map((d) => (typeof d === 'object' && d && 'msg' in d ? String((d as { msg: unknown }).msg) : String(d)))
        .join('; ');
    }
    return JSON.stringify(detail);
  }
  return fallback;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (err) {
    throw new ApiClientError(
      err instanceof Error ? `Network error: ${err.message}` : 'Network error',
      0,
      err,
    );
  }

  if (!response.ok) {
    let errorData: unknown;
    try {
      errorData = await response.json();
    } catch {
      errorData = await response.text().catch(() => '');
    }
    const fallback = `API request failed with status ${response.status}: ${response.statusText}`;
    throw new ApiClientError(extractDetail(errorData, fallback), response.status, errorData);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

const qs = (householdId: string) => `household_id=${encodeURIComponent(householdId)}`;

export const api = {
  // Health
  getHealth: () => request<HealthResponse>('/health'),

  // Households & auth
  bootstrap: () => request<AuthResponse>('/households/bootstrap'),
  listHouseholds: () => request<HouseholdResponse[]>('/households'),
  getHousehold: (householdId: string) => request<HouseholdResponse>(`/households/${householdId}`),
  createHousehold: (name: string, baseCurrency = 'PKR') =>
    request<HouseholdResponse>('/households', {
      method: 'POST',
      body: JSON.stringify({ name, base_currency: baseCurrency }),
    }),
  listHouseholdUsers: (householdId: string) =>
    request<UserResponse[]>(`/households/${householdId}/users`),
  createUser: (householdId: string, payload: UserCreate) =>
    request<UserResponse>(`/households/${householdId}/users`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Users
  listAllUsers: () => request<UserResponse[]>('/users'),
  loginUser: (phoneNumber: string) =>
    request<AuthResponse>('/users/login', {
      method: 'POST',
      body: JSON.stringify({ phone_number: phoneNumber }),
    }),
  registerUser: (payload: UserRegisterRequest) =>
    request<AuthResponse>('/users/register', { method: 'POST', body: JSON.stringify(payload) }),
  updateUser: (userId: string, payload: UserUpdate) =>
    request<UserResponse>(`/users/${userId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteUser: (userId: string) =>
    request<{ status: string }>(`/users/${userId}`, { method: 'DELETE' }),

  // Accounts
  createAccount: (payload: AccountCreate) =>
    request<AccountResponse>('/accounts', { method: 'POST', body: JSON.stringify(payload) }),
  listAccounts: (householdId: string) =>
    request<AccountResponse[]>(`/accounts/household/${householdId}`),
  updateAccount: (accountId: string, householdId: string, payload: AccountUpdate) =>
    request<AccountResponse>(`/accounts/${accountId}?${qs(householdId)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  deleteAccount: (accountId: string, householdId: string) =>
    request<{ status: string }>(`/accounts/${accountId}?${qs(householdId)}`, { method: 'DELETE' }),

  // Envelopes & Zero-Based Budget
  createEnvelopeGroup: (payload: EnvelopeGroupCreate) =>
    request<EnvelopeGroupResponse>('/envelopes/groups', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  listEnvelopeGroups: (householdId: string) =>
    request<EnvelopeGroupResponse[]>(`/envelopes/groups/household/${householdId}`),
  updateEnvelopeGroup: (groupId: string, householdId: string, payload: EnvelopeGroupUpdate) =>
    request<EnvelopeGroupResponse>(`/envelopes/groups/${groupId}?${qs(householdId)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  deleteEnvelopeGroup: (groupId: string, householdId: string) =>
    request<{ status: string }>(`/envelopes/groups/${groupId}?${qs(householdId)}`, { method: 'DELETE' }),
  createEnvelope: (payload: EnvelopeCreate) =>
    request<EnvelopeResponse>('/envelopes', { method: 'POST', body: JSON.stringify(payload) }),
  updateEnvelope: (envelopeId: string, householdId: string, payload: EnvelopeUpdate) =>
    request<EnvelopeResponse>(`/envelopes/${envelopeId}?${qs(householdId)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  deleteEnvelope: (envelopeId: string, householdId: string) =>
    request<{ status: string }>(`/envelopes/${envelopeId}?${qs(householdId)}`, { method: 'DELETE' }),
  getZBBSummary: (householdId: string) =>
    request<ZBBSummaryResponse>(`/envelopes/summary/${householdId}`),
  assignEnvelope: (householdId: string, payload: EnvelopeAssign) =>
    request<EnvelopeResponse>(`/envelopes/assign?${qs(householdId)}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  rebalanceEnvelopes: (householdId: string, payload: EnvelopeRebalance) =>
    request<RebalanceResponse>(`/envelopes/rebalance?${qs(householdId)}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getOverspentEnvelopes: (householdId: string) =>
    request<EnvelopeResponse[]>(`/envelopes/overspent/${householdId}`),

  // Transactions & Ledger
  createTransaction: (payload: TransactionCreate) =>
    request<TransactionResponse>('/transactions', { method: 'POST', body: JSON.stringify(payload) }),
  listTransactions: (householdId: string, limit = 50) =>
    request<TransactionResponse[]>(`/transactions/household/${householdId}?limit=${limit}`),
  updateTransaction: (transactionId: string, householdId: string, payload: TransactionUpdate) =>
    request<TransactionResponse>(`/transactions/${transactionId}?${qs(householdId)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  deleteTransaction: (transactionId: string, householdId: string) =>
    request<{ status: string }>(`/transactions/${transactionId}?${qs(householdId)}`, { method: 'DELETE' }),

  // Personal CPI
  getCPITrends: (householdId: string) => request<CPITrendItem[]>(`/cpi/trends/${householdId}`),

  // Financial Goals
  createGoal: (payload: GoalCreate) =>
    request<GoalResponse>('/goals', { method: 'POST', body: JSON.stringify(payload) }),
  listGoals: (householdId: string) => request<GoalResponse[]>(`/goals/household/${householdId}`),
  updateGoal: (goalId: string, householdId: string, payload: GoalUpdate) =>
    request<GoalResponse>(`/goals/${goalId}?${qs(householdId)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  deleteGoal: (goalId: string, householdId: string) =>
    request<{ status: string }>(`/goals/${goalId}?${qs(householdId)}`, { method: 'DELETE' }),
};

export { ApiClientError };
