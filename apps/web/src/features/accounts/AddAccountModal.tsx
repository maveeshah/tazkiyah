import React, { useState } from 'react';
import { Building2, Wallet, Smartphone, PlusCircle } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import type { AccountCreate, AccountType } from '../../types/api';

export interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: Omit<AccountCreate, 'household_id'>) => Promise<unknown>;
}

export const AddAccountModal: React.FC<AddAccountModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('BANK');
  const [balance, setBalance] = useState('0.00');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setName('');
    setType('BANK');
    setBalance('0.00');
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Account name is required');
      return;
    }

    const numBalance = parseFloat(balance);
    if (isNaN(numBalance)) {
      setError('Opening balance must be a valid number');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await onSubmit({
        name: name.trim(),
        type,
        current_balance: numBalance,
        is_active: true,
      });
      handleClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create account';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPresets = [
    { name: 'Meezan Bank', type: 'BANK' as AccountType, icon: <Building2 className="w-3 h-3 text-blue-400" /> },
    { name: 'Sadapay', type: 'EMI' as AccountType, icon: <Smartphone className="w-3 h-3 text-teal-400" /> },
    { name: 'Nayapay', type: 'EMI' as AccountType, icon: <Smartphone className="w-3 h-3 text-orange-400" /> },
    { name: 'Wallet Cash', type: 'CASH' as AccountType, icon: <Wallet className="w-3 h-3 text-emerald-400" /> },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        <span className="flex items-center gap-2">
          <PlusCircle className="w-5 h-5 text-emerald-400" />
          Add Liquid Account / Wallet
        </span>
      }
      description="Connect or create a new bank account, EMI wallet, or cash reserve."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Quick Presets */}
        <div>
          <label className="text-xs font-medium text-slate-400 mb-1.5 block">
            Quick Suggestions:
          </label>
          <div className="flex flex-wrap gap-1.5">
            {quickPresets.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => {
                  setName(preset.name);
                  setType(preset.type);
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/60 transition-colors cursor-pointer"
              >
                {preset.icon}
                <span>{preset.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Account Name */}
        <Input
          label="Account Name"
          placeholder="e.g. Meezan Bank, Sadapay, Cash Wallet"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />

        {/* Account Type */}
        <Select
          label="Account Type"
          value={type}
          onChange={(e) => setType(e.target.value as AccountType)}
        >
          <option value="BANK">Bank Account (e.g. Meezan, HBL, SCB)</option>
          <option value="EMI">Electronic Money / Digital Wallet (Sadapay, Nayapay)</option>
          <option value="CASH">Physical Cash in Hand / Wallet</option>
          <option value="CREDIT">Credit Card / Line of Credit</option>
        </Select>

        {/* Opening Balance */}
        <Input
          label="Opening Available Balance"
          type="number"
          step="0.01"
          placeholder="0.00"
          prefixText="PKR"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          helperText="Enter current liquid balance in Pakistani Rupees."
        />

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800/80 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-slate-800">
          <Button type="button" variant="ghost" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="emerald"
            size="sm"
            isLoading={isLoading}
            leftIcon={<PlusCircle className="w-4 h-4" />}
          >
            Create Account
          </Button>
        </div>
      </form>
    </Modal>
  );
};
