import React from 'react';
import {
  Search,
  X,
  RotateCcw,
  Wallet,
  FolderOpen,
  Radio,
  Calendar,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import type { AccountResponse, EnvelopeGroupResponse } from '../../types/api';

export interface LedgerFilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedAccount: string;
  onAccountChange: (accId: string) => void;
  selectedEnvelope: string;
  onEnvelopeChange: (envId: string) => void;
  selectedSource: string;
  onSourceChange: (source: string) => void;
  selectedDateRange: string;
  onDateRangeChange: (range: string) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  accounts: AccountResponse[];
  envelopeGroups: EnvelopeGroupResponse[];
  totalCount: number;
  filteredCount: number;
}

export const LedgerFilterBar: React.FC<LedgerFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedAccount,
  onAccountChange,
  selectedEnvelope,
  onEnvelopeChange,
  selectedSource,
  onSourceChange,
  selectedDateRange,
  onDateRangeChange,
  onClearFilters,
  hasActiveFilters,
  accounts,
  envelopeGroups,
  totalCount,
  filteredCount,
}) => {
  // Find current account and envelope labels for active pill tags
  const activeAccountObj = accounts.find((a) => a.id === selectedAccount);
  let activeEnvelopeName: string | undefined;
  for (const group of envelopeGroups) {
    const env = group.envelopes.find((e) => e.id === selectedEnvelope);
    if (env) {
      activeEnvelopeName = env.name;
      break;
    }
  }

  const dateRangeLabels: Record<string, string> = {
    ALL: 'All Time',
    THIS_MONTH: 'This Month',
    LAST_MONTH: 'Last Month',
    LAST_90_DAYS: 'Last 90 Days',
  };

  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 backdrop-blur-md p-4 sm:p-5 flex flex-col gap-4 shadow-lg shadow-black/20">
      {/* Top Row: Search Input & Primary Quick Filters */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        {/* Search Bar (Spans 5 cols on MD) */}
        <div className="md:col-span-4 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search merchant, item, note..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-9 py-2 text-xs sm:text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/80 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-0.5 rounded cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Account Selector */}
        <div className="md:col-span-2">
          <div className="relative">
            <select
              value={selectedAccount}
              onChange={(e) => onAccountChange(e.target.value)}
              className="w-full appearance-none bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/80 cursor-pointer"
            >
              <option value="ALL">All Accounts</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.type})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Envelope Selector */}
        <div className="md:col-span-2">
          <div className="relative">
            <select
              value={selectedEnvelope}
              onChange={(e) => onEnvelopeChange(e.target.value)}
              className="w-full appearance-none bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/80 cursor-pointer"
            >
              <option value="ALL">All Envelopes</option>
              {envelopeGroups.map((grp) => (
                <optgroup key={grp.id} label={grp.name}>
                  {grp.envelopes.map((env) => (
                    <option key={env.id} value={env.id}>
                      {env.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        </div>

        {/* Channel Source Selector */}
        <div className="md:col-span-2">
          <div className="relative">
            <select
              value={selectedSource}
              onChange={(e) => onSourceChange(e.target.value)}
              className="w-full appearance-none bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/80 cursor-pointer"
            >
              <option value="ALL">All Channels</option>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="WEB">Web App</option>
              <option value="MOBILE">Mobile</option>
            </select>
          </div>
        </div>

        {/* Date Range Selector */}
        <div className="md:col-span-2">
          <div className="relative">
            <select
              value={selectedDateRange}
              onChange={(e) => onDateRangeChange(e.target.value)}
              className="w-full appearance-none bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/80 cursor-pointer"
            >
              <option value="ALL">All Time</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="LAST_MONTH">Last Month</option>
              <option value="LAST_90_DAYS">Last 90 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bottom Filter Status Strip & Active Filter Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/60 pt-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-400 font-medium">
            Showing <span className="text-emerald-400 font-bold font-mono">{filteredCount}</span> of{' '}
            <span className="text-slate-300 font-bold font-mono">{totalCount}</span> transactions
          </span>

          {/* Active Filter Badges with (x) */}
          {searchQuery && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 text-[11px]">
              <span>Query: "{searchQuery}"</span>
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="hover:text-emerald-100 p-0.5 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {selectedAccount !== 'ALL' && activeAccountObj && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-950/80 border border-blue-800/80 text-blue-300 text-[11px]">
              <Wallet className="w-3 h-3 mr-0.5" />
              <span>Account: {activeAccountObj.name}</span>
              <button
                type="button"
                onClick={() => onAccountChange('ALL')}
                className="hover:text-blue-100 p-0.5 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {selectedEnvelope !== 'ALL' && activeEnvelopeName && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-950/80 border border-indigo-800/80 text-indigo-300 text-[11px]">
              <FolderOpen className="w-3 h-3 mr-0.5" />
              <span>Envelope: {activeEnvelopeName}</span>
              <button
                type="button"
                onClick={() => onEnvelopeChange('ALL')}
                className="hover:text-indigo-100 p-0.5 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {selectedSource !== 'ALL' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-950/80 border border-violet-800/80 text-violet-300 text-[11px]">
              <Radio className="w-3 h-3 mr-0.5" />
              <span>Channel: {selectedSource}</span>
              <button
                type="button"
                onClick={() => onSourceChange('ALL')}
                className="hover:text-violet-100 p-0.5 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {selectedDateRange !== 'ALL' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-950/80 border border-amber-800/80 text-amber-300 text-[11px]">
              <Calendar className="w-3 h-3 mr-0.5" />
              <span>Date: {dateRangeLabels[selectedDateRange] || selectedDateRange}</span>
              <button
                type="button"
                onClick={() => onDateRangeChange('ALL')}
                className="hover:text-amber-100 p-0.5 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>

        {/* Clear Filters Action Button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            leftIcon={<RotateCcw className="w-3 h-3 text-slate-400" />}
            className="text-xs text-rose-300 hover:text-rose-200 hover:bg-rose-950/30 py-1"
          >
            Clear Filters
          </Button>
        )}
      </div>
    </div>
  );
};
