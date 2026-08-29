import { useState, useEffect, useCallback, useMemo } from 'react';
import * as api from '../services/api';
import type {
  AccountResponse,
  CPITrendItem,
  EnvelopeGroupResponse,
  GoalResponse,
  TransactionResponse,
  ZBBSummaryResponse,
} from '../types/api';

interface DashboardData {
  accounts: AccountResponse[];
  zbbSummary: ZBBSummaryResponse | null;
  envelopeGroups: EnvelopeGroupResponse[];
  transactions: TransactionResponse[];
  goals: GoalResponse[];
  cpiTrends: CPITrendItem[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;

  // Computed financial metrics (active accounts only)
  netLiquidWorth: number;
  totalCash: number;
  totalBank: number;
  totalEmi: number;
  totalCredit: number;
  unassignedCash: number;
  isZeroBalanced: boolean;
}

function num(v: number | string | null | undefined): number {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v ?? 0);
  return isNaN(n) ? 0 : n;
}

export function useDashboardData(householdId: string | null): DashboardData {
  const [accounts, setAccounts] = useState<AccountResponse[]>([]);
  const [zbbSummary, setZbbSummary] = useState<ZBBSummaryResponse | null>(null);
  const [envelopeGroups, setEnvelopeGroups] = useState<EnvelopeGroupResponse[]>([]);
  const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
  const [goals, setGoals] = useState<GoalResponse[]>([]);
  const [cpiTrends, setCpiTrends] = useState<CPITrendItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!householdId) return;
    setLoading(true);
    setError(null);
    // Per-endpoint catch: one failing call degrades that section instead of
    // blanking the whole dashboard.
    const [accs, zbb, groups, txs, gs, cpi] = await Promise.all([
      api.fetchAccounts(householdId).catch((e) => { console.warn('fetchAccounts', e); return [] as AccountResponse[]; }),
      api.fetchZBBSummary(householdId).catch((e) => { console.warn('fetchZBBSummary', e); return null; }),
      api.fetchEnvelopeGroups(householdId).catch((e) => { console.warn('fetchEnvelopeGroups', e); return [] as EnvelopeGroupResponse[]; }),
      api.fetchTransactions(householdId).catch((e) => { console.warn('fetchTransactions', e); return [] as TransactionResponse[]; }),
      api.fetchGoals(householdId).catch((e) => { console.warn('fetchGoals', e); return [] as GoalResponse[]; }),
      api.fetchCPITrends(householdId).catch((e) => { console.warn('fetchCPITrends', e); return [] as CPITrendItem[]; }),
    ]);
    setAccounts(accs);
    setZbbSummary(zbb);
    setEnvelopeGroups(groups);
    setTransactions(txs);
    setGoals(gs);
    setCpiTrends(cpi);
    setLoading(false);
  }, [householdId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const activeAccounts = useMemo(() => accounts.filter((a) => a.is_active), [accounts]);

  const netLiquidWorth = useMemo(
    () => activeAccounts.reduce((sum, a) => sum + num(a.current_balance), 0),
    [activeAccounts],
  );
  const sumByType = useCallback(
    (t: AccountResponse['type']) =>
      activeAccounts.filter((a) => a.type === t).reduce((sum, a) => sum + num(a.current_balance), 0),
    [activeAccounts],
  );
  const totalCash = useMemo(() => sumByType('CASH'), [sumByType]);
  const totalBank = useMemo(() => sumByType('BANK'), [sumByType]);
  const totalEmi = useMemo(() => sumByType('EMI'), [sumByType]);
  const totalCredit = useMemo(() => sumByType('CREDIT'), [sumByType]);

  const unassignedCash = useMemo(
    () => (zbbSummary ? num(zbbSummary.unassigned_cash) : 0),
    [zbbSummary],
  );
  const isZeroBalanced = useMemo(() => Math.abs(unassignedCash) < 0.01, [unassignedCash]);

  return {
    accounts,
    zbbSummary,
    envelopeGroups,
    transactions,
    goals,
    cpiTrends,
    loading,
    error,
    refresh,
    netLiquidWorth,
    totalCash,
    totalBank,
    totalEmi,
    totalCredit,
    unassignedCash,
    isZeroBalanced,
  };
}
