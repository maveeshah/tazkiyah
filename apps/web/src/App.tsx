import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, X, Sparkles } from 'lucide-react';
import { useDashboardData } from './hooks/useDashboardData';
import { useUser } from './context/UserContext';
import { Header } from './components/layout/Header';
import { Navigation, type DashboardView } from './components/layout/Navigation';
import { AccountsSummary, AddAccountModal, EditAccountModal } from './features/accounts';
import {
  ZBBOverviewBar,
  BudgetTable,
  AssignIncomeModal,
  RebalanceModal,
  AddEnvelopeModal,
  AddGroupModal,
  EditEnvelopeModal,
  EditGroupModal,
} from './features/budget';
import { TransactionLedger, EditTransactionModal } from './features/ledger';
import { CPIVisualizer } from './features/cpi';
import { EmergencyRunway, GoalsTracker, AddGoalModal, EditGoalModal } from './features/goals';
import { UsersView } from './features/users';
import { Button } from './components/ui/Button';
import type {
  AccountResponse,
  EnvelopeGroupResponse,
  EnvelopeResponse,
  GoalResponse,
  TransactionResponse,
} from './types/api';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

const VIEW_HASH_KEY = 'view';

function readViewFromHash(): DashboardView {
  const raw = new URLSearchParams(window.location.hash.replace(/^#/, '')).get(VIEW_HASH_KEY);
  const valid: DashboardView[] = ['accounts', 'budget', 'ledger', 'cpi', 'goals', 'users'];
  return valid.includes(raw as DashboardView) ? (raw as DashboardView) : 'accounts';
}

export function App() {
  const [activeView, setActiveView] = useState<DashboardView>(readViewFromHash);
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedEnvelopeForAssign, setSelectedEnvelopeForAssign] = useState<EnvelopeResponse | null>(null);
  const [isRebalanceModalOpen, setIsRebalanceModalOpen] = useState(false);
  const [rebalanceSourceEnvelope, setRebalanceSourceEnvelope] = useState<EnvelopeResponse | null>(null);
  const [rebalanceTargetEnvelope, setRebalanceTargetEnvelope] = useState<EnvelopeResponse | null>(null);
  const [isAddEnvelopeModalOpen, setIsAddEnvelopeModalOpen] = useState(false);
  const [addEnvelopeDefaultGroupId, setAddEnvelopeDefaultGroupId] = useState<string | undefined>(undefined);
  const [isAddGroupModalOpen, setIsAddGroupModalOpen] = useState(false);
  const [isAddGoalOpen, setIsAddGoalOpen] = useState(false);

  // Edit targets (null = modal closed)
  const [editingAccount, setEditingAccount] = useState<AccountResponse | null>(null);
  const [editingGoal, setEditingGoal] = useState<GoalResponse | null>(null);
  const [editingEnvelope, setEditingEnvelope] = useState<EnvelopeResponse | null>(null);
  const [editingGroup, setEditingGroup] = useState<EnvelopeGroupResponse | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<TransactionResponse | null>(null);

  const { currentUser, currentHousehold, isLoadingUser } = useUser();

  const dash = useDashboardData(currentHousehold?.id ?? null);
  const {
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
    logTransaction,
    updateTransaction,
    deleteTransaction,
    createGoal,
    updateGoal,
    deleteGoal,
    createEnvelope,
    updateEnvelope,
    deleteEnvelope,
    createEnvelopeGroup,
    updateEnvelopeGroup,
    deleteEnvelopeGroup,
  } = dash;

  // Keep the URL hash in sync so refresh / back / deep-links work.
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    params.set(VIEW_HASH_KEY, activeView);
    window.history.replaceState(null, '', `#${params.toString()}`);
  }, [activeView]);

  useEffect(() => {
    const onHashChange = () => setActiveView(readViewFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const addToast = (type: Toast['type'], message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };
  const removeToast = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const formatPKR = (amount: number | string | undefined | null) => {
    if (amount === undefined || amount === null) return '0.00';
    const val = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
    return Number.isNaN(val)
      ? '0.00'
      : val.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const wrap = async <T,>(fn: () => Promise<T>, ok: string, fail: string): Promise<T> => {
    try {
      const r = await fn();
      addToast('success', ok);
      return r;
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : fail);
      throw err;
    }
  };

  const handleCreateAccount = (payload: Parameters<typeof createAccount>[0]) =>
    wrap(() => createAccount(payload), 'Account added', 'Failed to create account');
  const handleAssignBudget = (envelopeId: string, assignedAmount: number | string) =>
    wrap(() => assignBudget(envelopeId, assignedAmount), `Assigned PKR ${formatPKR(assignedAmount)}`, 'Failed to assign');
  const handleRebalanceEnvelopes = (fromId: string, toId: string, amount: number | string) =>
    wrap(() => rebalanceEnvelopes(fromId, toId, amount), `Transferred PKR ${formatPKR(amount)}`, 'Failed to rebalance');
  const handleCreateEnvelope = (payload: Parameters<typeof createEnvelope>[0]) =>
    wrap(() => createEnvelope(payload), 'Envelope created', 'Failed to create envelope');
  const handleCreateEnvelopeGroup = (payload: Parameters<typeof createEnvelopeGroup>[0]) =>
    wrap(() => createEnvelopeGroup(payload), 'Group created', 'Failed to create group');
  const handleLogTransaction = (payload: Parameters<typeof logTransaction>[0]) =>
    wrap(() => logTransaction(payload), 'Transaction recorded', 'Failed to record transaction');
  const handleCreateGoal = (payload: Parameters<typeof createGoal>[0]) =>
    wrap(() => createGoal(payload), 'Goal created', 'Failed to create goal');
  const handleRefresh = async () => {
    try {
      await refresh();
      addToast('info', 'Synchronized with server');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to refresh');
    }
  };

  const showLoading = isLoadingUser || (activeView !== 'users' && isLoading && !!currentHousehold);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none" aria-live="polite">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border backdrop-blur-md text-sm font-medium ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-200 border-emerald-800'
                : toast.type === 'error'
                ? 'bg-rose-950/90 text-rose-200 border-rose-800'
                : 'bg-slate-900/90 text-slate-200 border-slate-700'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
            {toast.type === 'info' && <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />}
            <span>{toast.message}</span>
            <button onClick={() => removeToast(toast.id)} className="text-slate-400 hover:text-slate-200 p-0.5 ml-2 rounded">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6 flex-1">
        <Header
          householdName={currentHousehold?.name || 'Tazkiyah'}
          userName={currentUser?.full_name ?? null}
          zbbSummary={zbbSummary}
          netLiquidWorth={netLiquidWorth}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
          onOpenAddAccount={() => setIsAddAccountOpen(true)}
        />

        {error && (
          <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-sm flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh}>Retry</Button>
          </div>
        )}

        <Navigation
          activeView={activeView}
          onViewChange={setActiveView}
          overspentCount={overspentEnvelopes.length}
          transactionsCount={transactions.length}
        />

        <main className="flex-1">
          {showLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-12 h-12 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
              <p className="text-sm text-slate-400 font-mono">Loading Tazkiyah…</p>
            </div>
          ) : (
            <>
              {activeView === 'accounts' && (
                <AccountsSummary
                  accounts={accounts}
                  netLiquidWorth={netLiquidWorth}
                  totalCash={totalCash}
                  totalBank={totalBank}
                  totalEmi={totalEmi}
                  totalCredit={totalCredit}
                  onOpenAddAccount={() => setIsAddAccountOpen(true)}
                  onEditAccount={setEditingAccount}
                  isLoading={isLoading}
                />
              )}

              {activeView === 'budget' && (
                <div className="flex flex-col gap-6">
                  <ZBBOverviewBar
                    zbbSummary={zbbSummary}
                    unassignedCash={unassignedCash}
                    isZeroBalanced={isZeroBalanced}
                    overspentCount={overspentEnvelopes.length}
                    onOpenAssignModal={() => {
                      setSelectedEnvelopeForAssign(null);
                      setIsAssignModalOpen(true);
                    }}
                    onOpenRebalanceModal={() => {
                      setRebalanceSourceEnvelope(null);
                      setRebalanceTargetEnvelope(null);
                      setIsRebalanceModalOpen(true);
                    }}
                    onOpenAddEnvelopeModal={() => {
                      setAddEnvelopeDefaultGroupId(undefined);
                      setIsAddEnvelopeModalOpen(true);
                    }}
                    onOpenAddGroupModal={() => setIsAddGroupModalOpen(true)}
                    isLoading={isLoading}
                  />
                  <BudgetTable
                    envelopeGroups={envelopeGroups}
                    onAssignEnvelope={(env) => {
                      setSelectedEnvelopeForAssign(env);
                      setIsAssignModalOpen(true);
                    }}
                    onRebalanceEnvelope={(sourceEnv, targetEnv) => {
                      setRebalanceSourceEnvelope(sourceEnv || null);
                      setRebalanceTargetEnvelope(targetEnv || null);
                      setIsRebalanceModalOpen(true);
                    }}
                    onAddEnvelope={(groupId) => {
                      setAddEnvelopeDefaultGroupId(groupId);
                      setIsAddEnvelopeModalOpen(true);
                    }}
                    onAddGroup={() => setIsAddGroupModalOpen(true)}
                    onEditEnvelope={setEditingEnvelope}
                    onEditGroup={setEditingGroup}
                    isLoading={isLoading}
                  />
                </div>
              )}

              {activeView === 'ledger' && (
                <TransactionLedger
                  transactions={transactions}
                  accounts={accounts}
                  envelopeGroups={envelopeGroups}
                  cpiTrends={cpiTrends}
                  onLogTransaction={handleLogTransaction}
                  onEditTransaction={setEditingTransaction}
                  isLoading={isLoading}
                />
              )}

              {activeView === 'cpi' && <CPIVisualizer cpiTrends={cpiTrends} isLoading={isLoading} />}

              {activeView === 'goals' && (
                <div className="flex flex-col gap-6">
                  <EmergencyRunway
                    netLiquidWorth={netLiquidWorth}
                    totalCash={totalCash}
                    totalBank={totalBank}
                    totalEmi={totalEmi}
                    zbbSummary={zbbSummary}
                    envelopeGroups={envelopeGroups}
                  />
                  <GoalsTracker
                    goals={goals}
                    envelopeGroups={envelopeGroups}
                    onOpenAddGoal={() => setIsAddGoalOpen(true)}
                    onEditGoal={setEditingGoal}
                    isLoading={isLoading}
                  />
                </div>
              )}

              {activeView === 'users' && <UsersView addToast={addToast} />}
            </>
          )}
        </main>
      </div>

      <AddAccountModal isOpen={isAddAccountOpen} onClose={() => setIsAddAccountOpen(false)} onSubmit={handleCreateAccount} />
      <AssignIncomeModal
        isOpen={isAssignModalOpen}
        onClose={() => {
          setIsAssignModalOpen(false);
          setSelectedEnvelopeForAssign(null);
        }}
        envelope={selectedEnvelopeForAssign}
        envelopeGroups={envelopeGroups}
        unassignedCash={unassignedCash}
        onSubmit={handleAssignBudget}
      />
      <RebalanceModal
        isOpen={isRebalanceModalOpen}
        onClose={() => {
          setIsRebalanceModalOpen(false);
          setRebalanceSourceEnvelope(null);
          setRebalanceTargetEnvelope(null);
        }}
        sourceEnvelope={rebalanceSourceEnvelope}
        targetEnvelope={rebalanceTargetEnvelope}
        envelopeGroups={envelopeGroups}
        onSubmit={handleRebalanceEnvelopes}
      />
      <AddEnvelopeModal
        isOpen={isAddEnvelopeModalOpen}
        onClose={() => {
          setIsAddEnvelopeModalOpen(false);
          setAddEnvelopeDefaultGroupId(undefined);
        }}
        envelopeGroups={envelopeGroups}
        defaultGroupId={addEnvelopeDefaultGroupId}
        onSubmit={handleCreateEnvelope}
      />
      <AddGroupModal
        isOpen={isAddGroupModalOpen}
        onClose={() => setIsAddGroupModalOpen(false)}
        existingGroupsCount={envelopeGroups.length}
        onSubmit={handleCreateEnvelopeGroup}
      />
      <AddGoalModal
        isOpen={isAddGoalOpen}
        onClose={() => setIsAddGoalOpen(false)}
        envelopeGroups={envelopeGroups}
        onSubmit={handleCreateGoal}
      />

      <EditAccountModal
        isOpen={!!editingAccount}
        onClose={() => setEditingAccount(null)}
        account={editingAccount}
        onSubmit={(id, payload) => wrap(() => updateAccount(id, payload), 'Account updated', 'Failed to update account')}
        onDelete={(id) => wrap(() => deleteAccount(id), 'Account deleted', 'Failed to delete account')}
      />
      <EditGoalModal
        isOpen={!!editingGoal}
        onClose={() => setEditingGoal(null)}
        goal={editingGoal}
        onSubmit={(id, payload) => wrap(() => updateGoal(id, payload), 'Goal updated', 'Failed to update goal')}
        onDelete={(id) => wrap(() => deleteGoal(id), 'Goal deleted', 'Failed to delete goal')}
      />
      <EditEnvelopeModal
        isOpen={!!editingEnvelope}
        onClose={() => setEditingEnvelope(null)}
        envelope={editingEnvelope}
        onSubmit={(id, payload) => wrap(() => updateEnvelope(id, payload), 'Envelope updated', 'Failed to update envelope')}
        onDelete={(id) => wrap(() => deleteEnvelope(id), 'Envelope deleted', 'Failed to delete envelope')}
      />
      <EditGroupModal
        isOpen={!!editingGroup}
        onClose={() => setEditingGroup(null)}
        group={editingGroup}
        onSubmit={(id, payload) => wrap(() => updateEnvelopeGroup(id, payload), 'Group updated', 'Failed to update group')}
        onDelete={(id) => wrap(() => deleteEnvelopeGroup(id), 'Group deleted', 'Failed to delete group')}
      />
      <EditTransactionModal
        isOpen={!!editingTransaction}
        onClose={() => setEditingTransaction(null)}
        transaction={editingTransaction}
        accounts={accounts}
        envelopeGroups={envelopeGroups}
        onSubmit={(id, payload) => wrap(() => updateTransaction(id, payload), 'Transaction updated', 'Failed to update transaction')}
        onDelete={(id) => wrap(() => deleteTransaction(id), 'Transaction deleted', 'Failed to delete transaction')}
      />
    </div>
  );
}

export default App;
