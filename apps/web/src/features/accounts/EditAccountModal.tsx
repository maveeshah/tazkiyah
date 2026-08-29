import React, { useEffect, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import type { AccountResponse, AccountType, AccountUpdate } from '../../types/api';

export interface EditAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: AccountResponse | null;
  onSubmit: (accountId: string, payload: AccountUpdate) => Promise<unknown>;
  onDelete: (accountId: string) => Promise<unknown>;
}

export const EditAccountModal: React.FC<EditAccountModalProps> = ({
  isOpen,
  onClose,
  account,
  onSubmit,
  onDelete,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('BANK');
  const [balance, setBalance] = useState('0.00');
  const [isActive, setIsActive] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (account) {
      setName(account.name);
      setType(account.type);
      setBalance(String(account.current_balance));
      setIsActive(account.is_active);
      setError(null);
    }
  }, [account]);

  if (!account) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Account name is required');
      return;
    }
    const numBalance = parseFloat(balance);
    if (Number.isNaN(numBalance)) {
      setError('Balance must be a valid number');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await onSubmit(account.id, {
        name: name.trim(),
        type,
        current_balance: numBalance,
        is_active: isActive,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update account');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${account.name}"? This can't be undone.`)) return;
    setIsDeleting(true);
    setError(null);
    try {
      await onDelete(account.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={<span className="flex items-center gap-2"><Pencil className="w-4 h-4 text-emerald-400" /> Edit account</span>}
      description="Rename, re-categorize, correct the balance, or deactivate this account."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input label="Account name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <Select label="Account type" value={type} onChange={(e) => setType(e.target.value as AccountType)}>
          <option value="BANK">Bank Account</option>
          <option value="EMI">Electronic Money / Digital Wallet</option>
          <option value="CASH">Physical Cash</option>
          <option value="CREDIT">Credit Card / Line of Credit</option>
        </Select>
        <Input
          label="Current balance (manual correction)"
          type="number"
          step="0.01"
          prefixText="PKR"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          helperText="Editing this is a manual adjustment — it does not create a transaction."
        />
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Active (unchecked = hidden from the dashboard)
        </label>

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800/80 text-rose-300 text-xs">{error}</div>
        )}

        <div className="flex items-center justify-between gap-3 mt-2 pt-4 border-t border-slate-800">
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={handleDelete}
            isLoading={isDeleting}
            leftIcon={<Trash2 className="w-4 h-4" />}
          >
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
