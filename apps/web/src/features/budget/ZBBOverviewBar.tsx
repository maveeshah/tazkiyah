import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Coins,
  TrendingUp,
  ArrowRightLeft,
  DollarSign,
  PieChart,
  Plus,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import type { ZBBSummaryResponse } from '../../types/api';

export interface ZBBOverviewBarProps {
  zbbSummary: ZBBSummaryResponse | null;
  unassignedCash: number;
  isZeroBalanced: boolean;
  overspentCount: number;
  onOpenAssignModal?: () => void;
  onOpenRebalanceModal?: () => void;
  onOpenAddEnvelopeModal?: () => void;
  onOpenAddGroupModal?: () => void;
  isLoading?: boolean;
}

export const ZBBOverviewBar: React.FC<ZBBOverviewBarProps> = ({
  zbbSummary,
  unassignedCash,
  isZeroBalanced,
  overspentCount,
  onOpenAssignModal,
  onOpenRebalanceModal,
  onOpenAddEnvelopeModal,
  onOpenAddGroupModal,
}) => {
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

  const totalInflow = typeof zbbSummary?.total_inflow === 'string'
    ? parseFloat(zbbSummary.total_inflow) || 0
    : Number(zbbSummary?.total_inflow || 0);

  const totalAssigned = typeof zbbSummary?.total_assigned === 'string'
    ? parseFloat(zbbSummary.total_assigned) || 0
    : Number(zbbSummary?.total_assigned || 0);

  const totalSpent = typeof zbbSummary?.total_spent === 'string'
    ? parseFloat(zbbSummary.total_spent) || 0
    : Number(zbbSummary?.total_spent || 0);

  // "Money that came in" = current account balance + everything already spent.
  const originalInflow = totalInflow + totalSpent;
  const assignedPercentage = originalInflow > 0 ? Math.min(Math.round((totalAssigned / originalInflow) * 100), 100) : 0;
  const spentPercentage = totalAssigned > 0 ? Math.min(Math.round((totalSpent / totalAssigned) * 100), 100) : 0;

  // Determine State: Balanced, Surplus, or Deficit
  const isSurplus = unassignedCash >= 0.01;
  const isDeficit = unassignedCash <= -0.01;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* Hero Live Invariant Banner: Inflow - Assigned + Spent = Unassigned Cash */}
      <div
        className={`relative overflow-hidden rounded-3xl border transition-all duration-300 shadow-2xl p-6 md:p-8 ${
          isZeroBalanced
            ? 'bg-gradient-to-br from-emerald-950/70 via-slate-900/90 to-teal-950/70 border-emerald-500/50 shadow-emerald-950/40'
            : isSurplus
            ? 'bg-gradient-to-br from-blue-950/70 via-slate-900/90 to-amber-950/40 border-amber-500/40 shadow-amber-950/30'
            : 'bg-gradient-to-br from-rose-950/70 via-slate-900/90 to-red-950/60 border-rose-500/60 shadow-rose-950/40'
        }`}
      >
        {/* Glow effect */}
        <div
          className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none ${
            isZeroBalanced
              ? 'bg-emerald-500/10'
              : isSurplus
              ? 'bg-amber-500/10'
              : 'bg-rose-500/15'
          }`}
        />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-mono font-semibold border flex items-center gap-1.5 ${
                  isZeroBalanced
                    ? 'bg-emerald-900/60 text-emerald-300 border-emerald-700/80'
                    : isSurplus
                    ? 'bg-amber-900/60 text-amber-300 border-amber-700/80'
                    : 'bg-rose-900/60 text-rose-300 border-rose-700/80'
                }`}
              >
                {isZeroBalanced ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Zero-Based Budget (R1)
                  </>
                ) : isSurplus ? (
                  <>
                    <Coins className="w-3.5 h-3.5 text-amber-400" />
                    Unassigned Inflow Pool
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                    Budget Over-Allocation
                  </>
                )}
              </span>

              {isZeroBalanced && (
                <span className="text-xs text-emerald-400 font-medium flex items-center gap-1 bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-800/40">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Every Rupee Given a Job
                </span>
              )}
            </div>

            {/* Unassigned Cash Indicator Amount */}
            <div className="flex flex-col mt-1">
              <span className="text-xs text-slate-400 font-medium tracking-wide uppercase">
                Unassigned Cash Pool
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span
                  className={`text-lg font-bold font-mono ${
                    isZeroBalanced
                      ? 'text-emerald-400'
                      : isSurplus
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}
                >
                  PKR
                </span>
                <h1
                  className={`text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight font-mono ${
                    isZeroBalanced
                      ? 'text-emerald-300'
                      : isSurplus
                      ? 'text-amber-300'
                      : 'text-rose-300'
                  }`}
                >
                  {isSurplus ? `+${formatPKR(unassignedCash)}` : formatPKR(unassignedCash)}
                </h1>
              </div>
            </div>

            {/* Subtext description according to invariant state */}
            <p className="text-xs md:text-sm text-slate-300 max-w-xl">
              {isZeroBalanced && (
                <span className="text-emerald-300/90 font-medium">
                  Zero-Based Budget Equilibrium Achieved ✓ All liquid inflows are assigned to envelopes with zero unallocated waste.
                </span>
              )}
              {isSurplus && (
                <span className="text-amber-200/90 font-medium">
                  You have unassigned income ready to allocate. Assign every rupee to living envelopes or sinking funds until unassigned equals PKR 0.00.
                </span>
              )}
              {isDeficit && (
                <span className="text-rose-300/95 font-medium">
                  Over-allocated: Total envelope assignments exceed available cash inflow by PKR {formatPKR(Math.abs(unassignedCash))}. Reduce assignments or rebalance to maintain solvency.
                </span>
              )}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {isSurplus && onOpenAssignModal && (
              <Button
                variant="emerald"
                size="md"
                onClick={onOpenAssignModal}
                leftIcon={<DollarSign className="w-4 h-4" />}
                className="shadow-lg shadow-amber-900/30"
              >
                Assign Income
              </Button>
            )}

            {onOpenRebalanceModal && (
              <Button
                variant="secondary"
                size="md"
                onClick={onOpenRebalanceModal}
                leftIcon={<ArrowRightLeft className="w-4 h-4 text-emerald-400" />}
              >
                Rebalance Envelopes
              </Button>
            )}

            {onOpenAddEnvelopeModal && (
              <Button
                variant="outline"
                size="md"
                onClick={onOpenAddEnvelopeModal}
                leftIcon={<Plus className="w-4 h-4 text-slate-300" />}
              >
                Add Envelope
              </Button>
            )}

            {onOpenAddGroupModal && (
              <Button
                variant="ghost"
                size="md"
                onClick={onOpenAddGroupModal}
                leftIcon={<Layers className="w-4 h-4 text-slate-400" />}
              >
                Add Group
              </Button>
            )}
          </div>
        </div>

        {/* Dynamic Allocation Invariant Equation Footnote */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px] sm:text-xs">
            <span className="text-slate-300 font-semibold">Invariant:</span>
            <span className="text-slate-200">Inflow ({formatPKR(totalInflow)})</span>
            <span className="text-slate-400">&minus;</span>
            <span className="text-emerald-300">Assigned ({formatPKR(totalAssigned)})</span>
            <span className="text-slate-400">+</span>
            <span className="text-cyan-300">Spent ({formatPKR(totalSpent)})</span>
            <span className="text-slate-400">=</span>
            <span
              className={`font-bold ${
                isZeroBalanced
                  ? 'text-emerald-400'
                  : isSurplus
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              Unassigned ({formatPKR(unassignedCash)})
            </span>
          </div>

          <div className="text-[11px] text-slate-400 font-mono">
            {assignedPercentage}% Inflow Assigned &bull; {spentPercentage}% Assigned Spent
          </div>
        </div>
      </div>

      {/* 4 Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Liquid Inflow */}
        <Card variant="glass" hoverEffect className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                Total Liquid Inflow
              </span>
              <Badge variant="bank" size="sm">
                Active Capital
              </Badge>
            </div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xs font-mono font-medium text-slate-400">PKR</span>
              <span className="text-2xl font-bold font-mono text-slate-100 tracking-tight">
                {formatPKR(totalInflow)}
              </span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/60 text-[11px] text-slate-400 flex items-center justify-between">
            <span>From active accounts</span>
            <span className="text-blue-400 font-mono">100% Inflow Base</span>
          </div>
        </Card>

        {/* Card 2: Total Assigned Envelopes */}
        <Card variant="glass" hoverEffect className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-emerald-400" />
                Total Assigned
              </span>
              <Badge variant="primary" size="sm">
                {assignedPercentage}% Inflow
              </Badge>
            </div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xs font-mono font-medium text-emerald-400">PKR</span>
              <span className="text-2xl font-bold font-mono text-emerald-400 tracking-tight">
                {formatPKR(totalAssigned)}
              </span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/60 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Budgeted to envelopes</span>
            <span className="text-emerald-400 font-mono">{formatPKR(totalAssigned)}</span>
          </div>
        </Card>

        {/* Card 3: Total Spent Across All Envelopes */}
        <Card variant="glass" hoverEffect className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                <PieChart className="w-3.5 h-3.5 text-slate-300" />
                Total Spent
              </span>
              <Badge variant="neutral" size="sm">
                {spentPercentage}% Spent
              </Badge>
            </div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xs font-mono font-medium text-slate-400">PKR</span>
              <span className="text-2xl font-bold font-mono text-slate-200 tracking-tight">
                {formatPKR(totalSpent)}
              </span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/60 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Remaining in envelopes</span>
            <span className="text-slate-300 font-mono font-semibold">
              PKR {formatPKR(Math.max(totalAssigned - totalSpent, 0))}
            </span>
          </div>
        </Card>

        {/* Card 4: Overspent Envelopes Count */}
        <Card
          variant="glass"
          hoverEffect
          className={`flex flex-col justify-between ${
            overspentCount > 0
              ? 'border-rose-800/80 bg-gradient-to-b from-rose-950/30 via-slate-900/80 to-slate-900'
              : ''
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                <AlertCircle
                  className={`w-3.5 h-3.5 ${
                    overspentCount > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-400'
                  }`}
                />
                Overspent Categories
              </span>
              {overspentCount > 0 ? (
                <Badge variant="danger" size="sm" dot>
                  Needs Attention
                </Badge>
              ) : (
                <Badge variant="success" size="sm">
                  All Solvent
                </Badge>
              )}
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span
                className={`text-2xl font-bold font-mono tracking-tight ${
                  overspentCount > 0 ? 'text-rose-400' : 'text-slate-100'
                }`}
              >
                {overspentCount}
              </span>
              <span className="text-xs text-slate-400">
                {overspentCount === 1 ? 'envelope overdrawn' : 'envelopes overdrawn'}
              </span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/60 text-[11px] text-slate-400 flex items-center justify-between">
            {overspentCount > 0 ? (
              <button
                type="button"
                onClick={onOpenRebalanceModal}
                className="text-rose-300 hover:text-rose-200 font-medium flex items-center gap-1 cursor-pointer transition-colors"
              >
                Rebalance now <ArrowUpRight className="w-3 h-3" />
              </button>
            ) : (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> 0 deficits detected
              </span>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
