import { useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDashboardData } from '../../src/hooks/useDashboardData';
import { useUser } from '../../src/context/UserContext';
import { StapleCard } from '../../src/features/cpi';

export default function CPIScreen() {
  const { currentHousehold } = useUser();
  const householdId = currentHousehold?.id ?? null;
  const { cpiTrends, loading, error, refresh } = useDashboardData(householdId);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const avgInflation = useMemo(() => {
    const rates = cpiTrends
      .map((t) => t.inflation_rate_percentage)
      .filter((r): r is number => r != null);
    if (rates.length === 0) return null;
    return rates.reduce((a, b) => a + b, 0) / rates.length;
  }, [cpiTrends]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
      >
        {loading && !refreshing && <ActivityIndicator style={{ marginTop: 40 }} color="#6366f1" />}
        {error && <Text style={styles.errorText}>{error}</Text>}

        {avgInflation != null && (
          <View style={styles.summary}>
            <Text style={styles.summaryLabel}>Personal Basket Inflation (avg MoM)</Text>
            <Text
              style={[
                styles.summaryValue,
                { color: avgInflation > 0 ? '#f87171' : avgInflation < 0 ? '#4ade80' : '#f1f5f9' },
              ]}
            >
              {avgInflation > 0 ? '+' : ''}
              {avgInflation.toFixed(2)}%
            </Text>
          </View>
        )}

        {cpiTrends.length === 0 && !loading ? (
          <Text style={styles.emptyText}>
            No staple prices tracked yet. Log receipts with items like potato, milk, or petrol to build
            your personal CPI.
          </Text>
        ) : (
          cpiTrends.map((item) => <StapleCard key={item.canonical_item_id} item={item} />)
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  errorText: { color: '#f87171', textAlign: 'center', padding: 16 },
  summary: {
    backgroundColor: '#1e293b',
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  summaryLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  summaryValue: { fontSize: 26, fontWeight: '800', marginTop: 4 },
  emptyText: { color: '#64748b', textAlign: 'center', marginTop: 60, fontSize: 14, paddingHorizontal: 32 },
});
