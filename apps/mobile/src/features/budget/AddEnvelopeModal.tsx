import React, { useEffect, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { EnvelopeGroupResponse } from '../../types/api';
import { FormModal, formModalStyles as m } from '../../components/FormModal';

interface Props {
  visible: boolean;
  onClose: () => void;
  envelopeGroups: EnvelopeGroupResponse[];
  defaultGroupId?: string;
  onSubmit: (payload: { group_id: string; name: string; target_amount?: number }) => Promise<void>;
}

export function AddEnvelopeModal({ visible, onClose, envelopeGroups, defaultGroupId, onSubmit }: Props) {
  const [groupId, setGroupId] = useState('');
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setGroupId(defaultGroupId ?? envelopeGroups[0]?.id ?? '');
      setName('');
      setTarget('');
      setError(null);
    }
  }, [visible, defaultGroupId, envelopeGroups]);

  const handleSubmit = async () => {
    if (!groupId) {
      setError('Pick a group.');
      return;
    }
    if (!name.trim()) {
      setError('Envelope name is required.');
      return;
    }
    const t = parseFloat(target);
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        group_id: groupId,
        name: name.trim(),
        target_amount: !isNaN(t) && t > 0 ? t : undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create envelope.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormModal
      visible={visible}
      title="Add Envelope"
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel="Create Envelope"
      submitting={submitting}
      error={error}
    >
      <Text style={m.label}>Group</Text>
      <View style={m.pickerRow}>
        {envelopeGroups.map((g) => {
          const on = g.id === groupId;
          return (
            <TouchableOpacity key={g.id} style={[m.pill, on && m.pillActive]} onPress={() => setGroupId(g.id)}>
              <Text style={[m.pillText, on && m.pillTextActive]}>{g.name}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={m.label}>Envelope name</Text>
      <TextInput
        style={m.input}
        value={name}
        onChangeText={(t) => {
          setName(t);
          setError(null);
        }}
        placeholder="e.g. Groceries"
        placeholderTextColor="#64748b"
      />

      <Text style={m.label}>Monthly target (Rs, optional)</Text>
      <TextInput
        style={m.input}
        keyboardType="numeric"
        value={target}
        onChangeText={setTarget}
        placeholder="0"
        placeholderTextColor="#64748b"
      />
    </FormModal>
  );
}
