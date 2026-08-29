import React, { useState, useMemo } from 'react';
import {
  Target,
  Calendar,
  Plus,
  Clock,
  Sparkles,
  Link2,
  Filter,
  CheckCircle2,
  Pencil,
} from 'lucide-react';
import type { GoalResponse, GoalType, EnvelopeGroupResponse } from '../../types/api';
import { Card } from '../../components/ui/Card';
import { Badge, type BadgeVariant } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ProgressBar } from '../../components/ui/ProgressBar';

export interface GoalsTrackerProps {
  goals: GoalResponse[];
  envelopeGroups: EnvelopeGroupResponse[];
  onOpenAddGoal: () => void;
  onEditGoal?: (goal: GoalResponse) => void;
  isLoading?: boolean;
  className?: string;
}

export const GoalsTracker: React.FC<GoalsTrackerProps> = ({
  goals,
  envelopeGroups,
  onOpenAddGoal,
  onEditGoal,
  className = '',
}) => {
  const [filterType, setFilterType] = useState<string>('ALL');

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

  // Map envelope IDs to Envelope Name and Group Name
  const envelopeLookup = useMemo(() => {
    const map = new Map<string, { envelopeName: string; groupName: string }>();
    envelopeGroups.forEach((group) => {
      group.envelopes.forEach((env) => {
        map.set(env.id, { envelopeName: env.name, groupName: group.name });
      });
    });
    return map;
  }, [envelopeGroups]);

  // Aggregate stats across all goals
  const stats = useMemo(() => {
    let totalTarget = 0;
    let totalSaved = 0;

    goals.forEach((g) => {
      const target = typeof g.target_amount === 'string' ? parseFloat(g.target_amount) : Number(g.target_amount);
      const balance = typeof g.current_balance === 'string' ? parseFloat(g.current_balance) : Number(g.current_balance);
      totalTarget += isNaN(target) ? 0 : target;
      totalSaved += isNaN(balance) ? 0 : balance;
    });

    const overallPct = totalTarget > 0 ? Math.min(Math.round((totalSaved / totalTarget) * 100), 100) : 0;

    return {
      totalTarget,
      totalSaved,
      overallPct,
      remaining: Math.max(0, totalTarget - totalSaved),
    };
  }, [goals]);

  // Target Date formatting and Countdown calculation
  const getCountdownInfo = (targetDateStr?: string | null) => {
    if (!targetDateStr) return null;

    try {
      const target = new Date(targetDateStr);
      const now = new Date(); // August 2026

      const diffYears = target.getFullYear() - now.getFullYear();
      const diffMonths = diffYears * 12 + (target.getMonth() - now.getMonth());

      const formattedDate = target.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      });

      if (diffMonths <= 0) {
        return {
          formattedDate,
          text: 'Due this month',
          isPast: true,
        };
      } else if (diffMonths === 1) {
        return {
          formattedDate,
          text: '1 month remaining',
          isPast: false,
        };
      } else {
        return {
          formattedDate,
          text: `${diffMonths} months remaining`,
          isPast: false,
        };
      }
    } catch {
      return {
        formattedDate: targetDateStr,
        text: 'Target set',
        isPast: false,
      };
    }
  };

  const getGoalTypeBadge = (type: GoalType): { label: string; variant: BadgeVariant } => {
    switch (type) {
      case 'TARGET_BY_DATE':
        return { label: 'Target by Date', variant: 'bank' };
      case 'TARGET_CAP':
        return { label: 'Target Cap', variant: 'primary' };
      case 'SINKING_FUND':
        return { label: 'Sinking Fund', variant: 'credit' };
      default:
        return { label: type, variant: 'neutral' };
    }
  };

  const filteredGoals = useMemo(() => {
    if (filterType === 'ALL') return goals;
    return goals.filter((g) => g.goal_type === filterType);
  }, [goals, filterType]);

  return (
    <div className={`flex flex-col gap-6 ${className}`}>
      {/* Top Header with Stats and Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-400" />
            Financial Goals & Sinking Funds (R4)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Paced monthly savings for Umrah, Hajj, emergency cushions, and asset sinking funds
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Goal Type Filter */}
          <div className="relative flex items-center">
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-slate-900/80 border border-slate-800 rounded-xl pl-8 pr-7 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 cursor-pointer appearance-none"
            >
              <option value="ALL">All Goal Types ({goals.length})</option>
              <option value="TARGET_BY_DATE">Target by Date</option>
              <option value="TARGET_CAP">Target Cap</option>
              <option value="SINKING_FUND">Sinking Funds</option>
            </select>
          </div>

          <Button
            variant="emerald"
            size="md"
            onClick={onOpenAddGoal}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add New Goal
          </Button>
        </div>
      </div>

      {/* Aggregate Goal Progress Hero Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="glass" className="p-4 flex flex-col justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium">Total Target Capital</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xs font-mono text-slate-400">PKR</span>
              <span className="text-xl font-bold font-mono text-slate-100">
                {formatPKR(stats.totalTarget)}
              </span>
            </div>
          </div>
          <span className="text-[11px] text-slate-500 mt-2">Combined future liabilities</span>
        </Card>

        <Card variant="glass" className="p-4 flex flex-col justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium">Total Accumulated</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xs font-mono text-emerald-400">PKR</span>
              <span className="text-xl font-bold font-mono text-emerald-400">
                {formatPKR(stats.totalSaved)}
              </span>
            </div>
          </div>
          <span className="text-[11px] text-emerald-400 font-mono mt-2">
            {stats.overallPct}% Overall Completed
          </span>
        </Card>

        <Card variant="glass" className="p-4 flex flex-col justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium">Remaining Funding Gap</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xs font-mono text-slate-400">PKR</span>
              <span className="text-xl font-bold font-mono text-slate-200">
                {formatPKR(stats.remaining)}
              </span>
            </div>
          </div>
          <span className="text-[11px] text-slate-400 font-mono mt-2">To reach full funding</span>
        </Card>

        <Card variant="glass" className="p-4 flex flex-col justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium">Active Goal Portfolios</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-bold font-mono text-slate-100">
                {goals.length}
              </span>
              <span className="text-xs text-slate-400">Goals tracked</span>
            </div>
          </div>
          <span className="text-[11px] text-blue-400 font-mono mt-2">
            Zero-Based Budget Linked
          </span>
        </Card>
      </div>

      {/* Goals Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredGoals.map((goal) => {
          const target = typeof goal.target_amount === 'string' ? parseFloat(goal.target_amount) : Number(goal.target_amount) || 1;
          const current = typeof goal.current_balance === 'string' ? parseFloat(goal.current_balance) : Number(goal.current_balance) || 0;
          const pct = Math.min(Math.round((current / target) * 100), 100);
          const remaining = Math.max(0, target - current);
          const isCompleted = pct >= 100;

          const badgeInfo = getGoalTypeBadge(goal.goal_type);
          const countdown = getCountdownInfo(goal.target_date);
          const linkedEnv = goal.envelope_id ? envelopeLookup.get(goal.envelope_id) : null;

          const pacing = goal.monthly_pacing
            ? typeof goal.monthly_pacing === 'string'
              ? parseFloat(goal.monthly_pacing)
              : Number(goal.monthly_pacing)
            : null;

          return (
            <Card
              key={goal.id}
              variant="glass"
              hoverEffect
              className={`p-5 flex flex-col justify-between gap-4 relative overflow-hidden transition-all duration-200 ${
                isCompleted ? 'border-emerald-700/60 bg-emerald-950/20' : ''
              }`}
            >
              {onEditGoal && (
                <button
                  type="button"
                  onClick={() => onEditGoal(goal)}
                  aria-label={`Edit ${goal.name}`}
                  className="absolute top-3 right-3 z-10 p-1.5 rounded-lg bg-slate-900/70 text-slate-400 hover:text-emerald-400 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
              {/* Header: Name, Badges, and Linked Envelope */}
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-base font-bold text-slate-100 truncate flex items-center gap-2 pr-8">
                      {goal.name}
                      {isCompleted && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      )}
                    </h4>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <Badge variant={badgeInfo.variant} size="sm">
                        {badgeInfo.label}
                      </Badge>
                      {linkedEnv && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded-full border border-slate-800">
                          <Link2 className="w-3 h-3 text-emerald-400" />
                          {linkedEnv.envelopeName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Target Date & Countdown Indicator */}
                {countdown && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-300 font-mono mt-2 bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-800/80 w-fit">
                    <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span>Target: {countdown.formattedDate}</span>
                    <span className="text-slate-500">&bull;</span>
                    <span className="text-blue-300 font-semibold">{countdown.text}</span>
                  </div>
                )}
              </div>

              {/* Middle: Progress Bar & Balances */}
              <div className="flex flex-col gap-2 pt-2 border-t border-slate-800/60">
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-slate-400 font-medium">Accumulated Balance</span>
                  <div className="flex items-baseline gap-1 font-mono">
                    <span className="font-bold text-sm text-emerald-400">
                      PKR {formatPKR(current)}
                    </span>
                    <span className="text-slate-500 text-[11px]">/ PKR {formatPKR(target)}</span>
                  </div>
                </div>

                <ProgressBar
                  value={current}
                  max={target}
                  color="auto"
                  size="md"
                  showPercentage
                />

                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>Remaining: PKR {formatPKR(remaining)}</span>
                  <span className="font-semibold text-slate-200">{pct}% Funded</span>
                </div>
              </div>

              {/* Footer: Dynamic Monthly Pacing Indicator */}
              <div className="pt-3 border-t border-slate-800/70">
                {pacing && pacing > 0 && !isCompleted ? (
                  <div className="flex items-center justify-between bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 text-xs">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      Required Monthly Pacing:
                    </span>
                    <span className="font-bold font-mono text-emerald-300">
                      PKR {formatPKR(pacing)}/mo
                    </span>
                  </div>
                ) : isCompleted ? (
                  <div className="flex items-center justify-between bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-800/50 text-xs text-emerald-300 font-medium">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      Goal Milestone Achieved!
                    </span>
                    <span className="font-mono font-bold">100% Ready</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Target Cap Buffer</span>
                    <span className="font-mono text-slate-300">Steady Accumulation</span>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
