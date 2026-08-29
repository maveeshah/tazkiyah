import React, { useEffect, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { EnvelopeGroupResponse, GoalType } from '../../types/api';
import { FormModal, formModalStyles as m } from '../../components/FormModal';

interface Props {
  visible: boolean;
  onClose: () => void;
  envelopeGroups: EnvelopeGroupResponse[];
  onSubmit: (payload: {
    name: string;
    goal_type: GoalType;
    target_amount: number;
    target_date?: string;
    envelope_id?: string;
    current_balance?: number;
  }) => Promise<void>;
}

const GOAL_TYPES: { value: GoalType; label: string }[] = [
  { value: 'TARGET_BY_DATE', label: 'By date' },
  { value: 'TARGET_CAP', label: 'Target cap' },
  { value: 'SINKING_FUND', label: 'Sinking fund' },
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function AddGoalModal({ visible, onClose, envelopeGroups, onSubmit }: Props) {
  const [name, setName] = useState('');
  const [goalType, setGoalType] = useState<GoalType>('TARGET_BY_DATE');
  const [target, setTarget] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [currentBalance, setCurrentBalance] = useState('');
  const [envelopeId, setEnvelopeId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const envelopes = envelopeGroups.flatMap((g) => g.envelopes.map((e) => ({ e, group: g.name })));

  useEffect(() => {
    if (visible) {
      setName('');
      setGoalType('TARGET_BY_DATE');
      setTarget('');
      setTargetDate('');
      setCurrentBalance('');
      setEnvelopeId('');
      setError(null);
    }
  }, [visible]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Goal name is required.');
      return;
    }
    const t = parseFloat(target);
    if (isNaN(t) || t <= 0) {
      setError('Target amount must be greater than 0.');
      return;
    }
    if (goalType === 'TARGET_BY_DATE') {
      if (!DATE_RE.test(targetDate)) {
        setError('Target date is required as YYYY-MM-DD for a by-date goal.');
        return;
      }
    }
    const cb = parseFloat(currentBalance);
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        name: name.trim(),
        goal_type: goalType,
        target_amount: t,
        target_date: goalType === 'TARGET_BY_DATE' ? targetDate : undefined,
        envelope_id: envelopeId || undefined,
        current_balance: !isNaN(cb) && cb > 0 ? cb : undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create goal.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormModal
      visible={visible}
      title="New Goal"
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel="Create Goal"
      submitting={submitting}
      error={error}
    >
      <Text style={m.label}>Name</Text>
      <TextInput
        style={m.input}
        value={name}
        onChangeText={(v) => {
          setName(v);
          setError(null);
        }}
        placeholder="e.g. Umrah 2027"
        placeholderTextColor="#64748b"
      />

      <Text style={m.label}>Type</Text>
      <View style={m.pickerRow}>
        {GOAL_TYPES.map((gt) => {
          const on = gt.value === goalType;
          return (
            <TouchableOpacity
              key={gt.value}
              style={[m.pill, on && m.pillActive]}
              onPress={() => setGoalType(gt.value)}
            >
              <Text style={[m.pillText, on && m.pillTextActive]}>{gt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={m.label}>Target amount (Rs)</Text>
      <TextInput
        style={m.input}
        keyboardType="numeric"
        value={target}
        onChangeText={(v) => {
          setTarget(v);
          setError(null);
        }}
        placeholder="0"
        placeholderTextColor="#64748b"
      />

      {goalType === 'TARGET_BY_DATE' && (
        <>
          <Text style={m.label}>Target date (YYYY-MM-DD)</Text>
          <TextInput
            style={m.input}
            value={targetDate}
            onChangeText={(v) => {
              setTargetDate(v);
              setError(null);
            }}
            placeholder="2027-06-01"
            placeholderTextColor="#64748b"
            autoCapitalize="none"
          />
        </>
      )}

      <Text style={m.label}>Starting balance (Rs, optional)</Text>
      <TextInput
        style={m.input}
        keyboardType="numeric"
        value={currentBalance}
        onChangeText={setCurrentBalance}
        placeholder="0"
        placeholderTextColor="#64748b"
      />

      {envelopes.length > 0 && (
        <>
          <Text style={m.label}>Link to envelope (optional)</Text>
          <Text style={m.hint}>A linked goal reads its balance live from the envelope.</Text>
          <View style={m.pickerRow}>
            <TouchableOpacity
              style={[m.pill, envelopeId === '' && m.pillActive]}
              onPress={() => setEnvelopeId('')}
            >
              <Text style={[m.pillText, envelopeId === '' && m.pillTextActive]}>None</Text>
            </TouchableOpacity>
            {envelopes.map(({ e, group }) => {
              const on = e.id === envelopeId;
              return (
                <TouchableOpacity
                  key={e.id}
                  style={[m.pill, on && m.pillActive]}
                  onPress={() => setEnvelopeId(e.id)}
                >
                  <Text style={[m.pillText, on && m.pillTextActive]}>
                    {group} · {e.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}
    </FormModal>
  );
}
