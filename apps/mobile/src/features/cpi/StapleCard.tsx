import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { CPITrendItem } from '../../types/api';
import { CPISparkline } from './CPISparkline';

function fmt(n: number | string | null | undefined): string {
  const v = typeof n === 'string' ? parseFloat(n) : Number(n ?? 0);
  return `Rs ${(isNaN(v) ? 0 : v).toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-PK', { month: 'short', year: '2-digit' });
}

export function StapleCard({ item }: { item: CPITrendItem }) {
  const [expanded, setExpanded] = useState(false);

  const inflation = item.inflation_rate_percentage;
  const trend: 'up' | 'down' | 'flat' =
    inflation == null || Math.abs(inflation) < 0.01 ? 'flat' : inflation > 0 ? 'up' : 'down';

  const badge = useMemo(() => {
    if (inflation == null) return { text: 'New', color: '#64748b' };
    const arrow = trend === 'up' ? '▲' : trend === 'down' ? '▼' : '–';
    const color = trend === 'up' ? '#f87171' : trend === 'down' ? '#4ade80' : '#94a3b8';
    return { text: `${arrow} ${Math.abs(inflation).toFixed(1)}% MoM`, color };
  }, [inflation, trend]);

  const merchantRows = useMemo(
    () =>
      [...item.history]
        .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())
        .slice(0, 12),
    [item.history],
  );

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={() => setExpanded((e) => !e)}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.unit}>per {item.standard_unit} · {item.category}</Text>
        </View>
        <CPISparkline history={item.history} trend={trend} />
      </View>

      <View style={styles.footer}>
        <Text style={styles.price}>{fmt(item.latest_price)}</Text>
        <Text style={[styles.badge, { color: badge.color }]}>{badge.text}</Text>
      </View>

      {expanded && (
        <View style={styles.detail}>
          <Text style={styles.detailTitle}>Price history by merchant</Text>
          {merchantRows.length === 0 && <Text style={styles.empty}>No price points recorded.</Text>}
          {merchantRows.map((h, i) => (
            <View key={`${h.recorded_at}-${i}`} style={styles.row}>
              <Text style={styles.rowMerchant} numberOfLines={1}>
                {h.merchant ?? 'Unknown merchant'}
              </Text>
              <Text style={styles.rowDate}>{fmtDate(h.recorded_at)}</Text>
              <Text style={styles.rowPrice}>{fmt(h.unit_price)}</Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { color: '#f1f5f9', fontSize: 15, fontWeight: '700' },
  unit: { color: '#64748b', fontSize: 11, marginTop: 2 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 10 },
  price: { color: '#a5f3fc', fontSize: 18, fontWeight: '800' },
  badge: { fontSize: 12, fontWeight: '700' },
  detail: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#334155' },
  detailTitle: { color: '#94a3b8', fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 6 },
  empty: { color: '#64748b', fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  rowMerchant: { color: '#e2e8f0', fontSize: 12, flex: 1 },
  rowDate: { color: '#64748b', fontSize: 11, width: 60, textAlign: 'right' },
  rowPrice: { color: '#e2e8f0', fontSize: 12, fontWeight: '600', width: 90, textAlign: 'right' },
});
