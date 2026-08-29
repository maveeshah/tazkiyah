import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import type { EnvelopeGroupResponse } from '../../types/api';
import { FormModal, formModalStyles as m } from '../../components/FormModal';

interface Props {
  visible: boolean;
  onClose: () => void;
  envelopeGroups: EnvelopeGroupResponse[];
  onSubmit: (fromEnvelopeId: string, toEnvelopeId: string, amount: number) => Promise<void>;
}

function fmt(v: number): string {
  return `Rs ${v.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
}

export function RebalanceModal({ visible, onClose, envelopeGroups, onSubmit }: Props) {
  const envs = useMemo(
    () => envelopeGroups.flatMap((g) => g.envelopes.map((e) => ({ e, group: g.name }))),
    [envelopeGroups],
  );

  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setFromId(envs[0]?.e.id ?? '');
      setToId(envs[1]?.e.id ?? envs[0]?.e.id ?? '');
      setAmount('');
      setError(null);
    }
  }, [visible, envs]);

  const fromEnv = envs.find((x) => x.e.id === fromId)?.e;
  const available = fromEnv ? fromEnv.available_balance : 0;
  const value = parseFloat(amount) || 0;

  const handleSubmit = async () => {
    if (!fromId || !toId) {
      setError('Pick both envelopes.');
      return;
    }
    if (fromId === toId) {
      setError('Source and destination must differ.');
      return;
    }
    if (value <= 0) {
      setError('Amount must be greater than 0.');
      return;
    }
    if (value > available + 0.001) {
      setError(`Only ${fmt(available)} available in the source envelope.`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(fromId, toId, value);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rebalance.');
    } finally {
      setSubmitting(false);
    }
  };

  const Picker = ({ value: v, onPick }: { value: string; onPick: (id: string) => void }) => (
    <View style={m.pickerRow}>
      {envs.map(({ e, group }) => {
        const on = e.id === v;
        return (
          <TouchableOpacity key={e.id} style={[m.pill, on && m.pillActive]} onPress={() => onPick(e.id)}>
            <Text style={[m.pillText, on && m.pillTextActive]}>
              {group} · {e.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <FormModal
      visible={visible}
      title="Rebalance Envelopes"
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel="Transfer"
      submitting={submitting}
      error={error}
    >
      <Text style={m.label}>From</Text>
      <Picker value={fromId} onPick={setFromId} />
      {fromEnv && <Text style={m.hint}>Available: {fmt(available)}</Text>}

      <Text style={m.label}>To</Text>
      <Picker value={toId} onPick={setToId} />

      <Text style={m.label}>Amount (Rs)</Text>
      <TextInput
        style={m.input}
        keyboardType="numeric"
        value={amount}
        onChangeText={(t) => {
          setAmount(t);
          setError(null);
        }}
        placeholder="0"
        placeholderTextColor="#64748b"
      />
      <View style={styles.note}>
        <Text style={styles.noteText}>
          Rebalancing moves assigned funds between envelopes. Total assigned and unassigned cash stay
          the same.
        </Text>
      </View>
    </FormModal>
  );
}

const styles = StyleSheet.create({
  note: { marginTop: 12, backgroundColor: '#0f172a', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#334155' },
  noteText: { color: '#64748b', fontSize: 11, lineHeight: 16 },
});
