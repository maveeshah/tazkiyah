import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { EnvelopeGroupResponse, ZBBSummaryResponse } from '../../types/api';

interface Props {
  netLiquidWorth: number;
  envelopeGroups: EnvelopeGroupResponse[];
  zbbSummary: ZBBSummaryResponse | null;
}

function num(v: number | string | null | undefined): number {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v ?? 0);
  return isNaN(n) ? 0 : n;
}
function fmt(v: number): string {
  return `Rs ${v.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
}

const SAVINGS_RE = /savings|sinking|goals|invest/i;

export function EmergencyRunway({ netLiquidWorth, envelopeGroups, zbbSummary }: Props) {
  const essentialMonthlyBurn = useMemo(() => {
    let essential = 0;
    envelopeGroups.forEach((g) => {
      if (SAVINGS_RE.test(g.name)) return;
      g.envelopes.forEach((e) => {
        essential += num(e.assigned_amount);
      });
    });
    if (essential === 0 && zbbSummary) {
      const totAssigned = num(zbbSummary.total_assigned);
      essential = totAssigned > 0 ? totAssigned * 0.65 : 65000;
    } else if (essential === 0) {
      essential = 65000;
    }
    return essential;
  }, [envelopeGroups, zbbSummary]);

  const runwayMonths = essentialMonthlyBurn > 0 ? netLiquidWorth / essentialMonthlyBurn : 0;

  const status = useMemo(() => {
    if (runwayMonths >= 6) return { label: 'Halal Freedom target reached', color: '#16a34a' };
    if (runwayMonths >= 3) return { label: 'Low risk — on track to 6 months', color: '#0ea5e9' };
    if (runwayMonths >= 1) return { label: 'Moderate risk — build the cushion', color: '#d97706' };
    return { label: 'High fragility — under 1 month of reserves', color: '#dc2626' };
  }, [runwayMonths]);

  const milestones = [
    { months: 1, title: 'Starter Cushion' },
    { months: 3, title: 'Basic Security' },
    { months: 6, title: 'Halal Freedom' },
    { months: 12, title: 'Fortress Runway' },
  ];

  return (
    <View style={styles.wrap}>
      <View style={[styles.hero, { borderColor: status.color }]}>
        <Text style={styles.heroLabel}>Emergency Liquid Runway</Text>
        <Text style={styles.heroValue}>
          {runwayMonths.toFixed(1)} <Text style={styles.heroUnit}>months</Text>
        </Text>
        <Text style={[styles.heroStatus, { color: status.color }]}>{status.label}</Text>
        <View style={styles.formulaRow}>
          <Text style={styles.formula}>Liquid {fmt(netLiquidWorth)}</Text>
          <Text style={styles.formulaDiv}>÷</Text>
          <Text style={styles.formula}>Burn {fmt(essentialMonthlyBurn)}/mo</Text>
        </View>
      </View>

      {milestones.map((mst) => {
        const target = essentialMonthlyBurn * mst.months;
        const pct = target > 0 ? Math.min(100, (netLiquidWorth / target) * 100) : 0;
        const done = runwayMonths >= mst.months;
        return (
          <View key={mst.months} style={styles.mstRow}>
            <View style={styles.mstHeader}>
              <Text style={styles.mstTitle}>
                {done ? '✅ ' : ''}
                {mst.months}mo · {mst.title}
              </Text>
              <Text style={styles.mstTarget}>{fmt(target)}</Text>
            </View>
            <View style={styles.track}>
              <View
                style={[styles.fill, { width: `${pct}%` as `${number}%`, backgroundColor: done ? '#16a34a' : '#6366f1' }]}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: 16, marginTop: 16 },
  hero: { backgroundColor: '#1e293b', borderRadius: 14, padding: 16, borderWidth: 1 },
  heroLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  heroValue: { color: '#f1f5f9', fontSize: 34, fontWeight: '900', marginTop: 4 },
  heroUnit: { color: '#4ade80', fontSize: 16, fontWeight: '700' },
  heroStatus: { fontSize: 13, fontWeight: '700', marginTop: 4 },
  formulaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  formula: { color: '#64748b', fontSize: 11, fontWeight: '600' },
  formulaDiv: { color: '#475569', fontSize: 12 },
  mstRow: { marginTop: 12 },
  mstHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  mstTitle: { color: '#e2e8f0', fontSize: 12, fontWeight: '600' },
  mstTarget: { color: '#94a3b8', fontSize: 12, fontWeight: '700' },
  track: { height: 5, backgroundColor: '#334155', borderRadius: 3, overflow: 'hidden' },
  fill: { height: 5, borderRadius: 3 },
});
