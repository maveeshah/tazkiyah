import React from 'react';
import { Sparkles, RefreshCw, Plus, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';
import type { ZBBSummaryResponse } from '../../types/api';

export interface HeaderProps {
  householdName?: string;
  userName?: string | null;
  zbbSummary: ZBBSummaryResponse | null;
  netLiquidWorth: number;
  isRefreshing?: boolean;
  onRefresh: () => void;
  onOpenAddAccount: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  householdName = 'Tazkiyah',
  userName = null,
  zbbSummary,
  netLiquidWorth,
  isRefreshing = false,
  onRefresh,
  onOpenAddAccount,
}) => {
  const unassignedCash = zbbSummary
    ? typeof zbbSummary.unassigned_cash === 'string'
      ? parseFloat(zbbSummary.unassigned_cash)
      : Number(zbbSummary.unassigned_cash)
    : 0;

  const totalInflow = zbbSummary
    ? typeof zbbSummary.total_inflow === 'string'
      ? parseFloat(zbbSummary.total_inflow)
      : Number(zbbSummary.total_inflow)
    : 0;

  const isBalanced = Math.abs(unassignedCash) < 0.01;
  const isSurplus = unassignedCash > 0.01;

  return (
    <header className="border-b border-slate-800/80 pb-5 pt-2 flex flex-col md:flex-row md:items-center justify-between gap-4">
      {/* Brand & Household Name */}
      <div className="flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/20 flex items-center justify-center">
          <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
            <span className="text-emerald-400 font-bold text-lg leading-none select-none">ت</span>
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-1.5">
              <span className="text-emerald-400">تزكية</span> Tazkiyah
            </h1>
            <span className="text-slate-600 font-mono">/</span>
            <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/60">
              {householdName}
            </span>
            {userName && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-emerald-950/60 text-emerald-300 border border-emerald-800/50">
                {userName}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Halal Wealth OS &bull; Zero-Based Budgeting &bull; Sub-Second Line Item Ledger
          </p>
        </div>
      </div>

      {/* Right Controls: Live ZBB Pill & Quick Actions */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Live Unassigned Cash Pill */}
        <div
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-mono font-medium shadow-sm transition-all duration-200 ${
            isBalanced
              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80 shadow-emerald-950/50'
              : isSurplus
              ? 'bg-amber-950/80 text-amber-300 border-amber-800/80 shadow-amber-950/50'
              : 'bg-rose-950/80 text-rose-300 border-rose-800/80 shadow-rose-950/50'
          }`}
        >
          {isBalanced ? (
            <>
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Unassigned: PKR 0.00 (ZBB Balanced)</span>
            </>
          ) : isSurplus ? (
            <>
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0 animate-bounce" />
              <span>To Assign: PKR {unassignedCash.toLocaleString('en-PK', { minimumFractionDigits: 2 })}</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 animate-pulse" />
              <span>Overassigned: PKR {Math.abs(unassignedCash).toLocaleString('en-PK', { minimumFractionDigits: 2 })}</span>
            </>
          )}
        </div>

        {/* Liquid Inflow Quick Metric */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs font-mono">
          <span className="text-slate-400">Total Liquid:</span>
          <span className="font-semibold text-slate-200">
            PKR {(netLiquidWorth || totalInflow).toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            isLoading={isRefreshing}
            aria-label="Refresh data"
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>

          <Button
            variant="emerald"
            size="sm"
            onClick={onOpenAddAccount}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Add Account
          </Button>
        </div>
      </div>
    </header>
  );
};
