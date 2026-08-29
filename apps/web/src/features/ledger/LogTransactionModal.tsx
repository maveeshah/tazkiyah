import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Receipt,
  AlertCircle,
  Sparkles,
  ShoppingBag,
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import type {
  AccountResponse,
  EnvelopeGroupResponse,
  TransactionCreate,
  TransactionResponse,
  TransactionSource,
  CPITrendItem,
} from '../../types/api';

export interface LogTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: AccountResponse[];
  envelopeGroups: EnvelopeGroupResponse[];
  cpiTrends?: CPITrendItem[];
  onSubmit: (payload: Omit<TransactionCreate, 'household_id'>) => Promise<TransactionResponse | void>;
}

interface FormLineItem {
  id: string;
  raw_item_name: string;
  canonical_item_id: string;
  quantity: string;
  unit: string;
  unit_price: string;
  total_price: string;
  notes: string;
}

export const LogTransactionModal: React.FC<LogTransactionModalProps> = ({
  isOpen,
  onClose,
  accounts,
  envelopeGroups,
  cpiTrends = [],
  onSubmit,
}) => {
  // Form State
  const [accountId, setAccountId] = useState<string>('');
  const [envelopeId, setEnvelopeId] = useState<string>('');
  const [merchant, setMerchant] = useState<string>('');
  const [source, setSource] = useState<TransactionSource>('WEB');
  const [transactedAt, setTransactedAt] = useState<string>('');
  const [rawInput, setRawInput] = useState<string>('');
  const [manualTotalAmount, setManualTotalAmount] = useState<string>('');
  const [useManualTotal, setUseManualTotal] = useState<boolean>(false);

  // Line items state
  const [lineItems, setLineItems] = useState<FormLineItem[]>([]);

  // Submission & Validation State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Format now for datetime-local
  const getNowFormatted = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  };

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      const defaultAcc = accounts.find((a) => a.is_active)?.id || accounts[0]?.id || '';
      const firstGroup = envelopeGroups[0];
      const defaultEnv = firstGroup?.envelopes[0]?.id || '';

      setAccountId(defaultAcc);
      setEnvelopeId(defaultEnv);
      setMerchant('');
      setSource('WEB');
      setTransactedAt(getNowFormatted());
      setRawInput('');
      setManualTotalAmount('');
      setUseManualTotal(false);
      setError(null);

      // Start with 1 empty line item
      setLineItems([
        {
          id: Math.random().toString(36).substring(2, 9),
          raw_item_name: '',
          canonical_item_id: '',
          quantity: '1.0',
          unit: 'piece',
          unit_price: '',
          total_price: '',
          notes: '',
        },
      ]);
    }
  }, [isOpen, accounts, envelopeGroups]);

  // Add line item row
  const handleAddLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        raw_item_name: '',
        canonical_item_id: '',
        quantity: '1.0',
        unit: 'piece',
        unit_price: '',
        total_price: '',
        notes: '',
      },
    ]);
  };

  // Remove line item row
  const handleRemoveLineItem = (id: string) => {
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Update line item field with smart price auto-calculation
  const handleUpdateLineItem = (
    id: string,
    field: keyof FormLineItem,
    value: string
  ) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };

        // When Canonical Item is selected, auto-fill unit if standard_unit exists
        if (field === 'canonical_item_id' && value) {
          const matchedCpi = cpiTrends.find((c) => c.canonical_item_id === value);
          if (matchedCpi) {
            updated.unit = matchedCpi.standard_unit;
            if (!updated.raw_item_name) {
              updated.raw_item_name = matchedCpi.name;
            }
          }
        }

        // Auto-calculate Total Price when Unit Price or Quantity changes
        if (field === 'unit_price' || field === 'quantity') {
          const qty = parseFloat(field === 'quantity' ? value : updated.quantity);
          const price = parseFloat(field === 'unit_price' ? value : updated.unit_price);
          if (!isNaN(qty) && !isNaN(price) && qty > 0 && price >= 0) {
            updated.total_price = (qty * price).toFixed(2);
          }
        }

        // Auto-calculate Unit Price when Total Price changes
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

  // Calculate sum of line items
  const lineItemsSum = useMemo(() => {
    return lineItems.reduce((sum, item) => {
      const val = parseFloat(item.total_price);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
  }, [lineItems]);

  const effectiveTotalAmount = useManualTotal
    ? parseFloat(manualTotalAmount) || 0
    : lineItemsSum;

  const formatPKR = (val: number) => {
    return val.toLocaleString('en-PK', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!accountId) {
      setError('Please select an account.');
      return;
    }

    if (!envelopeId) {
      setError('Please select an envelope budget category.');
      return;
    }

    if (!merchant.trim()) {
      setError('Please specify a merchant or payee name.');
      return;
    }

    if (effectiveTotalAmount <= 0) {
      setError('Total transaction amount must be greater than 0 PKR.');
      return;
    }

    // Filter valid line items
    const validLineItems = lineItems
      .filter((item) => item.raw_item_name.trim() !== '')
      .map((item) => {
        const qty = parseFloat(item.quantity) || 1.0;
        const total = parseFloat(item.total_price) || 0;
        const unitPrice =
          item.unit_price !== ''
            ? parseFloat(item.unit_price)
            : qty > 0
            ? total / qty
            : 0;

        return {
          raw_item_name: item.raw_item_name.trim(),
          quantity: qty,
          unit: item.unit.trim() || 'piece',
          unit_price: isNaN(unitPrice) ? null : unitPrice,
          total_price: total,
          notes: item.notes.trim() || null,
        };
      });

    // If no manual total was set and there were no line items, error out
    if (validLineItems.length === 0 && !useManualTotal) {
      setError('Please add at least one line item or specify a total amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        account_id: accountId,
        envelope_id: envelopeId,
        merchant: merchant.trim(),
        total_amount: effectiveTotalAmount,
        source,
        raw_input: rawInput.trim() || null,
        transacted_at: transactedAt ? new Date(transactedAt).toISOString() : new Date().toISOString(),
        line_items: validLineItems.length > 0 ? validLineItems : undefined,
      });

      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to record transaction';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <Receipt className="w-5 h-5 text-emerald-400" />
          Log Itemized Transaction (R2)
        </span>
      }
      description="Record a receipt with granular unit economics, line-item breakdown, and envelope allocation."
      maxWidth="2xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Total Charged:</span>
            <span className="font-mono font-bold text-emerald-400 text-base">
              PKR {formatPKR(effectiveTotalAmount)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="log-transaction-form"
              variant="emerald"
              size="sm"
              isLoading={isSubmitting}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Save Transaction
            </Button>
          </div>
        </div>
      }
    >
      <form id="log-transaction-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300 text-xs flex items-center gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Section 1: Transaction Metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/40 p-4 rounded-xl border border-slate-800/60">
          {/* Account Selector */}
          <Select
            label="Payment Account"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            required
          >
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({acc.type}) — Bal: PKR {parseFloat(String(acc.current_balance)).toLocaleString('en-PK')}
              </option>
            ))}
          </Select>

          {/* Envelope Selector */}
          <Select
            label="Envelope Category"
            value={envelopeId}
            onChange={(e) => setEnvelopeId(e.target.value)}
            required
          >
            {envelopeGroups.map((grp) => (
              <optgroup key={grp.id} label={grp.name}>
                {grp.envelopes.map((env) => (
                  <option key={env.id} value={env.id}>
                    {env.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>

          {/* Merchant Name */}
          <Input
            label="Merchant / Payee"
            placeholder="e.g. Imtiaz Super Market, Shell, Kolachi"
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
            required
          />

          {/* Source Channel */}
          <Select
            label="Ingestion Source"
            value={source}
            onChange={(e) => setSource(e.target.value as TransactionSource)}
          >
            <option value="WEB">Web Dashboard (Manual)</option>
            <option value="WHATSAPP">WhatsApp Intake</option>
            <option value="MOBILE">Mobile App</option>
          </Select>

          {/* Transacted Date/Time */}
          <Input
            label="Transacted Date & Time"
            type="datetime-local"
            value={transactedAt}
            onChange={(e) => setTransactedAt(e.target.value)}
            required
          />

          {/* Raw Intake Preview / Note */}
          <Input
            label="Intake Note / Receipt String (Optional)"
            placeholder="e.g. WhatsApp message text or receipt notes"
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
          />
        </div>

        {/* Section 2: Granular Line Items Builder */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-emerald-400" />
              <h4 className="text-sm font-semibold text-slate-100">
                Receipt Line Items ({lineItems.length})
              </h4>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddLineItem}
              leftIcon={<Plus className="w-3.5 h-3.5 text-emerald-400" />}
              className="text-xs py-1"
            >
              Add Item Row
            </Button>
          </div>

          {/* Line Items Container */}
          <div className="flex flex-col gap-3 max-h-[38vh] overflow-y-auto pr-1">
            {lineItems.map((item, index) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col gap-2.5 hover:border-slate-700 transition-colors"
              >
                {/* Row Header & Delete */}
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-slate-400 font-semibold">
                    Item #{index + 1}
                  </span>
                  {lineItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveLineItem(item.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Primary Row Inputs: Item Name & Canonical Mapping */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <div className="sm:col-span-7">
                    <input
                      type="text"
                      placeholder="Item Name (e.g. Aaloo, Milk 1L, Oil)"
                      value={item.raw_item_name}
                      onChange={(e) => handleUpdateLineItem(item.id, 'raw_item_name', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/80"
                      required
                    />
                  </div>

                  <div className="sm:col-span-5">
                    <select
                      value={item.canonical_item_id}
                      onChange={(e) => handleUpdateLineItem(item.id, 'canonical_item_id', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500/80 cursor-pointer"
                    >
                      <option value="">Map CPI Staple (Optional)</option>
                      {cpiTrends.map((cpi) => (
                        <option key={cpi.canonical_item_id} value={cpi.canonical_item_id}>
                          {cpi.name} ({cpi.category})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Secondary Row Inputs: Qty, Unit, Unit Price, Line Total */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Quantity</label>
                    <input
                      type="number"
                      step="any"
                      min="0.001"
                      placeholder="1.0"
                      value={item.quantity}
                      onChange={(e) => handleUpdateLineItem(item.id, 'quantity', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500/80"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Unit</label>
                    <select
                      value={item.unit}
                      onChange={(e) => handleUpdateLineItem(item.id, 'unit', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-emerald-500/80 cursor-pointer"
                    >
                      <option value="piece">piece</option>
                      <option value="kg">kg</option>
                      <option value="liter">liter</option>
                      <option value="dozen">dozen</option>
                      <option value="10kg">10kg</option>
                      <option value="pack">pack</option>
                      <option value="box">box</option>
                      <option value="meter">meter</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Unit Price (PKR)</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="Price/unit"
                      value={item.unit_price}
                      onChange={(e) => handleUpdateLineItem(item.id, 'unit_price', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500/80"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Line Total (PKR)</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="Total"
                      value={item.total_price}
                      onChange={(e) => handleUpdateLineItem(item.id, 'total_price', e.target.value)}
                      className="w-full bg-slate-900 border border-emerald-900/60 rounded-lg px-2.5 py-1 text-xs font-mono font-semibold text-emerald-400 focus:outline-none focus:border-emerald-500/80"
                      required
                    />
                  </div>
                </div>

                {/* Line Item Note (Optional) */}
                <input
                  type="text"
                  placeholder="Item notes or brand details (optional)"
                  value={item.notes}
                  onChange={(e) => handleUpdateLineItem(item.id, 'notes', e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-800/60 rounded-lg px-2.5 py-1 text-[11px] text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-slate-700"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Summary Strip */}
        <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-300">
              Line Items Auto-Sum: <strong className="font-mono text-emerald-300">PKR {formatPKR(lineItemsSum)}</strong>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={useManualTotal}
                onChange={(e) => setUseManualTotal(e.target.checked)}
                className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500/30"
              />
              <span>Override Total Amount</span>
            </label>

            {useManualTotal && (
              <input
                type="number"
                step="any"
                min="0"
                placeholder="Manual Total"
                value={manualTotalAmount}
                onChange={(e) => setManualTotalAmount(e.target.value)}
                className="w-32 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500/80"
              />
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
};
