import React, { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  ArrowRightLeft,
  DollarSign,
  Edit2,
  FolderPlus,
  Search,
  AlertCircle,
  Target,
  Sparkles,
  Layers,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ProgressBar } from '../../components/ui/ProgressBar';
import type { EnvelopeGroupResponse, EnvelopeResponse } from '../../types/api';

export interface BudgetTableProps {
  envelopeGroups: EnvelopeGroupResponse[];
  onAssignEnvelope: (envelope: EnvelopeResponse) => void;
  onRebalanceEnvelope: (sourceEnvelope?: EnvelopeResponse, targetEnvelope?: EnvelopeResponse) => void;
  onAddEnvelope: (groupId?: string) => void;
  onAddGroup: () => void;
  onEditEnvelope?: (envelope: EnvelopeResponse) => void;
  onEditGroup?: (group: EnvelopeGroupResponse) => void;
  isLoading?: boolean;
}

export const BudgetTable: React.FC<BudgetTableProps> = ({
  envelopeGroups,
  onAssignEnvelope,
  onRebalanceEnvelope,
  onAddEnvelope,
  onAddGroup,
  onEditEnvelope,
  onEditGroup,
  isLoading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<Set<string>>(new Set());

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

  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const expandAll = () => setCollapsedGroupIds(new Set());
  const collapseAll = () => {
    setCollapsedGroupIds(new Set(envelopeGroups.map((g) => g.id)));
  };

  // Filter groups and envelopes by search query
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return envelopeGroups;
    const query = searchQuery.toLowerCase().trim();

    return envelopeGroups
      .map((group) => {
        const matchesGroupName = group.name.toLowerCase().includes(query);
        const matchingEnvelopes = group.envelopes.filter((env) =>
          env.name.toLowerCase().includes(query)
        );

        if (matchesGroupName) {
          return group;
        }

        if (matchingEnvelopes.length > 0) {
          return {
            ...group,
            envelopes: matchingEnvelopes,
          };
        }

        return null;
      })
      .filter((g): g is EnvelopeGroupResponse => g !== null);
  }, [envelopeGroups, searchQuery]);

  // Grand Totals
  const grandTotals = useMemo(() => {
    let assigned = 0;
    let spent = 0;
    let available = 0;
    let overspentCount = 0;

    envelopeGroups.forEach((g) => {
      g.envelopes.forEach((env) => {
        const a = parseFloat(String(env.assigned_amount)) || 0;
        const s = parseFloat(String(env.spent_amount)) || 0;
        const avail = a - s;
        assigned += a;
        spent += s;
        available += avail;
        if (avail < 0) overspentCount += 1;
      });
    });

    return { assigned, spent, available, overspentCount };
  }, [envelopeGroups]);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* Table Top Controls & Search Bar */}
      <Card variant="glass" className="p-4 sm:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              Envelope Budget Allocation Table (R1)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Manage zero-based categories, assign monthly inflows, and track remaining available balances.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search envelopes or groups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950/70 border border-slate-800 rounded-xl pl-9 pr-3.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/80"
              />
            </div>

            {/* Quick Actions */}
            <Button
              variant="outline"
              size="sm"
              onClick={onAddGroup}
              leftIcon={<FolderPlus className="w-3.5 h-3.5 text-slate-300" />}
            >
              Add Group
            </Button>

            <Button
              variant="emerald"
              size="sm"
              onClick={() => onAddEnvelope()}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Envelope
            </Button>
          </div>
        </div>

        {/* Global summary strip & expand/collapse toggle */}
        <div className="mt-4 pt-3 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <span className="font-medium text-slate-300">
              {envelopeGroups.length} Groups &bull;{' '}
              {envelopeGroups.reduce((sum, g) => sum + g.envelopes.length, 0)} Envelopes
            </span>
            {grandTotals.overspentCount > 0 && (
              <span className="text-rose-400 font-semibold flex items-center gap-1 bg-rose-950/40 px-2 py-0.5 rounded border border-rose-800/40 text-[11px]">
                <AlertCircle className="w-3 h-3" />
                {grandTotals.overspentCount} Overspent
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={expandAll}
              className="text-slate-400 hover:text-slate-200 text-xs px-2 py-1 rounded hover:bg-slate-800/60 transition-colors cursor-pointer"
            >
              Expand All
            </button>
            <span className="text-slate-600">&bull;</span>
            <button
              onClick={collapseAll}
              className="text-slate-400 hover:text-slate-200 text-xs px-2 py-1 rounded hover:bg-slate-800/60 transition-colors cursor-pointer"
            >
              Collapse All
            </button>
          </div>
        </div>
      </Card>

      {/* Main Hierarchical Table Accordions */}
      {filteredGroups.length === 0 && !isLoading ? (
        <Card className="text-center py-16">
          <Layers className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h4 className="text-sm font-semibold text-slate-300">
            {searchQuery ? 'No envelopes match your search' : 'No envelope groups configured yet'}
          </h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
            {searchQuery
              ? `No envelope or group found matching "${searchQuery}". Try clearing the search filter.`
              : 'Create standard envelope groups like "Daily Living", "Utilities", or "Savings" to start zero-based allocation.'}
          </p>
          {searchQuery ? (
            <Button variant="secondary" size="sm" onClick={() => setSearchQuery('')}>
              Clear Search
            </Button>
          ) : (
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" size="sm" onClick={onAddGroup}>
                Add Group
              </Button>
              <Button variant="emerald" size="sm" onClick={() => onAddEnvelope()}>
                Add Envelope
              </Button>
            </div>
          )}
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredGroups.map((group) => {
            const isCollapsed = collapsedGroupIds.has(group.id);

            // Group Subtotals
            const groupAssigned = group.envelopes.reduce(
              (sum, env) => sum + (parseFloat(String(env.assigned_amount)) || 0),
              0
            );
            const groupSpent = group.envelopes.reduce(
              (sum, env) => sum + (parseFloat(String(env.spent_amount)) || 0),
              0
            );
            const groupAvailable = groupAssigned - groupSpent;
            const groupOverspent = group.envelopes.filter(
              (env) => (parseFloat(String(env.assigned_amount)) || 0) - (parseFloat(String(env.spent_amount)) || 0) < 0
            );

            return (
              <div
                key={group.id}
                className="rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md overflow-hidden shadow-lg shadow-black/20"
              >
                {/* Group Subtotal Header (Accordion Bar) */}
                <div
                  onClick={() => toggleGroupCollapse(group.id)}
                  className="px-5 py-3.5 bg-slate-900/90 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-850 transition-colors select-none"
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      aria-label="Toggle group collapse"
                      className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800"
                    >
                      {isCollapsed ? (
                        <ChevronRight className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-100">{group.name}</h4>
                        <span className="text-[11px] text-slate-400 font-mono">
                          ({group.envelopes.length} {group.envelopes.length === 1 ? 'envelope' : 'envelopes'})
                        </span>
                        {groupOverspent.length > 0 && (
                          <Badge variant="danger" size="sm" dot>
                            {groupOverspent.length} Overspent
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Group Subtotals Summary */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs"
                  >
                    <div className="flex flex-col sm:items-end">
                      <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                        Assigned
                      </span>
                      <span className="font-mono font-semibold text-emerald-400">
                        PKR {formatPKR(groupAssigned)}
                      </span>
                    </div>

                    <div className="flex flex-col sm:items-end">
                      <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                        Spent
                      </span>
                      <span className="font-mono font-semibold text-slate-200">
                        PKR {formatPKR(groupSpent)}
                      </span>
                    </div>

                    <div className="flex flex-col sm:items-end min-w-[90px]">
                      <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                        Available
                      </span>
                      <span
                        className={`font-mono font-bold ${
                          groupAvailable < 0 ? 'text-rose-400' : 'text-emerald-300'
                        }`}
                      >
                        PKR {formatPKR(groupAvailable)}
                      </span>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onAddEnvelope(group.id)}
                      className="text-xs text-slate-300 hover:text-emerald-400 hover:bg-emerald-950/30"
                      leftIcon={<Plus className="w-3.5 h-3.5" />}
                    >
                      Add
                    </Button>
                    {onEditGroup && (
                      <button
                        type="button"
                        onClick={() => onEditGroup(group)}
                        aria-label={`Edit group ${group.name}`}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Envelope Rows */}
                {!isCollapsed && (
                  <div className="divide-y divide-slate-800/50">
                    {group.envelopes.length === 0 ? (
                      <div className="px-6 py-6 text-center text-xs text-slate-400 bg-slate-950/20">
                        <span>No envelopes in this group yet. </span>
                        <button
                          type="button"
                          onClick={() => onAddEnvelope(group.id)}
                          className="text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-2 ml-1 cursor-pointer"
                        >
                          Add first envelope
                        </button>
                      </div>
                    ) : (
                      group.envelopes.map((env) => {
                        const assigned = parseFloat(String(env.assigned_amount)) || 0;
                        const spent = parseFloat(String(env.spent_amount)) || 0;
                        const target = env.target_amount ? parseFloat(String(env.target_amount)) || 0 : 0;
                        const available = assigned - spent;
                        const isOverspent = available < 0;
                        const spentPercentage = assigned > 0 ? (spent / assigned) * 100 : spent > 0 ? 100 : 0;

                        return (
                          <div
                            key={env.id}
                            className={`px-5 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-colors ${
                              isOverspent
                                ? 'bg-rose-950/15 hover:bg-rose-950/25'
                                : 'bg-slate-950/30 hover:bg-slate-900/50'
                            }`}
                          >
                            {/* Envelope Name & Target Info */}
                            <div className="flex-1 min-w-[200px]">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-slate-100">
                                  {env.name}
                                </span>
                                {isOverspent && (
                                  <Badge variant="danger" size="sm">
                                    Overspent by PKR {formatPKR(Math.abs(available))}
                                  </Badge>
                                )}
                              </div>

                              {target > 0 && (
                                <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1 font-mono">
                                  <Target className="w-3 h-3 text-emerald-400" />
                                  <span>Target Monthly: PKR {formatPKR(target)}</span>
                                  {assigned >= target ? (
                                    <span className="text-emerald-400 font-semibold text-[11px]">(Funded ✓)</span>
                                  ) : (
                                    <span className="text-amber-400 text-[11px]">
                                      (Needs PKR {formatPKR(target - assigned)})
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Progress bar */}
                              <div className="mt-2.5 max-w-md">
                                <ProgressBar
                                  value={spent}
                                  max={assigned || 1}
                                  color={isOverspent ? 'rose' : spentPercentage >= 85 ? 'amber' : 'emerald'}
                                  size="sm"
                                  showPercentage
                                  subLabel={`PKR ${formatPKR(spent)} of PKR ${formatPKR(assigned)}`}
                                />
                              </div>
                            </div>

                            {/* Financial Metric Columns */}
                            <div className="grid grid-cols-3 gap-4 sm:gap-6 text-xs min-w-[320px]">
                              {/* Assigned Column with Edit/Assign trigger */}
                              <div className="flex flex-col">
                                <span className="text-[11px] text-slate-400 font-medium">
                                  Assigned
                                </span>
                                <button
                                  type="button"
                                  onClick={() => onAssignEnvelope(env)}
                                  className="group flex items-center gap-1 font-mono text-sm font-bold text-emerald-400 hover:text-emerald-300 cursor-pointer text-left transition-colors mt-0.5"
                                  title="Click to edit budget assignment"
                                >
                                  <span>PKR {formatPKR(assigned)}</span>
                                  <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-400" />
                                </button>
                              </div>

                              {/* Spent Column */}
                              <div className="flex flex-col">
                                <span className="text-[11px] text-slate-400 font-medium">Spent</span>
                                <span className="font-mono text-sm font-semibold text-slate-200 mt-0.5">
                                  PKR {formatPKR(spent)}
                                </span>
                              </div>

                              {/* Available Balance */}
                              <div className="flex flex-col">
                                <span className="text-[11px] text-slate-400 font-medium">
                                  Available
                                </span>
                                <span
                                  className={`font-mono text-sm font-bold mt-0.5 ${
                                    isOverspent ? 'text-rose-400' : 'text-emerald-300'
                                  }`}
                                >
                                  PKR {formatPKR(available)}
                                </span>
                              </div>
                            </div>

                            {/* Row Action Buttons */}
                            <div className="flex items-center gap-2 shrink-0">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => onAssignEnvelope(env)}
                                leftIcon={<DollarSign className="w-3.5 h-3.5 text-emerald-400" />}
                                className="text-xs"
                              >
                                Assign
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (isOverspent) {
                                    // Pre-populate target with this overspent envelope
                                    onRebalanceEnvelope(undefined, env);
                                  } else {
                                    // Pre-populate source with this solvent envelope
                                    onRebalanceEnvelope(env, undefined);
                                  }
                                }}
                                leftIcon={<ArrowRightLeft className="w-3.5 h-3.5 text-slate-300" />}
                                className={`text-xs ${
                                  isOverspent
                                    ? 'border-rose-700/80 hover:border-rose-500 text-rose-300 hover:bg-rose-950/40'
                                    : ''
                                }`}
                              >
                                {isOverspent ? 'Cover' : 'Transfer'}
                              </Button>

                              {onEditEnvelope && (
                                <button
                                  type="button"
                                  onClick={() => onEditEnvelope(env)}
                                  aria-label={`Edit ${env.name}`}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Global Table Grand Subtotal Footer */}
      {filteredGroups.length > 0 && (
        <Card variant="glass" className="p-4 sm:p-5 bg-slate-900/90 border-slate-700/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-bold text-slate-100">
                All Groups Budget Aggregate
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-xs font-mono">
              <div className="flex flex-col sm:items-end">
                <span className="text-[10px] text-slate-400 uppercase font-sans">Total Assigned</span>
                <span className="text-sm font-bold text-emerald-400">
                  PKR {formatPKR(grandTotals.assigned)}
                </span>
              </div>

              <div className="flex flex-col sm:items-end">
                <span className="text-[10px] text-slate-400 uppercase font-sans">Total Spent</span>
                <span className="text-sm font-bold text-slate-200">
                  PKR {formatPKR(grandTotals.spent)}
                </span>
              </div>

              <div className="flex flex-col sm:items-end">
                <span className="text-[10px] text-slate-400 uppercase font-sans">Total Available</span>
                <span
                  className={`text-sm font-bold ${
                    grandTotals.available < 0 ? 'text-rose-400' : 'text-emerald-300'
                  }`}
                >
                  PKR {formatPKR(grandTotals.available)}
                </span>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
