import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import type { EnvelopeGroupResponse, EnvelopeResponse } from '../../types/api';
import { FormModal, formModalStyles as m } from '../../components/FormModal';

interface Props {
  visible: boolean;
  onClose: () => void;
  envelopeGroups: EnvelopeGroupResponse[];
  unassignedCash: number;
  onSubmit: (envelopeId: string, assignedAmount: number) => Promise<void>;
}

function num(v: number | string): number {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return isNaN(n) ? 0 : n;
}

function fmt(v: number): string {
  return `Rs ${v.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
}

export function AssignIncomeModal({ visible, onClose, envelopeGroups, unassignedCash, onSubmit }: Props) {
  const allEnvelopes = useMemo(
    () => envelopeGroups.flatMap((g) => g.envelopes.map((e) => ({ env: e, group: g.name }))),
    [envelopeGroups],
  );

  const [selectedId, setSelectedId] = useState('');
  const [amount, setAmount] = useState('0');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active: EnvelopeResponse | undefined = allEnvelopes.find((x) => x.env.id === selectedId)?.env;
  const currentAssigned = active ? num(active.assigned_amount) : 0;
  const nextAssigned = parseFloat(amount) || 0;
  const delta = nextAssigned - currentAssigned;
  const isOver = delta > unassignedCash + 0.001;
  const maxAllowed = Math.max(0, currentAssigned + unassignedCash);

  useEffect(() => {
    if (visible) {
      const first = allEnvelopes[0]?.env;
      setSelectedId(first?.id ?? '');
      setAmount(first ? String(num(first.assigned_amount)) : '0');
      setError(null);
    }
  }, [visible, allEnvelopes]);

  const pick = (id: string) => {
    setSelectedId(id);
    const e = allEnvelopes.find((x) => x.env.id === id)?.env;
    setAmount(e ? String(num(e.assigned_amount)) : '0');
    setError(null);
  };

  const handleSubmit = async () => {
    if (!active) {
      setError('Select an envelope.');
      return;
    }
    if (isNaN(nextAssigned) || nextAssigned < 0) {
      setError('Amount must be 0 or a positive number.');
      return;
    }
    if (isOver) {
      setError(`Exceeds unassigned cash (${fmt(unassignedCash)}). Max allowed is ${fmt(maxAllowed)}.`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(active.id, nextAssigned);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign funds.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormModal
      visible={visible}
      title="Assign Income"
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel="Save Assignment"
      submitting={submitting}
      submitDisabled={isOver}
      error={error}
    >
      <View style={styles.poolRow}>
        <Text style={styles.poolLabel}>Unassigned cash</Text>
        <Text style={[styles.poolValue, { color: unassignedCash >= 0 ? '#fbbf24' : '#f87171' }]}>
          {fmt(unassignedCash)}
        </Text>
      </View>

      <Text style={m.label}>Envelope</Text>
      <View style={m.pickerRow}>
        {allEnvelopes.map(({ env, group }) => {
          const on = env.id === selectedId;
          return (
            <TouchableOpacity
              key={env.id}
              style={[m.pill, on && m.pillActive]}
              onPress={() => pick(env.id)}
            >
              <Text style={[m.pillText, on && m.pillTextActive]}>
                {group} · {env.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={m.label}>New assigned amount (Rs)</Text>
      <TextInput
        style={m.input}
        keyboardType="numeric"
        value={amount}
        onChangeText={(v) => {
          setAmount(v);
          setError(null);
        }}
        placeholder="0"
        placeholderTextColor="#64748b"
      />
      {active && (
        <Text style={m.hint}>
          Currently {fmt(currentAssigned)} · change {delta >= 0 ? '+' : ''}
          {fmt(delta)} · max {fmt(maxAllowed)}
        </Text>
      )}

      {unassignedCash > 0 && active && (
        <TouchableOpacity
          style={styles.quick}
          onPress={() => setAmount(String(Math.round(currentAssigned + unassignedCash)))}
        >
          <Text style={styles.quickText}>Assign all unassigned ({fmt(unassignedCash)})</Text>
        </TouchableOpacity>
      )}
    </FormModal>
  );
}

const styles = StyleSheet.create({
  poolRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  poolLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },
  poolValue: { fontSize: 14, fontWeight: '800' },
  quick: {
    marginTop: 10,
    backgroundColor: '#3f2d0a',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#a16207',
  },
  quickText: { color: '#fbbf24', fontSize: 12, fontWeight: '700' },
});
