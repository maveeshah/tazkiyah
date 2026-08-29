import React, { useEffect, useState } from 'react';
import { Text, TextInput } from 'react-native';
import { FormModal, formModalStyles as m } from '../../components/FormModal';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
}

export function AddGroupModal({ visible, onClose, onSubmit }: Props) {
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setName('');
      setError(null);
    }
  }, [visible]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Group name is required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(name.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create group.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormModal
      visible={visible}
      title="Add Envelope Group"
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel="Create Group"
      submitting={submitting}
      error={error}
    >
      <Text style={m.label}>Group name</Text>
      <TextInput
        style={m.input}
        value={name}
        onChangeText={(t) => {
          setName(t);
          setError(null);
        }}
        placeholder="e.g. Discretionary"
        placeholderTextColor="#64748b"
      />
      <Text style={m.hint}>Groups organise related envelopes. They have no balance of their own.</Text>
    </FormModal>
  );
}
