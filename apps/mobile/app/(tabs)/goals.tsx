import { useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDashboardData } from '../../src/hooks/useDashboardData';
import { useUser } from '../../src/context/UserContext';
import * as api from '../../src/services/api';
import { EmergencyRunway, AddGoalModal } from '../../src/features/goals';
import type { GoalResponse, GoalType } from '../../src/types/api';

function fmt(n: number | string) {
  return `Rs ${parseFloat(String(n)).toLocaleString('en-PK', { minimumFractionDigits: 0 })}`;
}

function GoalCard({ goal, onDelete }: { goal: GoalResponse; onDelete: (g: GoalResponse) => void }) {
  const target = parseFloat(String(goal.target_amount));
  const current = parseFloat(String(goal.current_balance));
  const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  const remaining = Math.max(0, target - current);
  const isComplete = pct >= 100;

  // Prefer the backend-computed pacing; fall back to a local estimate.
  const backendPacing =
    goal.monthly_pacing != null ? parseFloat(String(goal.monthly_pacing)) : null;
  const monthsLeft = goal.target_date
    ? Math.max(1, Math.ceil((new Date(goal.target_date).getTime() - Date.now()) / (30 * 24 * 60 * 60 * 1000)))
    : null;
  const monthlyRequired =
    backendPacing != null ? backendPacing : monthsLeft ? remaining / monthsLeft : null;

  return (
    <TouchableOpacity
      activeOpacity={1}
      onLongPress={() => onDelete(goal)}
      delayLongPress={400}
      style={[styles.card, isComplete && styles.cardComplete]}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.goalName}>{goal.name}</Text>
        <Text style={styles.pct}>{pct.toFixed(0)}%</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct}%` as `${number}%` }]} />
      </View>
      <View style={styles.statsRow}>
        <Text style={styles.stat}>{fmt(current)} saved</Text>
        <Text style={styles.stat}>{fmt(target)} target</Text>
      </View>
      {monthlyRequired != null && monthlyRequired > 0 && !isComplete && (
        <Text style={styles.pacing}>
          📅 {fmt(monthlyRequired)}/mo needed{monthsLeft ? ` · ${monthsLeft} months left` : ''}
        </Text>
      )}
      {isComplete && <Text style={styles.complete}>✅ Goal achieved!</Text>}
      <Text style={styles.longPressHint}>long-press to delete</Text>
    </TouchableOpacity>
  );
}

export default function GoalsScreen() {
  const { currentHousehold } = useUser();
  const householdId = currentHousehold?.id ?? null;
  const { goals, envelopeGroups, zbbSummary, netLiquidWorth, loading, refresh } =
    useDashboardData(householdId);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const handleAddGoal = useCallback(
    async (payload: {
      name: string;
      goal_type: GoalType;
      target_amount: number;
      target_date?: string;
      envelope_id?: string;
      current_balance?: number;
    }) => {
      if (!householdId) return;
      await api.createGoal({ household_id: householdId, ...payload });
      await refresh();
    },
    [householdId, refresh],
  );

  const handleDeleteGoal = useCallback(
    (goal: GoalResponse) => {
      if (!householdId) return;
      Alert.alert('Delete goal', `Delete "${goal.name}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteGoal(goal.id, householdId);
              await refresh();
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete goal');
            }
          },
        },
      ]);
    },
    [householdId, refresh],
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}>
        <EmergencyRunway
          netLiquidWorth={netLiquidWorth}
          envelopeGroups={envelopeGroups}
          zbbSummary={zbbSummary}
        />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Goals ({goals.length})</Text>
          <TouchableOpacity onPress={() => setShowAdd(true)}>
            <Text style={styles.addLink}>＋ New Goal</Text>
          </TouchableOpacity>
        </View>

        {goals.length === 0 && !loading && (
          <Text style={styles.emptyText}>No goals yet. Tap “＋ New Goal” to create one.</Text>
        )}
        {goals.map((g) => (
          <GoalCard key={g.id} goal={g} onDelete={handleDeleteGoal} />
        ))}
        <View style={{ height: 32 }} />
      </ScrollView>

      <AddGoalModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        envelopeGroups={envelopeGroups}
        onSubmit={handleAddGoal}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
  },
  sectionTitle: { color: '#94a3b8', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  addLink: { color: '#818cf8', fontSize: 13, fontWeight: '700' },
  longPressHint: { color: '#475569', fontSize: 10, marginTop: 8 },
  card: { backgroundColor: '#1e293b', marginHorizontal: 16, marginBottom: 8, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#334155' },
  cardComplete: { borderColor: '#16a34a' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  goalName: { color: '#f1f5f9', fontSize: 16, fontWeight: '700', flex: 1 },
  pct: { color: '#6366f1', fontSize: 16, fontWeight: '800' },
  progressTrack: { height: 6, backgroundColor: '#334155', borderRadius: 3, overflow: 'hidden', marginBottom: 10 },
  progressFill: { height: 6, backgroundColor: '#6366f1', borderRadius: 3 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { color: '#94a3b8', fontSize: 13 },
  pacing: { color: '#fbbf24', fontSize: 13, marginTop: 8, fontWeight: '600' },
  complete: { color: '#4ade80', fontSize: 13, marginTop: 8, fontWeight: '700' },
  emptyText: { color: '#64748b', textAlign: 'center', marginTop: 32, fontSize: 14, paddingHorizontal: 32 },
});
