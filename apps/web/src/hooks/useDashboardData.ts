import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, ApiClientError } from '../services/api';
import type {
  AccountCreate,
  AccountResponse,
  AccountUpdate,
  CPITrendItem,
  EnvelopeCreate,
  EnvelopeGroupCreate,
  EnvelopeGroupResponse,
  EnvelopeGroupUpdate,
  EnvelopeResponse,
  EnvelopeUpdate,
  GoalCreate,
  GoalResponse,
  GoalUpdate,
  TransactionCreate,
  TransactionResponse,
  TransactionUpdate,
  ZBBSummaryResponse,
} from '../types/api';

export interface UseDashboardDataReturn {
  accounts: AccountResponse[];
  zbbSummary: ZBBSummaryResponse | null;
  envelopeGroups: EnvelopeGroupResponse[];
  transactions: TransactionResponse[];
  cpiTrends: CPITrendItem[];
  goals: GoalResponse[];
  overspentEnvelopes: EnvelopeResponse[];

  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;

  netLiquidWorth: number;
  totalCash: number;
  totalBank: number;
  totalEmi: number;
  totalCredit: number;
  unassignedCash: number;
  isZeroBalanced: boolean;

  refresh: () => Promise<void>;

  createAccount: (payload: Omit<AccountCreate, 'household_id'>) => Promise<AccountResponse>;
  updateAccount: (accountId: string, payload: AccountUpdate) => Promise<AccountResponse>;
  deleteAccount: (accountId: string) => Promise<void>;

  assignBudget: (envelopeId: string, assignedAmount: number | string) => Promise<EnvelopeResponse>;
  rebalanceEnvelopes: (fromEnvelopeId: string, toEnvelopeId: string, amount: number | string) => Promise<void>;
  createEnvelope: (payload: EnvelopeCreate) => Promise<EnvelopeResponse>;
  updateEnvelope: (envelopeId: string, payload: EnvelopeUpdate) => Promise<EnvelopeResponse>;
  deleteEnvelope: (envelopeId: string) => Promise<void>;
  createEnvelopeGroup: (payload: Omit<EnvelopeGroupCreate, 'household_id'>) => Promise<EnvelopeGroupResponse>;
  updateEnvelopeGroup: (groupId: string, payload: EnvelopeGroupUpdate) => Promise<EnvelopeGroupResponse>;
  deleteEnvelopeGroup: (groupId: string) => Promise<void>;

  logTransaction: (payload: Omit<TransactionCreate, 'household_id'>) => Promise<TransactionResponse>;
  updateTransaction: (transactionId: string, payload: TransactionUpdate) => Promise<TransactionResponse>;
  deleteTransaction: (transactionId: string) => Promise<void>;

  createGoal: (payload: Omit<GoalCreate, 'household_id'>) => Promise<GoalResponse>;
  updateGoal: (goalId: string, payload: GoalUpdate) => Promise<GoalResponse>;
  deleteGoal: (goalId: string) => Promise<void>;
}

const num = (v: number | string | null | undefined): number => {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v ?? 0);
  return Number.isNaN(n) ? 0 : n;
};

