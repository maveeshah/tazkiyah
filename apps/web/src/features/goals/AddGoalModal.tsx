import React, { useState } from 'react';
import { Target, Calendar, DollarSign, Layers } from 'lucide-react';
import type { GoalCreate, GoalType, EnvelopeGroupResponse } from '../../types/api';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export interface AddGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  envelopeGroups: EnvelopeGroupResponse[];
  onSubmit: (payload: Omit<GoalCreate, 'household_id'>) => Promise<unknown>;
}

export const AddGoalModal: React.FC<AddGoalModalProps> = ({
  isOpen,
  onClose,
  envelopeGroups,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [goalType, setGoalType] = useState<GoalType>('TARGET_BY_DATE');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [currentBalance, setCurrentBalance] = useState('');
  const [envelopeId, setEnvelopeId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Flatten all envelopes for linked envelope selector
  const allEnvelopes = React.useMemo(() => {
    return envelopeGroups.flatMap((grp) =>
      grp.envelopes.map((env) => ({
        id: env.id,
        name: env.name,
        groupName: grp.name,
      }))
    );
  }, [envelopeGroups]);

  const handleReset = () => {
    setName('');
    setGoalType('TARGET_BY_DATE');
    setTargetAmount('');
    setTargetDate('');
    setCurrentBalance('');
    setEnvelopeId('');
    setError(null);
    setIsLoading(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Please provide a descriptive goal name (e.g. "Umrah 2027")');
      return;
    }

    const parsedTargetAmount = parseFloat(targetAmount);
    if (isNaN(parsedTargetAmount) || parsedTargetAmount <= 0) {
      setError('Please enter a valid target amount greater than PKR 0');
      return;
    }

    if (goalType === 'TARGET_BY_DATE' && !targetDate) {
      setError('Target-by-date goals require a target deadline date');
      return;
    }

    const parsedCurrentBalance = currentBalance ? parseFloat(currentBalance) : 0;
    if (isNaN(parsedCurrentBalance) || parsedCurrentBalance < 0) {
      setError('Current balance cannot be negative');
      return;
    }

    setIsLoading(true);
    try {
      await onSubmit({
        name: trimmedName,
        goal_type: goalType,
        target_amount: parsedTargetAmount,
        target_date: targetDate ? targetDate : null,
        current_balance: parsedCurrentBalance,
        envelope_id: envelopeId ? envelopeId : null,
      });
      handleClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create goal';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        <span className="flex items-center gap-2">
          <Target className="w-5 h-5 text-emerald-400" />
          Create Financial Goal & Sinking Fund (R4)
        </span>
      }
      description="Track target savings, emergency cushions, or sinking funds with dynamic monthly pacing"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-800/80 text-rose-300 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Goal Name */}
        <Input
          label="Goal Name"
          placeholder="e.g. Umrah 2027, Hajj Fund, Car Maintenance"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />

        {/* Goal Type Selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-300">Goal Type</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setGoalType('TARGET_BY_DATE')}
              className={`px-3 py-2 rounded-xl text-xs font-medium border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                goalType === 'TARGET_BY_DATE'
                  ? 'bg-blue-950/80 text-blue-300 border-blue-600 shadow-sm'
                  : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span className="font-semibold">Target Date</span>
              <span className="text-[10px] text-slate-400">Paced monthly</span>
            </button>

            <button
              type="button"
              onClick={() => setGoalType('TARGET_CAP')}
              className={`px-3 py-2 rounded-xl text-xs font-medium border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                goalType === 'TARGET_CAP'
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600 shadow-sm'
                  : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span className="font-semibold">Target Cap</span>
              <span className="text-[10px] text-slate-400">Cushion limit</span>
            </button>

            <button
              type="button"
              onClick={() => setGoalType('SINKING_FUND')}
              className={`px-3 py-2 rounded-xl text-xs font-medium border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                goalType === 'SINKING_FUND'
                  ? 'bg-purple-950/80 text-purple-300 border-purple-600 shadow-sm'
                  : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="font-semibold">Sinking Fund</span>
              <span className="text-[10px] text-slate-400">Periodic repairs</span>
            </button>
          </div>
        </div>

        {/* Target Amount */}
        <Input
          label="Target Amount"
          type="number"
          step="any"
          min="1"
          placeholder="500,000"
          prefixText="PKR"
          value={targetAmount}
          onChange={(e) => setTargetAmount(e.target.value)}
          required
        />

        {/* Target Date (Required if TARGET_BY_DATE or SINKING_FUND) */}
        <Input
          label={`Target Date ${goalType === 'TARGET_BY_DATE' ? '(Required)' : '(Optional)'}`}
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
          helperText="Date by which the full target amount is intended to be accumulated"
          required={goalType === 'TARGET_BY_DATE'}
        />

        {/* Initial / Current Balance */}
        <Input
          label="Initial Current Balance (Optional)"
          type="number"
          step="any"
          min="0"
          placeholder="0.00"
          prefixText="PKR"
          value={currentBalance}
          onChange={(e) => setCurrentBalance(e.target.value)}
          helperText="Amount already accumulated towards this goal"
        />

        {/* Linked Envelope Selector */}
        <Select
          label="Link to Budget Envelope (Optional)"
          value={envelopeId}
          onChange={(e) => setEnvelopeId(e.target.value)}
          helperText="Link this goal directly to an envelope to synchronize monthly contributions"
        >
          <option value="">-- No envelope link (Standalone Goal) --</option>
          {allEnvelopes.map((env) => (
            <option key={env.id} value={env.id}>
              {env.name} ({env.groupName})
            </option>
          ))}
        </Select>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/80 mt-2">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="emerald"
            isLoading={isLoading}
            leftIcon={<DollarSign className="w-4 h-4" />}
          >
            Create Goal
          </Button>
        </div>
      </form>
    </Modal>
  );
};
