import React, { useState, useEffect } from 'react';
import { PlusCircle } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import type { EnvelopeCreate, EnvelopeGroupResponse } from '../../types/api';

export interface AddEnvelopeModalProps {
  isOpen: boolean;
  onClose: () => void;
  envelopeGroups: EnvelopeGroupResponse[];
  defaultGroupId?: string;
  onSubmit: (payload: EnvelopeCreate) => Promise<unknown>;
}

export const AddEnvelopeModal: React.FC<AddEnvelopeModalProps> = ({
  isOpen,
  onClose,
  envelopeGroups,
  defaultGroupId,
  onSubmit,
}) => {
  const [groupId, setGroupId] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [targetAmount, setTargetAmount] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setName('');
      setTargetAmount('');
      if (defaultGroupId && envelopeGroups.some((g) => g.id === defaultGroupId)) {
        setGroupId(defaultGroupId);
      } else if (envelopeGroups.length > 0) {
        setGroupId(envelopeGroups[0].id);
      } else {
        setGroupId('');
      }
    }
  }, [isOpen, defaultGroupId, envelopeGroups]);

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!groupId) {
      setError('Please select an envelope group.');
      return;
    }

    if (!name.trim()) {
      setError('Envelope category name is required.');
      return;
    }

    let parsedTarget: number | null = null;
    if (targetAmount.trim()) {
      const num = parseFloat(targetAmount);
      if (isNaN(num) || num < 0) {
        setError('Target monthly amount must be a valid non-negative number.');
        return;
      }
      parsedTarget = num;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onSubmit({
        group_id: groupId,
        name: name.trim(),
        target_amount: parsedTarget,
      });
      handleClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create envelope';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const envelopeSuggestions = [
    'Groceries & Food',
    'Electricity & Gas',
    'Petrol / Fuel',
    'House Rent',
    'Dining Out',
    'Pharmacy & Health',
    'Internet & Mobile',
    'Emergency Cushion',
    'Education Fees',
    'Vehicle Maintenance',
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        <span className="flex items-center gap-2">
          <PlusCircle className="w-5 h-5 text-emerald-400" />
          Add Budget Envelope
        </span>
      }
      description="Create a dedicated spending category under an envelope group."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Envelope Group Selector */}
        {envelopeGroups.length === 0 ? (
          <div className="p-3.5 rounded-xl bg-amber-950/60 border border-amber-800/80 text-amber-300 text-xs">
            Please create an envelope group first before creating individual envelopes.
          </div>
        ) : (
          <Select
            label="Envelope Group"
            value={groupId}
            onChange={(e) => {
              setGroupId(e.target.value);
              setError(null);
            }}
            required
          >
            {envelopeGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </Select>
        )}

        {/* Quick Suggestions */}
        <div>
          <label className="text-xs font-medium text-slate-400 mb-1.5 block">
            Popular Categories:
          </label>
          <div className="flex flex-wrap gap-1.5">
            {envelopeSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => {
                  setName(suggestion);
                  setError(null);
                }}
                className="px-2.5 py-1 rounded-lg text-xs bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-colors cursor-pointer"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        {/* Envelope Name */}
        <Input
          label="Envelope Name"
          placeholder="e.g. Groceries & Staples"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          required
          autoFocus
        />

        {/* Target Monthly Amount (Optional) */}
        <Input
          label="Monthly Target Budget (Optional)"
          type="number"
          step="100"
          min="0"
          placeholder="e.g. 25000"
          prefixText="PKR"
          value={targetAmount}
          onChange={(e) => {
            setTargetAmount(e.target.value);
            setError(null);
          }}
          helperText="Target monthly funding goal for visual pacing and indicators."
        />

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800/80 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-slate-800">
          <Button type="button" variant="ghost" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="emerald"
            size="sm"
            isLoading={isLoading}
            disabled={envelopeGroups.length === 0}
            leftIcon={<PlusCircle className="w-4 h-4" />}
          >
            Create Envelope
          </Button>
        </div>
      </form>
    </Modal>
  );
};