export function useDashboardData(householdId: string | null): UseDashboardDataReturn {
  const [accounts, setAccounts] = useState<AccountResponse[]>([]);
  const [zbbSummary, setZbbSummary] = useState<ZBBSummaryResponse | null>(null);
  const [envelopeGroups, setEnvelopeGroups] = useState<EnvelopeGroupResponse[]>([]);
  const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
  const [cpiTrends, setCpiTrends] = useState<CPITrendItem[]>([]);
  const [goals, setGoals] = useState<GoalResponse[]>([]);
  const [overspentEnvelopes, setOverspentEnvelopes] = useState<EnvelopeResponse[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Guards stale responses from an earlier householdId / overlapping refresh.
  const requestSeq = useRef(0);

  const fetchAllData = useCallback(async (hhId: string) => {
    const seq = ++requestSeq.current;
    const [accsRes, zbbRes, groupsRes, txsRes, cpiRes, goalsRes, overspentRes] = await Promise.all([
      api.listAccounts(hhId).catch((e) => { console.error('listAccounts', e); return [] as AccountResponse[]; }),
      api.getZBBSummary(hhId).catch((e) => { console.error('getZBBSummary', e); return null; }),
      api.listEnvelopeGroups(hhId).catch((e) => { console.error('listEnvelopeGroups', e); return [] as EnvelopeGroupResponse[]; }),
      api.listTransactions(hhId, 50).catch((e) => { console.error('listTransactions', e); return [] as TransactionResponse[]; }),
      api.getCPITrends(hhId).catch((e) => { console.error('getCPITrends', e); return [] as CPITrendItem[]; }),
      api.listGoals(hhId).catch((e) => { console.error('listGoals', e); return [] as GoalResponse[]; }),
      api.getOverspentEnvelopes(hhId).catch((e) => { console.error('getOverspentEnvelopes', e); return [] as EnvelopeResponse[]; }),
    ]);
    if (seq !== requestSeq.current) return; // a newer fetch superseded this one

    setAccounts(accsRes);
    setZbbSummary(zbbRes);
    setEnvelopeGroups(groupsRes);
    setTransactions(txsRes);
    setCpiTrends(cpiRes);
    setGoals(goalsRes);
    setOverspentEnvelopes(overspentRes);
    setError(null);
  }, []);

  useEffect(() => {
    if (!householdId) {
      setIsLoading(false);
      return;
    }
    let active = true;
    setIsLoading(true);
    fetchAllData(householdId)
      .catch((err) => {
        if (active) setError(err instanceof ApiClientError ? err.message : 'Failed to load dashboard data');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [householdId, fetchAllData]);

  const refresh = useCallback(async () => {
    if (!householdId) return;
    setIsRefreshing(true);
    try {
      await fetchAllData(householdId);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to refresh');
    } finally {
      setIsRefreshing(false);
    }
  }, [householdId, fetchAllData]);

  const requireHh = useCallback((): string => {
    if (!householdId) throw new Error('No active household');
    return householdId;
  }, [householdId]);

  const withRefresh = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T> => {
      const result = await fn();
      await refresh();
      return result;
    },
    [refresh],
  );

  const createAccount = useCallback(
    (payload: Omit<AccountCreate, 'household_id'>) =>
      withRefresh(() => api.createAccount({ ...payload, household_id: requireHh() })),
    [withRefresh, requireHh],
  );
  const updateAccount = useCallback(
    (accountId: string, payload: AccountUpdate) =>
      withRefresh(() => api.updateAccount(accountId, requireHh(), payload)),
    [withRefresh, requireHh],
  );
  const deleteAccount = useCallback(
    (accountId: string) => withRefresh(() => api.deleteAccount(accountId, requireHh())).then(() => undefined),
    [withRefresh, requireHh],
  );

  const assignBudget = useCallback(
    (envelopeId: string, assignedAmount: number | string) =>
      withRefresh(() => api.assignEnvelope(requireHh(), { envelope_id: envelopeId, assigned_amount: assignedAmount })),
    [withRefresh, requireHh],
  );
  const rebalanceEnvelopes = useCallback(
    (fromEnvelopeId: string, toEnvelopeId: string, amount: number | string) =>
      withRefresh(() =>
        api.rebalanceEnvelopes(requireHh(), {
          from_envelope_id: fromEnvelopeId,
          to_envelope_id: toEnvelopeId,
          amount,
        }),
      ).then(() => undefined),
    [withRefresh, requireHh],
  );
  const createEnvelope = useCallback(
    (payload: EnvelopeCreate) => withRefresh(() => api.createEnvelope(payload)),
    [withRefresh],
  );
  const updateEnvelope = useCallback(
    (envelopeId: string, payload: EnvelopeUpdate) =>
      withRefresh(() => api.updateEnvelope(envelopeId, requireHh(), payload)),
    [withRefresh, requireHh],
  );
  const deleteEnvelope = useCallback(
    (envelopeId: string) => withRefresh(() => api.deleteEnvelope(envelopeId, requireHh())).then(() => undefined),
    [withRefresh, requireHh],
  );
  const createEnvelopeGroup = useCallback(
    (payload: Omit<EnvelopeGroupCreate, 'household_id'>) =>
      withRefresh(() => api.createEnvelopeGroup({ ...payload, household_id: requireHh() })),
    [withRefresh, requireHh],
  );
  const updateEnvelopeGroup = useCallback(
    (groupId: string, payload: EnvelopeGroupUpdate) =>
      withRefresh(() => api.updateEnvelopeGroup(groupId, requireHh(), payload)),
    [withRefresh, requireHh],
  );
  const deleteEnvelopeGroup = useCallback(
    (groupId: string) => withRefresh(() => api.deleteEnvelopeGroup(groupId, requireHh())).then(() => undefined),
    [withRefresh, requireHh],
  );

  const logTransaction = useCallback(
    (payload: Omit<TransactionCreate, 'household_id'>) =>
      withRefresh(() => api.createTransaction({ ...payload, household_id: requireHh() })),
    [withRefresh, requireHh],
  );
  const updateTransaction = useCallback(
    (transactionId: string, payload: TransactionUpdate) =>
      withRefresh(() => api.updateTransaction(transactionId, requireHh(), payload)),
    [withRefresh, requireHh],
  );
  const deleteTransaction = useCallback(
    (transactionId: string) =>
      withRefresh(() => api.deleteTransaction(transactionId, requireHh())).then(() => undefined),
    [withRefresh, requireHh],
  );

  const createGoal = useCallback(
    (payload: Omit<GoalCreate, 'household_id'>) =>
      withRefresh(() => api.createGoal({ ...payload, household_id: requireHh() })),
    [withRefresh, requireHh],
  );
  const updateGoal = useCallback(
    (goalId: string, payload: GoalUpdate) => withRefresh(() => api.updateGoal(goalId, requireHh(), payload)),
    [withRefresh, requireHh],
  );
  const deleteGoal = useCallback(
    (goalId: string) => withRefresh(() => api.deleteGoal(goalId, requireHh())).then(() => undefined),
    [withRefresh, requireHh],
  );

  const activeAccounts = useMemo(() => accounts.filter((a) => a.is_active), [accounts]);
  const netLiquidWorth = useMemo(
    () => activeAccounts.reduce((s, a) => s + num(a.current_balance), 0),
    [activeAccounts],
  );
  const sumByType = useCallback(
    (t: AccountResponse['type']) =>
      activeAccounts.filter((a) => a.type === t).reduce((s, a) => s + num(a.current_balance), 0),
    [activeAccounts],
  );
  const totalCash = useMemo(() => sumByType('CASH'), [sumByType]);
  const totalBank = useMemo(() => sumByType('BANK'), [sumByType]);
  const totalEmi = useMemo(() => sumByType('EMI'), [sumByType]);
  const totalCredit = useMemo(() => sumByType('CREDIT'), [sumByType]);
  const unassignedCash = useMemo(() => (zbbSummary ? num(zbbSummary.unassigned_cash) : 0), [zbbSummary]);
  const isZeroBalanced = useMemo(() => Math.abs(unassignedCash) < 0.01, [unassignedCash]);

  return {
    accounts,
    zbbSummary,
    envelopeGroups,
    transactions,
    cpiTrends,
    goals,
    overspentEnvelopes,
    isLoading,
    isRefreshing,
    error,
    netLiquidWorth,
    totalCash,
    totalBank,
    totalEmi,
    totalCredit,
    unassignedCash,
    isZeroBalanced,
    refresh,
    createAccount,
    updateAccount,
    deleteAccount,
    assignBudget,
    rebalanceEnvelopes,
    createEnvelope,
    updateEnvelope,
    deleteEnvelope,
    createEnvelopeGroup,
    updateEnvelopeGroup,
    deleteEnvelopeGroup,
    logTransaction,
    updateTransaction,
    deleteTransaction,
    createGoal,
    updateGoal,
    deleteGoal,
  };
}
