import { useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDashboardData } from '../../src/hooks/useDashboardData';
import { useUser } from '../../src/context/UserContext';
import * as api from '../../src/services/api';
import type { TransactionResponse } from '../../src/types/api';

function fmt(n: number | string) {
  return `Rs ${parseFloat(String(n)).toLocaleString('en-PK', { minimumFractionDigits: 0 })}`;
}

function sourceEmoji(s: string) {
  return s === 'WHATSAPP' ? '💬' : s === 'MOBILE' ? '📱' : '🌐';
}

function TransactionCard({ tx, onDelete }: { tx: TransactionResponse; onDelete: (tx: TransactionResponse) => void }) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(tx.transacted_at).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' });
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => setExpanded((e) => !e)}
      onLongPress={() => onDelete(tx)}
      delayLongPress={400}
      activeOpacity={0.8}
    >
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.merchant}>{tx.merchant ?? 'Purchase'} <Text style={styles.sourceEmoji}>{sourceEmoji(tx.source)}</Text></Text>
          <Text style={styles.date}>{date}</Text>
        </View>
        <Text style={styles.amount}>{fmt(tx.total_amount)}</Text>
      </View>
      {expanded && (
        <View style={styles.lineItems}>
          {tx.line_items.map((li) => (
            <View key={li.id} style={styles.lineItem}>
              <Text style={styles.liName}>{li.raw_item_name}</Text>
              <Text style={styles.liPrice}>{fmt(li.total_price)}</Text>
            </View>
          ))}
          <TouchableOpacity onPress={() => onDelete(tx)} style={styles.deleteBtn}>
            <Text style={styles.deleteBtnText}>Delete transaction</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function LedgerScreen() {
  const { currentHousehold } = useUser();
  const householdId = currentHousehold?.id ?? null;
  const { transactions, loading, refresh } = useDashboardData(householdId);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const handleDelete = useCallback(
    (tx: TransactionResponse) => {
      if (!householdId) return;
      Alert.alert(
        'Delete transaction',
        `Delete "${tx.merchant ?? 'Purchase'}" (${fmt(tx.total_amount)})? The account balance and envelope spend will be reverted.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await api.deleteTransaction(tx.id, householdId);
                await refresh();
              } catch (err) {
                Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete');
              }
            },
          },
        ],
      );
    },
    [householdId, refresh],
  );

  const filtered = transactions.filter(
    (tx) => !search || (tx.merchant ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by merchant…"
          placeholderTextColor="#64748b"
          value={search}
          onChangeText={setSearch}
        />
      </View>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}>
        {filtered.length === 0 && !loading && (
          <Text style={styles.emptyText}>No transactions yet. Log one via WhatsApp or the Log tab.</Text>
        )}
        <Text style={styles.hint}>Tap to expand · long-press to delete</Text>
        {filtered.map((tx) => (
          <TransactionCard key={tx.id} tx={tx} onDelete={handleDelete} />
        ))}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  searchRow: { padding: 12 },
  searchInput: { backgroundColor: '#1e293b', color: '#f1f5f9', borderRadius: 10, padding: 12, fontSize: 14 },
  hint: { color: '#475569', fontSize: 11, textAlign: 'center', marginBottom: 6 },
  card: { backgroundColor: '#1e293b', marginHorizontal: 16, marginBottom: 8, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#334155' },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  merchant: { color: '#f1f5f9', fontSize: 15, fontWeight: '700' },
  sourceEmoji: { fontSize: 12 },
  date: { color: '#64748b', fontSize: 12, marginTop: 2 },
  amount: { color: '#a5f3fc', fontSize: 16, fontWeight: '800' },
  lineItems: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#334155' },
  lineItem: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  liName: { color: '#94a3b8', fontSize: 13 },
  liPrice: { color: '#e2e8f0', fontSize: 13, fontWeight: '600' },
  deleteBtn: { marginTop: 8, alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, backgroundColor: '#450a0a', borderWidth: 1, borderColor: '#7f1d1d' },
  deleteBtnText: { color: '#fca5a5', fontSize: 12, fontWeight: '700' },
  emptyText: { color: '#64748b', textAlign: 'center', marginTop: 60, fontSize: 14, paddingHorizontal: 32 },
});
