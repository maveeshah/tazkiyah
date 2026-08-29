import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, RefreshControl, StyleSheet,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDashboardData } from '../../src/hooks/useDashboardData';
import * as api from '../../src/services/api';
import {
  AssignIncomeModal,
  RebalanceModal,
  AddEnvelopeModal,
  AddGroupModal,
  AddAccountModal,
} from '../../src/features/budget';

import { useUser } from '../../src/context/UserContext';
import { useRouter } from 'expo-router';

type BudgetModalKind = 'assign' | 'rebalance' | 'envelope' | 'group' | 'account' | null;

function fmt(n: number | string | null | undefined): string {
  const val = typeof n === 'string' ? parseFloat(n) : (n ?? 0);
  return `Rs ${val.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function UnassignedBanner({ amount }: { amount: number | string }) {
  const val = parseFloat(String(amount));
  const isZero = Math.abs(val) < 1;
  const isNegative = val < 0;
  const bg = isZero ? '#16a34a' : isNegative ? '#dc2626' : '#d97706';
  const label = isZero ? '✅ Fully Budgeted' : isNegative ? '🚨 Over Budget' : '⚡ Unassigned Cash';
  return (
    <View style={[styles.banner, { backgroundColor: bg }]}>
      <Text style={styles.bannerLabel}>{label}</Text>
      <Text style={styles.bannerAmount}>{fmt(val)}</Text>
    </View>
  );
}

function AccountCard({ name, balance, isOverdrawn }: { name: string; balance: number | string; isOverdrawn: boolean }) {
  return (
    <View style={[styles.accountCard, isOverdrawn && styles.accountCardOverdrawn]}>
      <Text style={styles.accountName}>{name}</Text>
      <Text style={[styles.accountBalance, isOverdrawn && { color: '#f87171' }]}>{fmt(balance)}</Text>
      {isOverdrawn && <Text style={styles.overdraftTag}>OVERDRAWN</Text>}
    </View>
  );
}

function EnvelopeRow({ name, available, assigned }: { name: string; available: number; assigned: number | string }) {
  const isNegative = available < 0;
  const pct = Math.max(0, Math.min(100, assigned ? (available / parseFloat(String(assigned))) * 100 : 0));
  return (
    <View style={styles.envelopeRow}>
      <View style={styles.envelopeInfo}>
        <Text style={styles.envelopeName}>{name}</Text>
        <Text style={[styles.envelopeBalance, isNegative && { color: '#f87171' }]}>{fmt(available)}</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct}%` as `${number}%`, backgroundColor: isNegative ? '#dc2626' : '#6366f1' }]} />
      </View>
    </View>
  );
}

