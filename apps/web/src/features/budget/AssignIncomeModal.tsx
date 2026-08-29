import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Target,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import type { EnvelopeGroupResponse, EnvelopeResponse } from '../../types/api';

export interface AssignIncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  envelope: EnvelopeResponse | null;
  envelopeGroups?: EnvelopeGroupResponse[];
  unassignedCash: number;
  onSubmit: (envelopeId: string, assignedAmount: number | string) => Promise<unknown>;
}

export const AssignIncomeModal: React.FC<AssignIncomeModalProps> = ({
  isOpen,
  onClose,
  envelope,
  envelopeGroups = [],
  unassignedCash,
  onSubmit,
}) => {
  const [selectedEnvelopeId, setSelectedEnvelopeId] = useState<string>('');
  const [assignedAmount, setAssignedAmount] = useState<string>('0.00');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Flatten all envelopes for easy lookup if switching
  const allEnvelopes = React.useMemo(() => {
    const list: EnvelopeResponse[] = [];
    envelopeGroups.forEach((g) => {
      list.push(...g.envelopes);
    });
    return list;
  }, [envelopeGroups]);

  // Selected envelope object
  const activeEnvelope = React.useMemo(() => {
    if (selectedEnvelopeId) {
      const found = allEnvelopes.find((e) => e.id === selectedEnvelopeId);
      if (found) return found;
    }
    return envelope;
  }, [selectedEnvelopeId, allEnvelopes, envelope]);

  const currentAssigned = activeEnvelope
    ? parseFloat(String(activeEnvelope.assigned_amount)) || 0
    : 0;

  const currentSpent = activeEnvelope
    ? parseFloat(String(activeEnvelope.spent_amount)) || 0
    : 0;

  const targetAmount = activeEnvelope?.target_amount
    ? parseFloat(String(activeEnvelope.target_amount)) || 0
    : 0;

  // Max allowed assignment = current assigned + available unassigned cash
  const maxAllowedAssignment = Math.max(0, currentAssigned + unassignedCash);

  // Sync state when modal opens or envelope changes
  useEffect(() => {
    if (isOpen) {
      if (envelope) {
        setSelectedEnvelopeId(envelope.id);
        setAssignedAmount(String(envelope.assigned_amount || '0.00'));
      } else if (allEnvelopes.length > 0) {
        setSelectedEnvelopeId(allEnvelopes[0].id);
        setAssignedAmount(String(allEnvelopes[0].assigned_amount || '0.00'));
      }
      setError(null);
    }
  }, [isOpen, envelope, allEnvelopes]);

  const handleEnvelopeChange = (id: string) => {
    setSelectedEnvelopeId(id);
    const env = allEnvelopes.find((e) => e.id === id);
    if (env) {
      setAssignedAmount(String(env.assigned_amount || '0.00'));
    }
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const formatPKR = (amount: number | string | undefined | null) => {
    if (amount === undefined || amount === null) return '0.00';
    const val = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
    return isNaN(val)
      ? '0.00'
      : val.toLocaleString('en-PK', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
  };

  const numericValue = parseFloat(assignedAmount) || 0;
  const assignmentDelta = numericValue - currentAssigned;
  const isOverAllocating = assignmentDelta > unassignedCash + 0.001;

  // Quick increment handlers
  const handleAddAmount = (addValue: number) => {
    const current = parseFloat(assignedAmount) || 0;
    const next = Math.max(0, current + addValue);
    setAssignedAmount(next.toFixed(2));
    setError(null);
  };

  const handleSetTarget = () => {
    if (targetAmount > 0) {
      setAssignedAmount(targetAmount.toFixed(2));
      setError(null);
    }
  };

  const handleAssignAllUnassigned = () => {
    const available = Math.max(0, unassignedCash);
    const next = currentAssigned + available;
    setAssignedAmount(next.toFixed(2));
    setError(null);
  };

  const handleResetToZero = () => {
    setAssignedAmount('0.00');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEnvelope) {
      setError('Please select an envelope to assign funds to.');
      return;
    }

    const numAmount = parseFloat(assignedAmount);
    if (isNaN(numAmount) || numAmount < 0) {
      setError('Assigned amount must be a positive number or 0.00');
      return;
    }

    // Soft/Hard check against unassigned cash pool
    if (isOverAllocating) {
      setError(
        `Assignment exceeds available unassigned cash (PKR ${formatPKR(unassignedCash)}). Max allowed is PKR ${formatPKR(maxAllowedAssignment)}.`
      );
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onSubmit(activeEnvelope.id, numAmount);
      handleClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to assign envelope budget';
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
          <DollarSign className="w-5 h-5 text-emerald-400" />
          Assign Envelope Funds (Zero-Based Budget)
        </span>
      }
      description="Allocate liquid income into an envelope category to give every rupee a job."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Envelope Selector (if multiple exist or none was preselected) */}
        {allEnvelopes.length > 0 && (
          <Select
            label="Target Envelope Category"
            value={activeEnvelope?.id || selectedEnvelopeId}
            onChange={(e) => handleEnvelopeChange(e.target.value)}
          >
            {envelopeGroups.map((group) => (
              <optgroup key={group.id} label={group.name}>
                {group.envelopes.map((env) => (
                  <option key={env.id} value={env.id}>
                    {env.name} &bull; Current: PKR {formatPKR(env.assigned_amount)} (Spent: PKR {formatPKR(env.spent_amount)})
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
        )}

        {/* Live Invariant Card: Current Envelope Status & Unassigned Pool */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
          <div className="flex flex-col">
            <span className="text-[11px] text-slate-400 font-medium">Current Assignment</span>
            <span className="text-sm font-bold font-mono text-slate-200 mt-0.5">
              PKR {formatPKR(currentAssigned)}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              Spent: PKR {formatPKR(currentSpent)}
            </span>
          </div>

          <div className="flex flex-col border-t sm:border-t-0 sm:border-l border-slate-800 pt-2 sm:pt-0 sm:pl-3">
            <span className="text-[11px] text-slate-400 font-medium">Unassigned Cash</span>
            <span
              className={`text-sm font-bold font-mono mt-0.5 ${
                unassignedCash >= 0 ? 'text-amber-400' : 'text-rose-400'
              }`}
            >
              PKR {formatPKR(unassignedCash)}
            </span>
            <span className="text-[10px] text-slate-500">Available to allocate</span>
          </div>

          <div className="flex flex-col border-t sm:border-t-0 sm:border-l border-slate-800 pt-2 sm:pt-0 sm:pl-3">
            <span className="text-[11px] text-slate-400 font-medium">Max Allocation</span>
            <span className="text-sm font-bold font-mono text-emerald-400 mt-0.5">
              PKR {formatPKR(maxAllowedAssignment)}
            </span>
            <span className="text-[10px] text-slate-500">Envelope + Pool</span>
          </div>
        </div>

        {/* Assigned Amount Input */}
        <div className="flex flex-col gap-1.5">
          <Input
            label="New Assigned Monthly Budget (PKR)"
            type="number"
            step="100"
            min="0"
            placeholder="0.00"
            prefixText="PKR"
            value={assignedAmount}
            onChange={(e) => {
              setAssignedAmount(e.target.value);
              setError(null);
            }}
            required
            autoFocus
          />

          {/* Real-time Delta Feedback */}
          <div className="flex items-center justify-between text-xs font-mono px-1">
            <span className="text-slate-400">
              Change: {assignmentDelta >= 0 ? `+PKR ${formatPKR(assignmentDelta)}` : `-PKR ${formatPKR(Math.abs(assignmentDelta))}`}
            </span>
            <span
              className={`font-semibold ${
                isOverAllocating ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {isOverAllocating
                ? `Exceeds pool by PKR ${formatPKR(assignmentDelta - unassignedCash)}`
                : `Pool remaining: PKR ${formatPKR(Math.max(0, unassignedCash - assignmentDelta))}`}
            </span>
          </div>
        </div>

        {/* Quick Increment Buttons */}
        <div>
          <label className="text-xs font-medium text-slate-400 mb-1.5 block">
            Quick Adjustments:
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleAddAmount(1000)}
              className="px-2.5 py-1 rounded-lg text-xs bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/60 transition-colors font-mono cursor-pointer"
            >
              +1,000
            </button>
            <button
              type="button"
              onClick={() => handleAddAmount(5000)}
              className="px-2.5 py-1 rounded-lg text-xs bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/60 transition-colors font-mono cursor-pointer"
            >
              +5,000
            </button>
            <button
              type="button"
              onClick={() => handleAddAmount(10000)}
              className="px-2.5 py-1 rounded-lg text-xs bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/60 transition-colors font-mono cursor-pointer"
            >
              +10,000
            </button>
            <button
              type="button"
              onClick={() => handleAddAmount(25000)}
              className="px-2.5 py-1 rounded-lg text-xs bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/60 transition-colors font-mono cursor-pointer"
            >
              +25,000
            </button>

            {unassignedCash > 0 && (
              <button
                type="button"
                onClick={handleAssignAllUnassigned}
                className="px-2.5 py-1 rounded-lg text-xs bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-800/80 transition-colors font-medium flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" /> Assign All Unassigned
              </button>
            )}

            {targetAmount > 0 && (
              <button
                type="button"
                onClick={handleSetTarget}
                className="px-2.5 py-1 rounded-lg text-xs bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800/80 transition-colors font-medium flex items-center gap-1 cursor-pointer"
              >
                <Target className="w-3 h-3" /> Target ({formatPKR(targetAmount)})
              </button>
            )}

            <button
              type="button"
              onClick={handleResetToZero}
              className="px-2 py-1 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors flex items-center gap-1 cursor-pointer ml-auto"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
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
            disabled={isOverAllocating}
            leftIcon={<CheckCircle2 className="w-4 h-4" />}
          >
            Save Assignment
          </Button>
        </div>
      </form>
    </Modal>
  );
};
