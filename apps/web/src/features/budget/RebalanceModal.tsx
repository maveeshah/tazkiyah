import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowRightLeft,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import type { EnvelopeGroupResponse, EnvelopeResponse } from '../../types/api';

export interface RebalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceEnvelope?: EnvelopeResponse | null;
  targetEnvelope?: EnvelopeResponse | null;
  envelopeGroups: EnvelopeGroupResponse[];
  onSubmit: (fromEnvelopeId: string, toEnvelopeId: string, amount: number | string) => Promise<unknown>;
}

export const RebalanceModal: React.FC<RebalanceModalProps> = ({
  isOpen,
  onClose,
  sourceEnvelope,
  targetEnvelope,
  envelopeGroups,
  onSubmit,
}) => {
  const [fromEnvelopeId, setFromEnvelopeId] = useState<string>('');
  const [toEnvelopeId, setToEnvelopeId] = useState<string>('');
  const [amount, setAmount] = useState<string>('0.00');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Flatten all envelopes for easy access
  const allEnvelopes = useMemo(() => {
    const list: EnvelopeResponse[] = [];
    envelopeGroups.forEach((g) => {
      list.push(...g.envelopes);
    });
    return list;
  }, [envelopeGroups]);

  // Find active source & target envelope objects
  const fromEnvelope = useMemo(() => {
    return allEnvelopes.find((e) => e.id === fromEnvelopeId) || null;
  }, [allEnvelopes, fromEnvelopeId]);

  const toEnvelope = useMemo(() => {
    return allEnvelopes.find((e) => e.id === toEnvelopeId) || null;
  }, [allEnvelopes, toEnvelopeId]);

  const formatPKR = (val: number | string | undefined | null) => {
    if (val === undefined || val === null) return '0.00';
    const num = typeof val === 'string' ? parseFloat(val) : Number(val);
    return isNaN(num)
      ? '0.00'
      : num.toLocaleString('en-PK', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
  };

  // Sync state when modal opens or initial props change
  useEffect(() => {
    if (isOpen) {
      setError(null);

      // Default fromEnvelope
      let initialFromId = sourceEnvelope?.id || '';
      let initialToId = targetEnvelope?.id || '';

      // If neither is provided, find first envelope with positive balance as source
      // and first envelope or overspent envelope as destination
      if (!initialFromId && allEnvelopes.length > 0) {
        const solvent = allEnvelopes.find((e) => {
          const a = parseFloat(String(e.assigned_amount)) || 0;
          const s = parseFloat(String(e.spent_amount)) || 0;
          return a - s > 0 && e.id !== initialToId;
        });
        initialFromId = solvent?.id || allEnvelopes[0].id;
      }

      if (!initialToId && allEnvelopes.length > 1) {
        const overspent = allEnvelopes.find((e) => {
          const a = parseFloat(String(e.assigned_amount)) || 0;
          const s = parseFloat(String(e.spent_amount)) || 0;
          return a - s < 0 && e.id !== initialFromId;
        });
        initialToId = overspent?.id || allEnvelopes.find((e) => e.id !== initialFromId)?.id || '';
      }

      setFromEnvelopeId(initialFromId);
      setToEnvelopeId(initialToId);

      // Auto-calculate suggested amount if target is overspent
      const dest = allEnvelopes.find((e) => e.id === initialToId);
      if (dest) {
        const destAssigned = parseFloat(String(dest.assigned_amount)) || 0;
        const destSpent = parseFloat(String(dest.spent_amount)) || 0;
        const deficit = destSpent - destAssigned;
        if (deficit > 0) {
          setAmount(deficit.toFixed(2));
        } else {
          setAmount('1000.00');
        }
      } else {
        setAmount('1000.00');
      }
    }
  }, [isOpen, sourceEnvelope, targetEnvelope, allEnvelopes]);

  const sourceAssigned = fromEnvelope ? parseFloat(String(fromEnvelope.assigned_amount)) || 0 : 0;
  const sourceSpent = fromEnvelope ? parseFloat(String(fromEnvelope.spent_amount)) || 0 : 0;
  const sourceAvailable = sourceAssigned - sourceSpent;

  const targetAssigned = toEnvelope ? parseFloat(String(toEnvelope.assigned_amount)) || 0 : 0;
  const targetSpent = toEnvelope ? parseFloat(String(toEnvelope.spent_amount)) || 0 : 0;
  const targetAvailable = targetAssigned - targetSpent;
  const targetDeficit = targetAvailable < 0 ? Math.abs(targetAvailable) : 0;

  const transferNum = parseFloat(amount) || 0;
  const isTransferExceeding = transferNum > sourceAssigned + 0.001;

  const handleSwap = () => {
    const temp = fromEnvelopeId;
    setFromEnvelopeId(toEnvelopeId);
    setToEnvelopeId(temp);
    setError(null);
  };

  const handlePercentage = (pct: number) => {
    const base = Math.max(0, sourceAvailable > 0 ? sourceAvailable : sourceAssigned);
    const calculated = (base * pct) / 100;
    setAmount(calculated.toFixed(2));
    setError(null);
  };

  const handleCoverDeficit = () => {
    if (targetDeficit > 0) {
      setAmount(targetDeficit.toFixed(2));
      setError(null);
    }
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fromEnvelopeId || !toEnvelopeId) {
      setError('Please select both a source and destination envelope.');
      return;
    }

    if (fromEnvelopeId === toEnvelopeId) {
      setError('Source and destination envelopes must be different.');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Transfer amount must be greater than PKR 0.00.');
      return;
    }

    if (numAmount > sourceAssigned) {
      setError(
        `Transfer amount (PKR ${formatPKR(numAmount)}) exceeds the total assigned amount of source envelope (PKR ${formatPKR(sourceAssigned)}).`
      );
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onSubmit(fromEnvelopeId, toEnvelopeId, numAmount);
      handleClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to rebalance envelopes';
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
          <ArrowRightLeft className="w-5 h-5 text-emerald-400" />
          Rebalance Envelope Funds
        </span>
      }
      description="Transfer allocated budget from one envelope to cover overspending or adjust priorities."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Source & Destination Envelope Selection Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
          {/* Source Envelope (From) */}
          <div className="flex flex-col gap-2 p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">
                Transfer From (Source)
              </label>
              <span className="text-[11px] font-mono text-emerald-400 font-medium">
                Avail: PKR {formatPKR(sourceAvailable)}
              </span>
            </div>

            <Select
              value={fromEnvelopeId}
              onChange={(e) => {
                setFromEnvelopeId(e.target.value);
                setError(null);
              }}
            >
              <option value="" disabled>
                Select source envelope...
              </option>
              {envelopeGroups.map((group) => (
                <optgroup key={group.id} label={group.name}>
                  {group.envelopes.map((env) => {
                    const avail =
                      (parseFloat(String(env.assigned_amount)) || 0) -
                      (parseFloat(String(env.spent_amount)) || 0);
                    return (
                      <option
                        key={env.id}
                        value={env.id}
                        disabled={env.id === toEnvelopeId}
                      >
                        {env.name} (PKR {formatPKR(avail)} avail)
                      </option>
                    );
                  })}
                </optgroup>
              ))}
            </Select>

            {fromEnvelope && (
              <div className="text-[11px] text-slate-400 font-mono flex justify-between pt-1 border-t border-slate-800/60">
                <span>Assigned: PKR {formatPKR(sourceAssigned)}</span>
                <span>Spent: PKR {formatPKR(sourceSpent)}</span>
              </div>
            )}
          </div>

          {/* Swap Button (Floating on desktop) */}
          <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <button
              type="button"
              onClick={handleSwap}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center shadow-lg transition-colors cursor-pointer"
              title="Swap source and destination"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-400" />
            </button>
          </div>

          {/* Destination Envelope (To) */}
          <div className="flex flex-col gap-2 p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">
                Transfer To (Destination)
              </label>
              {targetDeficit > 0 ? (
                <Badge variant="danger" size="sm">
                  Deficit: PKR {formatPKR(targetDeficit)}
                </Badge>
              ) : (
                <span className="text-[11px] font-mono text-slate-400">
                  Avail: PKR {formatPKR(targetAvailable)}
                </span>
              )}
            </div>

            <Select
              value={toEnvelopeId}
              onChange={(e) => {
                setToEnvelopeId(e.target.value);
                const dest = allEnvelopes.find((env) => env.id === e.target.value);
                if (dest) {
                  const dAssigned = parseFloat(String(dest.assigned_amount)) || 0;
                  const dSpent = parseFloat(String(dest.spent_amount)) || 0;
                  const def = dSpent - dAssigned;
                  if (def > 0) setAmount(def.toFixed(2));
                }
                setError(null);
              }}
            >
              <option value="" disabled>
                Select destination envelope...
              </option>
              {envelopeGroups.map((group) => (
                <optgroup key={group.id} label={group.name}>
                  {group.envelopes.map((env) => {
                    const avail =
                      (parseFloat(String(env.assigned_amount)) || 0) -
                      (parseFloat(String(env.spent_amount)) || 0);
                    return (
                      <option
                        key={env.id}
                        value={env.id}
                        disabled={env.id === fromEnvelopeId}
                      >
                        {env.name} {avail < 0 ? `(OVERSPENT by PKR ${formatPKR(Math.abs(avail))})` : `(PKR ${formatPKR(avail)})`}
                      </option>
                    );
                  })}
                </optgroup>
              ))}
            </Select>

            {toEnvelope && (
              <div className="text-[11px] text-slate-400 font-mono flex justify-between pt-1 border-t border-slate-800/60">
                <span>Assigned: PKR {formatPKR(targetAssigned)}</span>
                <span>Spent: PKR {formatPKR(targetSpent)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Transfer Amount Input */}
        <div className="flex flex-col gap-1.5">
          <Input
            label="Transfer Amount (PKR)"
            type="number"
            step="100"
            min="1"
            placeholder="0.00"
            prefixText="PKR"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setError(null);
            }}
            required
            autoFocus
          />

          {/* Real-time Validation / Projection */}
          <div className="flex items-center justify-between text-xs font-mono px-1">
            <span className="text-slate-400">
              Source remaining: PKR {formatPKR(Math.max(0, sourceAssigned - transferNum))}
            </span>
            <span
              className={`font-semibold ${
                isTransferExceeding ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {isTransferExceeding
                ? `Exceeds source assigned (PKR ${formatPKR(sourceAssigned)})`
                : `Destination becomes: PKR ${formatPKR(targetAssigned + transferNum)}`}
            </span>
          </div>
        </div>

        {/* Quick Presets & Deficit Coverage */}
        <div>
          <label className="text-xs font-medium text-slate-400 mb-1.5 block">
            Quick Transfer Presets:
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {targetDeficit > 0 && (
              <button
                type="button"
                onClick={handleCoverDeficit}
                className="px-2.5 py-1 rounded-lg text-xs bg-rose-950/70 hover:bg-rose-900/80 text-rose-300 border border-rose-800/80 transition-colors font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-rose-400" />
                Cover Deficit Exactly (PKR {formatPKR(targetDeficit)})
              </button>
            )}

            <button
              type="button"
              onClick={() => handlePercentage(25)}
              className="px-2.5 py-1 rounded-lg text-xs bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/60 transition-colors font-mono cursor-pointer"
            >
              25% of Avail
            </button>
            <button
              type="button"
              onClick={() => handlePercentage(50)}
              className="px-2.5 py-1 rounded-lg text-xs bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/60 transition-colors font-mono cursor-pointer"
            >
              50% of Avail
            </button>
            <button
              type="button"
              onClick={() => handlePercentage(100)}
              className="px-2.5 py-1 rounded-lg text-xs bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/60 transition-colors font-mono cursor-pointer"
            >
              100% of Avail
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
            disabled={isTransferExceeding || fromEnvelopeId === toEnvelopeId}
            leftIcon={<ArrowRightLeft className="w-4 h-4" />}
          >
            Execute Rebalance
          </Button>
        </div>
      </form>
    </Modal>
  );
};