export default function BudgetScreen() {
  const router = useRouter();
  const { currentHousehold, isLoadingUser } = useUser();
  const householdId = currentHousehold?.id ?? null;
  const { accounts, zbbSummary, envelopeGroups, unassignedCash, loading, error, refresh } =
    useDashboardData(householdId);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal] = useState<BudgetModalKind>(null);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const handleAssign = useCallback(
    async (envelopeId: string, amount: number) => {
      if (!householdId) return;
      await api.assignEnvelope(householdId, envelopeId, amount);
      await refresh();
    },
    [householdId, refresh],
  );

  const handleRebalance = useCallback(
    async (fromEnvelopeId: string, toEnvelopeId: string, amount: number) => {
      if (!householdId) return;
      await api.rebalanceEnvelopes(householdId, {
        from_envelope_id: fromEnvelopeId,
        to_envelope_id: toEnvelopeId,
        amount,
      });
      await refresh();
    },
    [householdId, refresh],
  );

  const handleAddEnvelope = useCallback(
    async (payload: { group_id: string; name: string; target_amount?: number }) => {
      await api.createEnvelope(payload);
      await refresh();
    },
    [refresh],
  );

  const handleAddGroup = useCallback(
    async (name: string) => {
      if (!householdId) return;
      await api.createEnvelopeGroup({ household_id: householdId, name });
      await refresh();
    },
    [householdId, refresh],
  );

  const handleAddAccount = useCallback(
    async (payload: { name: string; type: 'CASH' | 'BANK' | 'EMI' | 'CREDIT'; current_balance: number }) => {
      if (!householdId) return;
      await api.createAccount({ household_id: householdId, ...payload });
      await refresh();
    },
    [householdId, refresh],
  );

  if (isLoadingUser) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.emptySubText}>Connecting to Tazkiyah Household...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!householdId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No Active Household Selected</Text>
          <Text style={styles.emptySubText}>Create or select a household in the Users tab to begin budgeting.</Text>
          <TouchableOpacity style={styles.manageBtn} onPress={() => router.push('/(tabs)/profile')}>
            <Text style={styles.manageBtnText}>Go to User Management</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
      >
        {loading && !refreshing && (
          <ActivityIndicator style={{ marginTop: 40 }} color="#6366f1" />
        )}
        {error && <Text style={styles.errorText}>{error}</Text>}

        {zbbSummary && <UnassignedBanner amount={zbbSummary.unassigned_cash} />}

        {/* Budget Actions */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setModal('assign')}>
            <Text style={styles.actionBtnText}>Assign Income</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setModal('rebalance')}>
            <Text style={styles.actionBtnText}>Rebalance</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtnSm} onPress={() => setModal('envelope')}>
            <Text style={styles.actionBtnText}>＋ Envelope</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtnSm} onPress={() => setModal('group')}>
            <Text style={styles.actionBtnText}>＋ Group</Text>
          </TouchableOpacity>
        </View>

        {/* Account Wallets */}
        <View style={styles.walletsHeader}>
          <Text style={styles.sectionTitle}>Wallets</Text>
          <TouchableOpacity onPress={() => setModal('account')}>
            <Text style={styles.addLink}>＋ Add account</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accountRow}>
          {accounts.length === 0 ? (
            <Text style={styles.emptySubText}>No accounts yet — add one to start budgeting.</Text>
          ) : (
            accounts.map(a => (
              <AccountCard key={a.id} name={a.name} balance={a.current_balance} isOverdrawn={a.is_overdrawn} />
            ))
          )}
        </ScrollView>

        {/* ZBB Stats */}
        {zbbSummary && (
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Inflow</Text>
              <Text style={styles.statValue}>{fmt(zbbSummary.total_inflow)}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Assigned</Text>
              <Text style={styles.statValue}>{fmt(zbbSummary.total_assigned)}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Spent</Text>
              <Text style={[styles.statValue, { color: '#f87171' }]}>{fmt(zbbSummary.total_spent)}</Text>
            </View>
          </View>
        )}

        {/* Envelopes */}
        {envelopeGroups.map(group => (
          <View key={group.id}>
            <Text style={styles.groupTitle}>{group.name}</Text>
            {group.envelopes.map(env => (
              <EnvelopeRow key={env.id} name={env.name} available={env.available_balance} assigned={env.assigned_amount} />
            ))}
          </View>
        ))}

        <View style={{ height: 32 }} />
      </ScrollView>

      <AssignIncomeModal
        visible={modal === 'assign'}
        onClose={() => setModal(null)}
        envelopeGroups={envelopeGroups}
        unassignedCash={unassignedCash}
        onSubmit={handleAssign}
      />
      <RebalanceModal
        visible={modal === 'rebalance'}
        onClose={() => setModal(null)}
        envelopeGroups={envelopeGroups}
        onSubmit={handleRebalance}
      />
      <AddEnvelopeModal
        visible={modal === 'envelope'}
        onClose={() => setModal(null)}
        envelopeGroups={envelopeGroups}
        onSubmit={handleAddEnvelope}
      />
      <AddGroupModal
        visible={modal === 'group'}
        onClose={() => setModal(null)}
        onSubmit={handleAddGroup}
      />
      <AddAccountModal
        visible={modal === 'account'}
        onClose={() => setModal(null)}
        onSubmit={handleAddAccount}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { color: '#f1f5f9', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  emptySubText: { color: '#94a3b8', fontSize: 13, textAlign: 'center', marginTop: 8 },
  errorText: { color: '#f87171', textAlign: 'center', padding: 16 },
  banner: { margin: 16, borderRadius: 12, padding: 16, alignItems: 'center' },
  bannerLabel: { color: '#fff', fontSize: 12, fontWeight: '700', letterSpacing: 1, opacity: 0.85 },
  bannerAmount: { color: '#fff', fontSize: 28, fontWeight: '800', marginTop: 4 },
  sectionTitle: { color: '#94a3b8', fontSize: 12, fontWeight: '700', letterSpacing: 1, paddingHorizontal: 16, marginTop: 8 },
  walletsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: 16 },
  addLink: { color: '#818cf8', fontSize: 12, fontWeight: '700', marginTop: 8 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, marginBottom: 4 },
  actionBtn: { flexGrow: 1, backgroundColor: '#4f46e5', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, alignItems: 'center' },
  actionBtnSm: { flexGrow: 1, backgroundColor: '#334155', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, alignItems: 'center' },
  actionBtnText: { color: '#f1f5f9', fontSize: 12, fontWeight: '700' },
  accountRow: { paddingLeft: 16, marginVertical: 8 },
  accountCard: { backgroundColor: '#1e293b', borderRadius: 12, padding: 14, marginRight: 12, minWidth: 140, borderWidth: 1, borderColor: '#334155' },
  accountCardOverdrawn: { borderColor: '#dc2626' },
  accountName: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },
  accountBalance: { color: '#f1f5f9', fontSize: 18, fontWeight: '800', marginTop: 4 },
  overdraftTag: { color: '#f87171', fontSize: 10, fontWeight: '700', marginTop: 4 },
  statsRow: { flexDirection: 'row', marginHorizontal: 16, marginVertical: 8, gap: 8 },
  stat: { flex: 1, backgroundColor: '#1e293b', borderRadius: 10, padding: 12, alignItems: 'center' },
  statLabel: { color: '#64748b', fontSize: 11, fontWeight: '600' },
  statValue: { color: '#f1f5f9', fontSize: 15, fontWeight: '700', marginTop: 2 },
  groupTitle: { color: '#6366f1', fontSize: 11, fontWeight: '800', letterSpacing: 1, paddingHorizontal: 16, marginTop: 16, marginBottom: 4 },
  envelopeRow: { backgroundColor: '#1e293b', marginHorizontal: 16, marginBottom: 6, borderRadius: 10, padding: 12 },
  envelopeInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  envelopeName: { color: '#e2e8f0', fontSize: 14, fontWeight: '600' },
  envelopeBalance: { color: '#a5f3fc', fontSize: 14, fontWeight: '700' },
  progressTrack: { height: 4, backgroundColor: '#334155', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2 },
  manageBtn: { marginTop: 16, backgroundColor: '#4f46e5', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  manageBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
