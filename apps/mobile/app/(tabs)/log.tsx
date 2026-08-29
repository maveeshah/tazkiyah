import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '../../src/context/UserContext';
import * as api from '../../src/services/api';
import type {
  AccountResponse,
  EnvelopeGroupResponse,
  TransactionCreate,
} from '../../src/types/api';

interface MobileLineItem {
  id: string;
  raw_item_name: string;
  quantity: string;
  unit: string;
  unit_price: string;
  total_price: string;
  notes: string;
}

const COMMON_UNITS = ['piece', 'kg', 'liter', 'dozen', '10kg', 'pack', 'box'];

const EXAMPLES = [
  '1.25kg potato for 125, 2l milk for 580 at Imtiaz from cash',
  'petrol for 3500 at Shell from meezan',
  'dinner for 4500 at Monal from sadapay',
  '1 dozen anday for 360 at Utility Store from cash',
];

export default function LogScreen() {
  const { currentHousehold, currentUser } = useUser();
  const householdId = currentHousehold?.id ?? null;

  // Active Logging Mode: 'structured' (default) vs 'natural_language'
  const [mode, setMode] = useState<'structured' | 'natural_language'>('structured');

  // Metadata from backend
  const [accounts, setAccounts] = useState<AccountResponse[]>([]);
  const [envelopeGroups, setEnvelopeGroups] = useState<EnvelopeGroupResponse[]>([]);

  // ── Structured Form State ──
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedEnvelopeId, setSelectedEnvelopeId] = useState<string>('');
  const [merchant, setMerchant] = useState<string>('');
  const [lineItems, setLineItems] = useState<MobileLineItem[]>([
    {
      id: '1',
      raw_item_name: '',
      quantity: '1',
      unit: 'piece',
      unit_price: '',
      total_price: '',
      notes: '',
    },
  ]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [structuredSuccess, setStructuredSuccess] = useState<string | null>(null);

  // Envelope Selector Modal
  const [showEnvelopeModal, setShowEnvelopeModal] = useState<boolean>(false);

  // ── Natural Language Form State ──
  const [text, setText] = useState('');
  const [nlLoading, setNlLoading] = useState(false);
  const [nlResult, setNlResult] = useState<string | null>(null);

  // Load accounts and envelopes
  const loadMetadata = useCallback(async () => {
    if (!householdId) return;
    try {
      const [accs, groups] = await Promise.all([
        api.fetchAccounts(householdId),
        api.fetchEnvelopeGroups(householdId),
      ]);
      setAccounts(accs);
      setEnvelopeGroups(groups);

      // Default-select only if nothing is chosen yet (functional update keeps this
      // effect off the selection deps, so changing a dropdown doesn't refetch).
      if (accs.length > 0) {
        setSelectedAccountId((cur) => cur || accs[0].id);
      }
      const firstEnv = groups.find((g) => g.envelopes.length > 0)?.envelopes[0]?.id;
      if (firstEnv) {
        setSelectedEnvelopeId((cur) => cur || firstEnv);
      }
    } catch (e: unknown) {
      console.warn('Failed to load accounts/envelopes:', e);
    }
  }, [householdId]);

  useEffect(() => {
    void loadMetadata();
  }, [loadMetadata]);

  // Selected Envelope Label
  const selectedEnvelopeName = useMemo(() => {
    for (const grp of envelopeGroups) {
      const env = grp.envelopes.find((e) => e.id === selectedEnvelopeId);
      if (env) return `${grp.name} → ${env.name}`;
    }
    return 'Select Budget Envelope';
  }, [envelopeGroups, selectedEnvelopeId]);

  // Line item updates with auto-derivation
  const handleAddLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        raw_item_name: '',
        quantity: '1',
        unit: 'piece',
        unit_price: '',
        total_price: '',
        notes: '',
      },
    ]);
  };

  const handleRemoveLineItem = (id: string) => {
    if (lineItems.length <= 1) {
      setLineItems([
        {
          id: Math.random().toString(36).substring(2, 9),
          raw_item_name: '',
          quantity: '1',
          unit: 'piece',
          unit_price: '',
          total_price: '',
          notes: '',
        },
      ]);
      return;
    }
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateLineItem = (
    id: string,
    field: keyof MobileLineItem,
    value: string
  ) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };

        // Auto-calculate total price when unit price or qty changes
        if (field === 'unit_price' || field === 'quantity') {
          const qty = parseFloat(field === 'quantity' ? value : updated.quantity);
          const price = parseFloat(field === 'unit_price' ? value : updated.unit_price);
          if (!isNaN(qty) && !isNaN(price) && qty > 0 && price >= 0) {
            updated.total_price = (qty * price).toFixed(0);
          }
        }

        // Auto-calculate unit price when total price changes
        if (field === 'total_price') {
          const tot = parseFloat(value);
          const qty = parseFloat(updated.quantity);
          if (!isNaN(tot) && !isNaN(qty) && qty > 0 && tot >= 0) {
            updated.unit_price = (tot / qty).toFixed(2);
          }
        }

        return updated;
      })
    );
  };

  // Sum of all line items
  const totalTransactionAmount = useMemo(() => {
    return lineItems.reduce((sum, item) => {
      const val = parseFloat(item.total_price);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
  }, [lineItems]);

  // Submit Structured Transaction
  const handleStructuredSubmit = async () => {
    if (!householdId) {
      Alert.alert('Error', 'No active household selected.');
      return;
    }
    if (!selectedAccountId) {
      Alert.alert('Validation Error', 'Please select a payment wallet or bank account.');
      return;
    }
    if (!selectedEnvelopeId) {
      Alert.alert('Validation Error', 'Please select a budget envelope category.');
      return;
    }
    if (!merchant.trim()) {
      Alert.alert('Validation Error', 'Please enter a merchant or payee name.');
      return;
    }
    if (totalTransactionAmount <= 0) {
      Alert.alert('Validation Error', 'Total transaction amount must be greater than Rs 0.');
      return;
    }

    const validLineItems = lineItems
      .filter((i) => i.raw_item_name.trim() !== '')
      .map((i) => {
        const qty = parseFloat(i.quantity) || 1.0;
        const total = parseFloat(i.total_price) || 0;
        const uPrice = parseFloat(i.unit_price) || (qty > 0 ? total / qty : 0);
        return {
          raw_item_name: i.raw_item_name.trim(),
          quantity: qty,
          unit: i.unit || 'piece',
          unit_price: uPrice,
          total_price: total,
          notes: i.notes.trim() || undefined,
        };
      });

    if (validLineItems.length === 0) {
      Alert.alert('Validation Error', 'Please enter at least one item name and amount.');
      return;
    }

    setIsSubmitting(true);
    setStructuredSuccess(null);
    try {
      const payload: TransactionCreate = {
        household_id: householdId,
        account_id: selectedAccountId,
        envelope_id: selectedEnvelopeId,
        merchant: merchant.trim(),
        total_amount: totalTransactionAmount,
        source: 'MOBILE',
        line_items: validLineItems,
      };

      const res = await api.createTransaction(payload);
      setStructuredSuccess(
        `✅ Recorded Rs ${parseFloat(String(res.total_amount)).toLocaleString()} at ${res.merchant}`
      );
      setMerchant('');
      setLineItems([
        {
          id: '1',
          raw_item_name: '',
          quantity: '1',
          unit: 'piece',
          unit_price: '',
          total_price: '',
          notes: '',
        },
      ]);
      Alert.alert('Success', 'Transaction logged and budget deducted!');
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to record transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Natural Language WhatsApp simulator
  const handleNaturalLanguageSubmit = async () => {
    if (!text.trim()) return;
    const phone = currentUser?.phone_number ?? '+923001234567';
    setNlLoading(true);
    setNlResult(null);
    try {
      const res = await api.simulateWhatsApp(phone, text.trim());
      const result = res.simulation_result;
      if (result.status === 'success') {
        setNlResult(`✅ Logged Rs ${result.total_amount?.toLocaleString()} successfully`);
        setText('');
      } else if (result.status === 'prompted_for_account') {
        setNlResult('💬 Multiple accounts found — please specify (e.g. "from cash" or "from meezan")');
      } else {
        setNlResult(`ℹ️ Status: ${result.status}`);
      }
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to log expense');
    } finally {
      setNlLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView keyboardShouldPersistTaps="handled">
          <View style={styles.inner}>
            
            {/* ── MODE SELECTOR TOGGLE ── */}
            <View style={styles.modeToggleRow}>
              <TouchableOpacity
                style={[styles.modeTab, mode === 'structured' && styles.modeTabActive]}
                onPress={() => setMode('structured')}
              >
                <Text style={[styles.modeTabText, mode === 'structured' && styles.modeTabTextActive]}>
                  🧾 Structured Receipt
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeTab, mode === 'natural_language' && styles.modeTabActive]}
                onPress={() => setMode('natural_language')}
              >
                <Text style={[styles.modeTabText, mode === 'natural_language' && styles.modeTabTextActive]}>
                  💬 Quick Text / AI
                </Text>
              </TouchableOpacity>
            </View>

            {/* ══════════════════════════════════════════════════ */}
            {/* MODE 1: STRUCTURED ITEMISED RECEIPT LOGGER (DEFAULT) */}
            {/* ══════════════════════════════════════════════════ */}
            {mode === 'structured' && (
              <View>
                {structuredSuccess && (
                  <View style={styles.successBanner}>
                    <Text style={styles.successText}>{structuredSuccess}</Text>
                  </View>
                )}

                {/* 1. Payment Account Selector */}
                <Text style={styles.label}>1. Select Payment Account / Wallet</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalSelect}>
                  {accounts.map((acc) => {
                    const isSelected = acc.id === selectedAccountId;
                    return (
                      <TouchableOpacity
                        key={acc.id}
                        style={[styles.accountChip, isSelected && styles.accountChipSelected]}
                        onPress={() => setSelectedAccountId(acc.id)}
                      >
                        <Text style={[styles.chipTitle, isSelected && styles.chipTextSelected]}>
                          {isSelected ? '✓ ' : ''}{acc.name}
                        </Text>
                        <Text style={[styles.chipSubtitle, isSelected && styles.chipSubtitleSelected]}>
                          Rs {parseFloat(String(acc.current_balance)).toLocaleString('en-PK')}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* 2. Envelope Category Selector */}
                <Text style={styles.label}>2. Budget Envelope Category</Text>
                <TouchableOpacity
                  style={styles.dropdownBtn}
                  onPress={() => setShowEnvelopeModal(true)}
                >
                  <Text style={styles.dropdownBtnText}>{selectedEnvelopeName}</Text>
                  <Text style={styles.dropdownChevron}>▼</Text>
                </TouchableOpacity>

                {/* 3. Merchant / Payee */}
                <Text style={styles.label}>3. Merchant / Payee</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Imtiaz Super Market, Shell, Kolachi"
                  placeholderTextColor="#64748b"
                  value={merchant}
                  onChangeText={setMerchant}
                />

                {/* 4. Line Items Builder */}
                <View style={styles.lineItemsHeader}>
                  <Text style={styles.label}>4. Receipt Line Items ({lineItems.length})</Text>
                  <TouchableOpacity style={styles.addItemBtn} onPress={handleAddLineItem}>
                    <Text style={styles.addItemBtnText}>+ Add Item</Text>
                  </TouchableOpacity>
                </View>

                {lineItems.map((item, idx) => (
                  <View key={item.id} style={styles.itemCard}>
                    <View style={styles.itemCardHeader}>
                      <Text style={styles.itemNumber}>Item #{idx + 1}</Text>
                      <TouchableOpacity onPress={() => handleRemoveLineItem(item.id)}>
                        <Text style={styles.deleteItemText}>✕ Remove</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Item Name */}
                    <TextInput
                      style={styles.itemInput}
                      placeholder="Item name (e.g. Potatoes, Olpers Milk, Petrol)"
                      placeholderTextColor="#64748b"
                      value={item.raw_item_name}
                      onChangeText={(val) => handleUpdateLineItem(item.id, 'raw_item_name', val)}
                    />

                    {/* Quantity, Unit, Price Breakdown */}
                    <View style={styles.mathRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.subLabel}>Qty</Text>
                        <TextInput
                          style={styles.smallInput}
                          placeholder="1.0"
                          placeholderTextColor="#64748b"
                          keyboardType="numeric"
                          value={item.quantity}
                          onChangeText={(val) => handleUpdateLineItem(item.id, 'quantity', val)}
                        />
                      </View>

                      <View style={{ flex: 1.2 }}>
                        <Text style={styles.subLabel}>Unit</Text>
                        <TextInput
                          style={styles.smallInput}
                          placeholder="kg/liter/pc"
                          placeholderTextColor="#64748b"
                          value={item.unit}
                          onChangeText={(val) => handleUpdateLineItem(item.id, 'unit', val)}
                        />
                      </View>

                      <View style={{ flex: 1.3 }}>
                        <Text style={styles.subLabel}>Unit Price</Text>
                        <TextInput
                          style={styles.smallInput}
                          placeholder="Price/unit"
                          placeholderTextColor="#64748b"
                          keyboardType="numeric"
                          value={item.unit_price}
                          onChangeText={(val) => handleUpdateLineItem(item.id, 'unit_price', val)}
                        />
                      </View>

                      <View style={{ flex: 1.5 }}>
                        <Text style={[styles.subLabel, { color: '#4ade80' }]}>Total (Rs)</Text>
                        <TextInput
                          style={[styles.smallInput, styles.totalInput]}
                          placeholder="Total Rs"
                          placeholderTextColor="#64748b"
                          keyboardType="numeric"
                          value={item.total_price}
                          onChangeText={(val) => handleUpdateLineItem(item.id, 'total_price', val)}
                        />
                      </View>
                    </View>

                    {/* Unit Selector Chips */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.unitChipRow}>
                      {COMMON_UNITS.map((u) => (
                        <TouchableOpacity
                          key={u}
                          style={[styles.unitChip, item.unit === u && styles.unitChipActive]}
                          onPress={() => handleUpdateLineItem(item.id, 'unit', u)}
                        >
                          <Text style={[styles.unitChipText, item.unit === u && styles.unitChipTextActive]}>
                            {u}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                ))}

                {/* Total Summary Strip */}
                <View style={styles.summaryStrip}>
                  <Text style={styles.summaryLabel}>Total Transaction Amount:</Text>
                  <Text style={styles.summaryAmount}>
                    Rs {totalTransactionAmount.toLocaleString('en-PK', { minimumFractionDigits: 0 })}
                  </Text>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  style={[styles.submitButton, isSubmitting && styles.buttonDisabled]}
                  onPress={handleStructuredSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>💾 Save & Deduct from Envelope</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* ══════════════════════════════════════════════════ */}
            {/* MODE 2: NATURAL LANGUAGE / WHATSAPP SIMULATOR */}
            {/* ══════════════════════════════════════════════════ */}
            {mode === 'natural_language' && (
              <View>
                <Text style={styles.subHeading}>
                  Quick parse natural receipt messages in English or Roman Urdu.
                </Text>

                <TextInput
                  style={styles.textArea}
                  placeholder="e.g. 1.25kg potato for 125, 2l milk for 580 at Imtiaz from cash"
                  placeholderTextColor="#475569"
                  multiline
                  numberOfLines={4}
                  value={text}
                  onChangeText={setText}
                  autoCorrect={false}
                />

                <TouchableOpacity
                  style={[styles.button, (!text.trim() || nlLoading) && styles.buttonDisabled]}
                  onPress={handleNaturalLanguageSubmit}
                  disabled={!text.trim() || nlLoading}
                >
                  {nlLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>⚡ Parse & Log via AI</Text>
                  )}
                </TouchableOpacity>

                {nlResult && (
                  <View style={[styles.resultBox, nlResult.startsWith('✅') ? styles.resultSuccess : styles.resultInfo]}>
                    <Text style={styles.resultText}>{nlResult}</Text>
                  </View>
                )}

                <Text style={styles.examplesTitle}>Quick Examples</Text>
                {EXAMPLES.map((ex) => (
                  <TouchableOpacity key={ex} style={styles.exampleChip} onPress={() => setText(ex)}>
                    <Text style={styles.exampleText}>{ex}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={{ height: 40 }} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── ENVELOPE SELECTION MODAL ── */}
      <Modal visible={showEnvelopeModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose Budget Envelope</Text>
            <ScrollView style={{ maxHeight: 380 }}>
              {envelopeGroups.map((grp) => (
                <View key={grp.id} style={styles.groupSection}>
                  <Text style={styles.modalGroupTitle}>{grp.name}</Text>
                  {grp.envelopes.map((env) => {
                    const isSelected = env.id === selectedEnvelopeId;
                    return (
                      <TouchableOpacity
                        key={env.id}
                        style={[styles.envelopeOption, isSelected && styles.envelopeOptionSelected]}
                        onPress={() => {
                          setSelectedEnvelopeId(env.id);
                          setShowEnvelopeModal(false);
                        }}
                      >
                        <Text style={[styles.envOptionText, isSelected && styles.envOptionTextSelected]}>
                          {isSelected ? '✓ ' : ''}{env.name}
                        </Text>
                        <Text style={styles.envOptionBalance}>
                          Rs {parseFloat(String(env.available_balance)).toLocaleString('en-PK')} left
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowEnvelopeModal(false)}
            >
              <Text style={styles.modalCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  inner: { padding: 16 },
  modeToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 4,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modeTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  modeTabActive: {
    backgroundColor: '#4f46e5',
  },
  modeTabText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '700',
  },
  modeTabTextActive: {
    color: '#fff',
  },
  label: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 10,
  },
  subLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
  },
  horizontalSelect: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  accountChip: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#334155',
    minWidth: 120,
  },
  accountChipSelected: {
    backgroundColor: '#312e81',
    borderColor: '#6366f1',
  },
  chipTitle: { color: '#f1f5f9', fontSize: 13, fontWeight: '700' },
  chipSubtitle: { color: '#94a3b8', fontSize: 11, marginTop: 2 },
  chipTextSelected: { color: '#fff' },
  chipSubtitleSelected: { color: '#a5f3fc' },
  dropdownBtn: {
    backgroundColor: '#1e293b',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 10,
  },
  dropdownBtnText: { color: '#f1f5f9', fontSize: 14, fontWeight: '600' },
  dropdownChevron: { color: '#64748b', fontSize: 12 },
  input: {
    backgroundColor: '#1e293b',
    color: '#f1f5f9',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 10,
  },
  lineItemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  addItemBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addItemBtnText: { color: '#4ade80', fontSize: 12, fontWeight: '700' },
  itemCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  itemCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  itemNumber: { color: '#94a3b8', fontSize: 11, fontWeight: '700' },
  deleteItemText: { color: '#f87171', fontSize: 11, fontWeight: '700' },
  itemInput: {
    backgroundColor: '#0f172a',
    color: '#f1f5f9',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 8,
  },
  mathRow: {
    flexDirection: 'row',
    gap: 6,
  },
  smallInput: {
    backgroundColor: '#0f172a',
    color: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    fontSize: 12,
    borderWidth: 1,
    borderColor: '#334155',
    textAlign: 'center',
  },
  totalInput: {
    borderColor: '#15803d',
    color: '#4ade80',
    fontWeight: '800',
  },
  unitChipRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  unitChip: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginRight: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  unitChipActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#6366f1',
  },
  unitChipText: { color: '#64748b', fontSize: 10, fontWeight: '600' },
  unitChipTextActive: { color: '#fff' },
  summaryStrip: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#4ade80',
  },
  summaryLabel: { color: '#94a3b8', fontSize: 13, fontWeight: '700' },
  summaryAmount: { color: '#4ade80', fontSize: 20, fontWeight: '900' },
  submitButton: {
    backgroundColor: '#16a34a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  successBanner: {
    backgroundColor: '#14532d',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  successText: { color: '#bbf7d0', fontSize: 13, fontWeight: '700' },
  // Natural Language mode styles
  subHeading: { color: '#64748b', fontSize: 13, lineHeight: 18, marginBottom: 16 },
  textArea: {
    backgroundColor: '#1e293b',
    color: '#f1f5f9',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    minHeight: 110,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 14,
  },
  button: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  resultBox: { borderRadius: 10, padding: 14, marginBottom: 16 },
  resultSuccess: { backgroundColor: '#14532d' },
  resultInfo: { backgroundColor: '#1e3a5f' },
  resultText: { color: '#f1f5f9', fontSize: 14, fontWeight: '600' },
  examplesTitle: { color: '#94a3b8', fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 10 },
  exampleChip: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  exampleText: { color: '#94a3b8', fontSize: 12 },
  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#334155' },
  modalTitle: { color: '#f1f5f9', fontSize: 18, fontWeight: '800', marginBottom: 12 },
  groupSection: { marginBottom: 12 },
  modalGroupTitle: { color: '#818cf8', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 6 },
  envelopeOption: {
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  envelopeOptionSelected: { backgroundColor: '#312e81', borderColor: '#6366f1' },
  envOptionText: { color: '#f1f5f9', fontSize: 13, fontWeight: '600' },
  envOptionTextSelected: { color: '#fff', fontWeight: '700' },
  envOptionBalance: { color: '#94a3b8', fontSize: 11 },
  modalCloseBtn: {
    backgroundColor: '#334155',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  modalCloseBtnText: { color: '#f1f5f9', fontSize: 14, fontWeight: '700' },
});
