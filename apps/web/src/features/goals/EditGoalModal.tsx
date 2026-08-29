import React, { useEffect, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import type { GoalResponse, GoalUpdate } from '../../types/api';

export interface EditGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: GoalResponse | null;
  onSubmit: (goalId: string, payload: GoalUpdate) => Promise<unknown>;
  onDelete: (goalId: string) => Promise<unknown>;
}

export const EditGoalModal: React.FC<EditGoalModalProps> = ({ isOpen, onClose, goal, onSubmit, onDelete }) => {
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [currentBalance, setCurrentBalance] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLinked = Boolean(goal?.envelope_id);

  useEffect(() => {
    if (goal) {
      setName(goal.name);
      setTargetAmount(String(goal.target_amount));
      setTargetDate(goal.target_date ?? '');
      setCurrentBalance(String(goal.current_balance));
      setError(null);
    }
  }, [goal]);

  if (!goal) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedTarget = parseFloat(targetAmount);
    if (Number.isNaN(parsedTarget) || parsedTarget < 0) {
      setError('Target amount must be zero or positive');
      return;
    }
    const payload: GoalUpdate = {
      name: name.trim(),
      target_amount: parsedTarget,
      target_date: targetDate ? targetDate : null,
    };
    if (!isLinked) {
      const parsedBalance = currentBalance ? parseFloat(currentBalance) : 0;
      if (Number.isNaN(parsedBalance) || parsedBalance < 0) {
        setError('Current balance cannot be negative');
        return;
      }
      payload.current_balance = parsedBalance;
    }
    setIsLoading(true);
    setError(null);
    try {
      await onSubmit(goal.id, payload);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update goal');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete goal "${goal.name}"?`)) return;
    setIsDeleting(true);
    setError(null);
    try {
      await onDelete(goal.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete goal');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={<span className="flex items-center gap-2"><Pencil className="w-4 h-4 text-emerald-400" /> Edit goal</span>}
      description={isLinked ? 'Balance is derived from the linked envelope and can’t be edited here.' : undefined}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input label="Goal name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <Input
          label="Target amount"
          type="number"
          step="0.01"
          prefixText="PKR"
          value={targetAmount}
          onChange={(e) => setTargetAmount(e.target.value)}
        />
        <Input
          label="Target date (optional)"
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
        />
        <Input
          label="Current balance"
          type="number"
          step="0.01"
          prefixText="PKR"
          value={currentBalance}
          onChange={(e) => setCurrentBalance(e.target.value)}
          disabled={isLinked}
          helperText={isLinked ? 'Read-only — tracks the linked envelope.' : 'Add or adjust the amount saved so far.'}
        />

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800/80 text-rose-300 text-xs">{error}</div>
        )}

        <div className="flex items-center justify-between gap-3 mt-2 pt-4 border-t border-slate-800">
          <Button type="button" variant="danger" size="sm" onClick={handleDelete} isLoading={isDeleting} leftIcon={<Trash2 className="w-4 h-4" />}>
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
