import React, { useEffect, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { FormModal, formModalStyles as m } from '../../components/FormModal';
import type { AccountType } from '../../types/api';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (payload: { name: string; type: AccountType; current_balance: number }) => Promise<void>;
}

const TYPES: { value: AccountType; label: string }[] = [
  { value: 'BANK', label: 'Bank' },
  { value: 'EMI', label: 'Wallet / EMI' },
  { value: 'CASH', label: 'Cash' },
  { value: 'CREDIT', label: 'Credit' },
];

export function AddAccountModal({ visible, onClose, onSubmit }: Props) {
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('BANK');
  const [balance, setBalance] = useState('0');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setName('');
      setType('BANK');
      setBalance('0');
      setError(null);
    }
  }, [visible]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Account name is required.');
      return;
    }
    const bal = parseFloat(balance);
    if (Number.isNaN(bal)) {
      setError('Balance must be a number.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ name: name.trim(), type, current_balance: bal });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormModal
      visible={visible}
      title="Add Account / Wallet"
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel="Create Account"
      submitting={submitting}
      error={error}
    >
      <Text style={m.label}>Account name</Text>
      <TextInput
        style={m.input}
        value={name}
        onChangeText={(t) => { setName(t); setError(null); }}
        placeholder="e.g. Meezan Bank, Sadapay, Wallet Cash"
        placeholderTextColor="#64748b"
      />

      <Text style={m.label}>Type</Text>
      <View style={m.pickerRow}>
        {TYPES.map((t) => (
          <TouchableOpacity
            key={t.value}
            style={[m.pill, type === t.value && m.pillActive]}
            onPress={() => setType(t.value)}
          >
            <Text style={[m.pillText, type === t.value && m.pillTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={m.label}>Opening balance (Rs)</Text>
      <TextInput
        style={m.input}
        keyboardType="numeric"
        value={balance}
        onChangeText={(t) => { setBalance(t); setError(null); }}
        placeholder="0"
        placeholderTextColor="#64748b"
      />
    </FormModal>
  );
}
