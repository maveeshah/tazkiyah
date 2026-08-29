import React, { useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Shield,
  Coins,
  TrendingDown,
  Calendar,
  Sparkles,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import type { ZBBSummaryResponse, EnvelopeGroupResponse } from '../../types/api';
import { Gauge } from '../../components/ui/Gauge';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { ProgressBar } from '../../components/ui/ProgressBar';

export interface EmergencyRunwayProps {
  netLiquidWorth: number;
  totalCash: number;
  totalBank: number;
  totalEmi: number;
  zbbSummary: ZBBSummaryResponse | null;
  envelopeGroups: EnvelopeGroupResponse[];
  className?: string;
}

export const EmergencyRunway: React.FC<EmergencyRunwayProps> = ({
  netLiquidWorth,
  totalCash,
  totalBank,
  totalEmi,
  zbbSummary,
  envelopeGroups,
  className = '',
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

  // Derive Monthly Essential Living Burn Rate from envelope categories
  const { essentialMonthlyBurn } = useMemo(() => {
    let essential = 0;
    let savings = 0;
    let total = 0;

    envelopeGroups.forEach((group) => {
      const isSavingsGroup =
        group.name.toLowerCase().includes('savings') ||
        group.name.toLowerCase().includes('sinking') ||
        group.name.toLowerCase().includes('goals') ||
        group.name.toLowerCase().includes('invest');

      group.envelopes.forEach((env) => {
        const assigned = typeof env.assigned_amount === 'string' ? parseFloat(env.assigned_amount) : Number(env.assigned_amount);
        const validAssigned = isNaN(assigned) ? 0 : assigned;
        total += validAssigned;

        if (isSavingsGroup) {
          savings += validAssigned;
        } else {
          essential += validAssigned;
        }
      });
    });

    // Fallback if no envelopes or zero assigned
    if (essential === 0 && zbbSummary) {
      const totAssigned = typeof zbbSummary.total_assigned === 'string' ? parseFloat(zbbSummary.total_assigned) : Number(zbbSummary.total_assigned);
      essential = !isNaN(totAssigned) && totAssigned > 0 ? totAssigned * 0.65 : 65000;
      total = totAssigned || 100000;
    } else if (essential === 0) {
      essential = 65000;
      total = 100000;
    }

    return {
      essentialMonthlyBurn: essential,
      totalMonthlyBurn: total,
      savingsAssigned: savings,
    };
  }, [envelopeGroups, zbbSummary]);

  // Emergency Runway in Months = Total Liquid Inflow / Essential Monthly Burn Rate
  const runwayMonths = useMemo(() => {
    if (essentialMonthlyBurn <= 0) return 0;
    return netLiquidWorth / essentialMonthlyBurn;
  }, [netLiquidWorth, essentialMonthlyBurn]);

  // Projected survival date without any additional income
  const survivalDateString = useMemo(() => {
    const d = new Date();
    const fullMonths = Math.floor(runwayMonths);
    const extraDays = Math.round((runwayMonths - fullMonths) * 30);
    d.setMonth(d.getMonth() + fullMonths);
    d.setDate(d.getDate() + extraDays);

    return d.toLocaleDateString('en-PK', {
      month: 'long',
      year: 'numeric',
      day: 'numeric',
    });
  }, [runwayMonths]);

  // Target Milestone Calculations (1, 3, 6, 12 months)
  const milestones = useMemo(() => {
    return [
      {
        months: 1,
        title: 'Starter Cushion',
        subtitle: 'Immediate Buffer',
        targetAmount: essentialMonthlyBurn * 1,
        isAchieved: runwayMonths >= 1,
        color: 'rose' as const,
      },
      {
        months: 3,
        title: 'Basic Security',
        subtitle: 'Safety Net',
        targetAmount: essentialMonthlyBurn * 3,
        isAchieved: runwayMonths >= 3,
        color: 'amber' as const,
      },
      {
        months: 6,
        title: 'Halal Financial Freedom',
        subtitle: 'Sunnah Standard',
        targetAmount: essentialMonthlyBurn * 6,
        isAchieved: runwayMonths >= 6,
        color: 'emerald' as const,
      },
      {
        months: 12,
        title: 'Fortress Runway',
        subtitle: 'Ironclad Solvency',
        targetAmount: essentialMonthlyBurn * 12,
        isAchieved: runwayMonths >= 12,
        color: 'blue' as const,
      },
    ];
  }, [essentialMonthlyBurn, runwayMonths]);

  // Status message & risk level
  const statusInfo = useMemo(() => {
    if (runwayMonths >= 12) {
      return {
        label: 'Fortress Level — Zero Solvency Risk',
        variant: 'success' as const,
        description: 'You have over 1 year of liquid runway. Exceptional financial fortitude.',
        icon: ShieldCheck,
      };
    }
    if (runwayMonths >= 6) {
      return {
        label: `${runwayMonths.toFixed(1)} Months Runway — Halal Freedom Target Achieved`,
        variant: 'success' as const,
        description: 'Full 6-month buffer meets Islamic wealth preservation benchmarks.',
        icon: ShieldCheck,
      };
    }
    if (runwayMonths >= 3) {
      return {
        label: `Moderate ${runwayMonths.toFixed(1)} Months Runway — Low Risk`,
        variant: 'info' as const,
        description: 'Solid buffer covering 3+ months of living costs. On track to 6-month goal.',
        icon: Shield,
      };
    }
    if (runwayMonths >= 1) {
      return {
        label: `Warning ${runwayMonths.toFixed(1)} Months Runway — Moderate Risk`,
        variant: 'warning' as const,
        description: 'Covering immediate monthly needs. Prioritize emergency cushion envelope.',
        icon: ShieldAlert,
      };
    }
    return {
      label: `Critical ${runwayMonths.toFixed(1)} Months Runway — High Fragility`,
      variant: 'danger' as const,
      description: 'Less than 1 month of living reserves. Increase emergency cushion savings.',
      icon: ShieldAlert,
    };
  }, [runwayMonths]);

  const StatusIcon = statusInfo.icon;

  return (
    <div className={`flex flex-col gap-6 ${className}`}>
      {/* Hero Runway Card */}
      <Card variant="glass" className="overflow-hidden relative">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 p-2">
          {/* Left Column: Gauge and Big Numbers */}
          <div className="flex flex-col sm:flex-row items-center gap-6 w-full lg:w-auto">
            <div className="shrink-0 p-2">
              <Gauge
                value={runwayMonths}
                max={12}
                min={0}
                size={220}
                label="Liquid Runway"
                unit="Months"
                thresholds={{ danger: 2, warning: 4, safe: 6 }}
              />
            </div>

            <div className="flex flex-col gap-2 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <Badge variant={statusInfo.variant} size="md" dot>
                  <StatusIcon className="w-3.5 h-3.5" />
                  {statusInfo.label}
                </Badge>
              </div>

              <div className="flex flex-col mt-1">
                <span className="text-xs text-slate-400 font-medium tracking-wide uppercase">
                  Current Liquid Runway Duration
                </span>
                <div className="flex items-baseline justify-center sm:justify-start gap-2 mt-0.5">
                  <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight font-mono text-slate-100">
                    {runwayMonths.toFixed(1)}
                  </h2>
                  <span className="text-lg font-bold font-mono text-emerald-400">Months</span>
                </div>
              </div>

              <p className="text-xs text-slate-300 max-w-md mt-1">
                {statusInfo.description}
              </p>

              {/* Survival Horizon Date */}
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-2 text-xs font-mono text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800 w-fit mx-auto sm:mx-0">
                <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Funds sustain through: <strong className="text-slate-200">{survivalDateString}</strong></span>
              </div>
            </div>
          </div>

          {/* Right Column: Liquid Cash Breakdown & Essential Burn Stats */}
          <div className="flex flex-col gap-3 w-full lg:max-w-md border-t lg:border-t-0 lg:border-l border-slate-800/80 pt-6 lg:pt-0 lg:pl-8">
            <span className="text-xs font-semibold text-slate-300 tracking-wide uppercase flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-emerald-400" />
              Solvency Formula & Metrics
            </span>

            <div className="grid grid-cols-2 gap-3">
              {/* Stat 1: Total Liquid Cash Inflow */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Total Liquid Capital</span>
                <span className="text-sm font-bold font-mono text-slate-100 block mt-0.5">
                  PKR {formatPKR(netLiquidWorth)}
                </span>
                <span className="text-[10px] text-slate-500 block mt-1">
                  Cash ({formatPKR(totalCash)}) + Bank ({formatPKR(totalBank)}) + EMI ({formatPKR(totalEmi)})
                </span>
              </div>

              {/* Stat 2: Monthly Essential Burn */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-[11px] text-slate-400 block flex items-center gap-1">
                  <TrendingDown className="w-3 h-3 text-rose-400" /> Monthly Essential Burn
                </span>
                <span className="text-sm font-bold font-mono text-rose-300 block mt-0.5">
                  PKR {formatPKR(essentialMonthlyBurn)}/mo
                </span>
                <span className="text-[10px] text-slate-500 block mt-1">
                  Living & Discretionary Envelopes
                </span>
              </div>
            </div>

            {/* Target 6-Month Sunnah Freedom Benchmark Gap */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/50 to-slate-900/60 border border-emerald-800/60 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-emerald-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  6-Month Freedom Target
                </span>
                <span className="font-mono font-bold text-slate-200">
                  PKR {formatPKR(essentialMonthlyBurn * 6)}
                </span>
              </div>

              <ProgressBar
                value={netLiquidWorth}
                max={essentialMonthlyBurn * 6}
                color="auto"
                size="sm"
                showPercentage
              />

              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>
                  {netLiquidWorth >= essentialMonthlyBurn * 6 ? (
                    <span className="text-emerald-400 font-medium">✓ Fully Funded</span>
                  ) : (
                    <span>Gap: PKR {formatPKR((essentialMonthlyBurn * 6) - netLiquidWorth)}</span>
                  )}
                </span>
                <span className="text-slate-400 font-mono">
                  {Math.min(Math.round((netLiquidWorth / (essentialMonthlyBurn * 6)) * 100), 100)}% Reached
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Target Milestone Runway Progression Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              Emergency Cushion Milestones
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Progressive liquidity thresholds based on essential living expenditure
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {milestones.map((m) => {
            const pct = Math.min(Math.round((netLiquidWorth / m.targetAmount) * 100), 100);

            return (
              <Card
                key={m.months}
                variant="glass"
                className={`p-4 flex flex-col justify-between gap-3 relative overflow-hidden transition-all ${
                  m.isAchieved
                    ? 'border-emerald-700/60 bg-emerald-950/20'
                    : 'border-slate-800/80 bg-slate-900/50'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
                        {m.months} {m.months === 1 ? 'Month' : 'Months'}
                      </span>
                      <h4 className="text-sm font-bold text-slate-100 mt-0.5">
                        {m.title}
                      </h4>
                    </div>

                    {m.isAchieved ? (
                      <span className="p-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-700 shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                      </span>
                    ) : (
                      <span className="p-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
                        <Lock className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline justify-between mt-3 mb-1.5">
                    <span className="text-xs text-slate-400 font-mono">Target:</span>
                    <span className="text-xs font-bold font-mono text-slate-200">
                      PKR {formatPKR(m.targetAmount)}
                    </span>
                  </div>

                  <ProgressBar
                    value={netLiquidWorth}
                    max={m.targetAmount}
                    color={m.isAchieved ? 'emerald' : m.color}
                    size="sm"
                  />
                </div>

                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">{m.subtitle}</span>
                  <span
                    className={`font-mono font-bold ${
                      m.isAchieved ? 'text-emerald-400' : 'text-slate-300'
                    }`}
                  >
                    {pct}%
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};
