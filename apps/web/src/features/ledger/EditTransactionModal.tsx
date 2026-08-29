import React, { useEffect, useMemo, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import type {
  AccountResponse,
  EnvelopeGroupResponse,
  TransactionResponse,
  TransactionUpdate,
} from '../../types/api';

export interface EditTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: TransactionResponse | null;
  accounts: AccountResponse[];
  envelopeGroups: EnvelopeGroupResponse[];
  onSubmit: (transactionId: string, payload: TransactionUpdate) => Promise<unknown>;
  onDelete: (transactionId: string) => Promise<unknown>;
}

const num = (v: number | string) => (typeof v === 'string' ? parseFloat(v) : Number(v)) || 0;

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  isOpen,
  onClose,
  transaction,
  accounts,
  envelopeGroups,
  onSubmit,
  onDelete,
}) => {
  const [merchant, setMerchant] = useState('');
  const [accountId, setAccountId] = useState('');
  const [envelopeId, setEnvelopeId] = useState('');
  const [transactedAt, setTransactedAt] = useState('');
  const [total, setTotal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const flatEnvelopes = useMemo(
    () => envelopeGroups.flatMap((g) => g.envelopes.map((e) => ({ ...e, groupName: g.name }))),
    [envelopeGroups],
  );

  useEffect(() => {
    if (transaction) {
      setMerchant(transaction.merchant ?? '');
      setAccountId(transaction.account_id);
      setEnvelopeId(transaction.envelope_id);
      setTransactedAt(new Date(transaction.transacted_at).toISOString().slice(0, 16));
      setTotal(String(transaction.total_amount));
      setError(null);
    }
  }, [transaction]);

  if (!transaction) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newTotal = parseFloat(total);
    if (Number.isNaN(newTotal) || newTotal <= 0) {
      setError('Total must be greater than zero');
      return;
    }
    const payload: TransactionUpdate = {
      merchant: merchant.trim() || null,
      account_id: accountId,
      envelope_id: envelopeId,
      transacted_at: transactedAt ? new Date(transactedAt).toISOString() : undefined,
    };

    const lineSum = transaction.line_items.reduce((s, li) => s + num(li.total_price), 0);
    const totalChanged = Math.abs(newTotal - num(transaction.total_amount)) > 0.001;
    if (totalChanged) {
      payload.total_amount = newTotal;
      // Existing line items would no longer sum to the total — collapse them to one.
      if (transaction.line_items.length > 0 && Math.abs(lineSum - newTotal) > 0.01) {
        payload.line_items = [
          { raw_item_name: merchant.trim() || 'Adjusted total', total_price: newTotal },
        ];
      }
    }

    setIsLoading(true);
    setError(null);
    try {
      await onSubmit(transaction.id, payload);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update transaction');
    } finally {
      setIsLoading(false);
    }
  };

  const del = async () => {
    if (!window.confirm('Delete this transaction? The account balance and envelope spend will be reverted.')) return;
    setIsDeleting(true);
    setError(null);
    try {
      await onDelete(transaction.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete transaction');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={<span className="flex items-center gap-2"><Pencil className="w-4 h-4 text-emerald-400" /> Edit transaction</span>}
      description={
        transaction.line_items.length > 0
          ? 'Changing the total collapses the itemized breakdown to a single line.'
          : undefined
      }
      maxWidth="md"
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Input label="Merchant" value={merchant} onChange={(e) => setMerchant(e.target.value)} autoFocus />
        <Select label="Account" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </Select>
        <Select label="Envelope" value={envelopeId} onChange={(e) => setEnvelopeId(e.target.value)}>
          {flatEnvelopes.map((e) => (
            <option key={e.id} value={e.id}>{e.groupName} → {e.name}</option>
          ))}
        </Select>
        <Input label="Date & time" type="datetime-local" value={transactedAt} onChange={(e) => setTransactedAt(e.target.value)} />
        <Input label="Total amount" type="number" step="0.01" prefixText="PKR" value={total} onChange={(e) => setTotal(e.target.value)} />

        {error && <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800/80 text-rose-300 text-xs">{error}</div>}

        <div className="flex items-center justify-between gap-3 mt-2 pt-4 border-t border-slate-800">
          <Button type="button" variant="danger" size="sm" onClick={del} isLoading={isDeleting} leftIcon={<Trash2 className="w-4 h-4" />}>
            Delete
          </Button>
          <div className="flex gap-3">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="emerald" size="sm" isLoading={isLoading}>Save</Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
