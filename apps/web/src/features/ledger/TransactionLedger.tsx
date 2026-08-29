import React, { useState, useMemo } from 'react';
import {
  ReceiptText,
  Plus,
  ChevronDown,
  ChevronUp,
  Building2,
  Wallet,
  MessageSquare,
  Globe,
  Smartphone,
  CheckCircle2,
  Tag,
  Clock,
  Pencil,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { LedgerFilterBar } from './LedgerFilterBar';
import { ReceiptDetail } from './ReceiptDetail';
import { LogTransactionModal } from './LogTransactionModal';
import type {
  TransactionResponse,
  AccountResponse,
  EnvelopeGroupResponse,
  TransactionCreate,
  CPITrendItem,
} from '../../types/api';

export interface TransactionLedgerProps {
  transactions: TransactionResponse[];
  accounts: AccountResponse[];
  envelopeGroups: EnvelopeGroupResponse[];
  cpiTrends?: CPITrendItem[];
  onLogTransaction: (payload: Omit<TransactionCreate, 'household_id'>) => Promise<TransactionResponse | void>;
  onEditTransaction?: (transaction: TransactionResponse) => void;
  isLoading?: boolean;
}

type SortOption = 'DATE_DESC' | 'DATE_ASC' | 'AMOUNT_DESC' | 'AMOUNT_ASC';

export const TransactionLedger: React.FC<TransactionLedgerProps> = ({
  transactions,
  accounts,
  envelopeGroups,
  cpiTrends = [],
  onLogTransaction,
  onEditTransaction,
  isLoading = false,
}) => {
  // Modal State
  const [isLogModalOpen, setIsLogModalOpen] = useState<boolean>(false);

  // Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedAccount, setSelectedAccount] = useState<string>('ALL');
  const [selectedEnvelope, setSelectedEnvelope] = useState<string>('ALL');
  const [selectedSource, setSelectedSource] = useState<string>('ALL');
  const [selectedDateRange, setSelectedDateRange] = useState<string>('ALL');

  // Expanded Row IDs
  const [expandedTxIds, setExpandedTxIds] = useState<Set<string>>(new Set());

  // Sorting
  const [sortBy, setSortBy] = useState<SortOption>('DATE_DESC');

  // Currency Formatter
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

  // Toggle single row expansion
  const toggleRowExpansion = (txId: string) => {
    setExpandedTxIds((prev) => {
      const next = new Set(prev);
      if (next.has(txId)) {
        next.delete(txId);
      } else {
        next.add(txId);
      }
      return next;
    });
  };

  // Expand All / Collapse All
  const expandAll = (ids: string[]) => {
    setExpandedTxIds(new Set(ids));
  };
  const collapseAll = () => {
    setExpandedTxIds(new Set());
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedAccount('ALL');
    setSelectedEnvelope('ALL');
    setSelectedSource('ALL');
    setSelectedDateRange('ALL');
  };

  const hasActiveFilters =
    searchQuery !== '' ||
    selectedAccount !== 'ALL' ||
    selectedEnvelope !== 'ALL' ||
    selectedSource !== 'ALL' ||
    selectedDateRange !== 'ALL';

  // Fast Account & Envelope Lookup Maps
  const accountsMap = useMemo(() => {
    const map = new Map<string, AccountResponse>();
    for (const a of accounts) {
      map.set(a.id, a);
    }
    return map;
  }, [accounts]);

  const envelopeMap = useMemo(() => {
    const map = new Map<string, { envelopeName: string; groupName: string }>();
    for (const group of envelopeGroups) {
      for (const env of group.envelopes) {
        map.set(env.id, { envelopeName: env.name, groupName: group.name });
      }
    }
    return map;
  }, [envelopeGroups]);

  const canonicalMap = useMemo(() => {
    const map = new Map<string, CPITrendItem>();
    for (const cpi of cpiTrends) {
      map.set(cpi.canonical_item_id, cpi);
    }
    return map;
  }, [cpiTrends]);

  // Filtered & Sorted Transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // 1. Account Filter
      if (selectedAccount !== 'ALL' && tx.account_id !== selectedAccount) {
        return false;
      }

      // 2. Envelope Filter
      if (selectedEnvelope !== 'ALL' && tx.envelope_id !== selectedEnvelope) {
        return false;
      }

      // 3. Source Channel Filter
      if (selectedSource !== 'ALL' && tx.source !== selectedSource) {
        return false;
      }

      // 4. Date Range Filter (relative to today)
      if (selectedDateRange !== 'ALL') {
        const txDate = new Date(tx.transacted_at);
        const now = new Date();

        if (selectedDateRange === 'THIS_MONTH') {
          if (txDate.getFullYear() !== now.getFullYear() || txDate.getMonth() !== now.getMonth()) {
            return false;
          }
        } else if (selectedDateRange === 'LAST_MONTH') {
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          if (
            txDate.getFullYear() !== lastMonth.getFullYear() ||
            txDate.getMonth() !== lastMonth.getMonth()
          ) {
            return false;
          }
        } else if (selectedDateRange === 'LAST_90_DAYS') {
          const ninetyDaysAgo = now.getTime() - 90 * 24 * 60 * 60 * 1000;
          if (txDate.getTime() < ninetyDaysAgo) return false;
        }
      }

      // 5. Search Query across Merchant, Raw items, Canonical items, Notes, Raw Input
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesMerchant = (tx.merchant || '').toLowerCase().includes(q);
        const matchesRawInput = (tx.raw_input || '').toLowerCase().includes(q);
        const envInfo = envelopeMap.get(tx.envelope_id);
        const matchesEnvelope =
          envInfo?.envelopeName.toLowerCase().includes(q) ||
          envInfo?.groupName.toLowerCase().includes(q);
        const accInfo = accountsMap.get(tx.account_id);
        const matchesAccount = accInfo?.name.toLowerCase().includes(q);

        const matchesLineItems = tx.line_items.some((li) => {
          const rawMatch = li.raw_item_name.toLowerCase().includes(q);
          const notesMatch = (li.notes || '').toLowerCase().includes(q);
          const canonical = li.canonical_item_id ? canonicalMap.get(li.canonical_item_id) : null;
          const canonicalMatch = canonical ? canonical.name.toLowerCase().includes(q) : false;
          return rawMatch || notesMatch || canonicalMatch;
        });

        if (!matchesMerchant && !matchesRawInput && !matchesEnvelope && !matchesAccount && !matchesLineItems) {
          return false;
        }
      }

      return true;
    });
  }, [
    transactions,
    selectedAccount,
    selectedEnvelope,
    selectedSource,
    selectedDateRange,
    searchQuery,
    envelopeMap,
    accountsMap,
    canonicalMap,
  ]);

  // Sorted Transactions
  const sortedTransactions = useMemo(() => {
    const sorted = [...filteredTransactions];
    sorted.sort((a, b) => {
      const dateA = new Date(a.transacted_at).getTime();
      const dateB = new Date(b.transacted_at).getTime();
      const amountA = parseFloat(String(a.total_amount)) || 0;
      const amountB = parseFloat(String(b.total_amount)) || 0;

      switch (sortBy) {
        case 'DATE_DESC':
          return dateB - dateA;
        case 'DATE_ASC':
          return dateA - dateB;
        case 'AMOUNT_DESC':
          return amountB - amountA;
        case 'AMOUNT_ASC':
          return amountA - amountB;
        default:
          return dateB - dateA;
      }
    });
    return sorted;
  }, [filteredTransactions, sortBy]);

  // Aggregate Metrics for Filtered Spend & Summary Bar
  const summaryMetrics = useMemo(() => {
    const count = sortedTransactions.length;
    let totalSpend = 0;
    let totalLineItems = 0;

    for (const tx of sortedTransactions) {
      totalSpend += parseFloat(String(tx.total_amount)) || 0;
      totalLineItems += tx.line_items.length;
    }

    const avgReceiptSize = count > 0 ? totalSpend / count : 0;

    return {
      count,
      totalSpend,
      avgReceiptSize,
      totalLineItems,
    };
  }, [sortedTransactions]);

  // Format relative & absolute date
  const formatTxDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const absolute = date.toLocaleDateString('en-PK', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const time = date.toLocaleTimeString('en-PK', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return { absolute, time };
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* Top Header Card */}
      <Card variant="glass" className="p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-950/80 text-emerald-400 border border-emerald-800/80">
                <ReceiptText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  Granular Line-Item Transaction Explorer (R2)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Itemized receipt breakdowns, unit economics, canonical staple tags, and multi-channel ingestion.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="emerald"
              size="sm"
              onClick={() => setIsLogModalOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Log New Transaction
            </Button>
          </div>
        </div>

        {/* 3-Part Granular Metric Summary Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-5 pt-4 border-t border-slate-800/70">
          {/* Metric 1: Total Transactions Count */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col justify-between">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">
              Transactions Logged
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-bold font-mono text-slate-100">
                {summaryMetrics.count}
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                of {transactions.length} total
              </span>
            </div>
          </div>

          {/* Metric 2: Total Filtered Spend */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col justify-between">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">
              Total Filtered Spend
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-bold font-mono text-emerald-400">
                PKR {formatPKR(summaryMetrics.totalSpend)}
              </span>
            </div>
          </div>

          {/* Metric 3: Average Receipt Size */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col justify-between">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">
              Avg Receipt Size
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-bold font-mono text-cyan-400">
                PKR {formatPKR(summaryMetrics.avgReceiptSize)}
              </span>
              <span className="text-[11px] text-slate-500">/ txn</span>
            </div>
          </div>

          {/* Metric 4: Granular Line Items Tracked */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col justify-between">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">
              Line Items Tracked
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-bold font-mono text-indigo-300">
                {summaryMetrics.totalLineItems}
              </span>
              <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
                <CheckCircle2 className="w-3 h-3" /> Sub-item level
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Interactive Filter Bar */}
      <LedgerFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedAccount={selectedAccount}
        onAccountChange={setSelectedAccount}
        selectedEnvelope={selectedEnvelope}
        onEnvelopeChange={setSelectedEnvelope}
        selectedSource={selectedSource}
        onSourceChange={setSelectedSource}
        selectedDateRange={selectedDateRange}
        onDateRangeChange={setSelectedDateRange}
        onClearFilters={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
        accounts={accounts}
        envelopeGroups={envelopeGroups}
        totalCount={transactions.length}
        filteredCount={sortedTransactions.length}
      />

      {/* Sorting & Expand/Collapse Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 px-1">
        <div className="flex items-center gap-3">
          <span className="font-medium text-slate-300">
            Sort by:
          </span>
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-0.5">
            <button
              onClick={() => setSortBy('DATE_DESC')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                sortBy === 'DATE_DESC'
                  ? 'bg-slate-800 text-emerald-400 font-semibold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Newest First
            </button>
            <button
              onClick={() => setSortBy('DATE_ASC')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                sortBy === 'DATE_ASC'
                  ? 'bg-slate-800 text-emerald-400 font-semibold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Oldest First
            </button>
            <button
              onClick={() => setSortBy('AMOUNT_DESC')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                sortBy === 'AMOUNT_DESC'
                  ? 'bg-slate-800 text-emerald-400 font-semibold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Amount (High → Low)
            </button>
            <button
              onClick={() => setSortBy('AMOUNT_ASC')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                sortBy === 'AMOUNT_ASC'
                  ? 'bg-slate-800 text-emerald-400 font-semibold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Amount (Low → High)
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => expandAll(sortedTransactions.map((t) => t.id))}
            className="text-slate-400 hover:text-slate-200 text-xs px-2.5 py-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Expand All Details
          </button>
          <span className="text-slate-600">&bull;</span>
          <button
            onClick={collapseAll}
            className="text-slate-400 hover:text-slate-200 text-xs px-2.5 py-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Main Transactions Master List */}
      {sortedTransactions.length === 0 && !isLoading ? (
        <Card className="text-center py-16">
          <ReceiptText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h4 className="text-sm font-semibold text-slate-300">
            {hasActiveFilters ? 'No transactions match your search filters' : 'No transactions recorded yet'}
          </h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
            {hasActiveFilters
              ? 'Try adjusting your search query, clearing filters, or changing the selected date range.'
              : 'Log your first transaction with itemized line items to start tracking your personal CPI and envelope spend.'}
          </p>
          {hasActiveFilters ? (
            <Button variant="secondary" size="sm" onClick={handleClearFilters}>
              Reset All Filters
            </Button>
          ) : (
            <Button variant="emerald" size="sm" onClick={() => setIsLogModalOpen(true)}>
              Log First Transaction
            </Button>
          )}
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {sortedTransactions.map((tx) => {
            const isExpanded = expandedTxIds.has(tx.id);
            const { absolute, time } = formatTxDate(tx.transacted_at);
            const account = accountsMap.get(tx.account_id);
            const envInfo = envelopeMap.get(tx.envelope_id);

            return (
              <div
                key={tx.id}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden shadow-md shadow-black/20 ${
                  isExpanded
                    ? 'border-emerald-500/50 bg-slate-900/90 ring-1 ring-emerald-500/20'
                    : 'border-slate-800/80 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-850/60'
                }`}
              >
                {/* Transaction Master Row Header */}
                <div
                  onClick={() => toggleRowExpansion(tx.id)}
                  className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none"
                >
                  {/* Left: Expand Toggle, Merchant, Date, & Line-Item Snippets */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    {/* Expand/Collapse Button Icon */}
                    <button
                      type="button"
                      aria-label="Toggle receipt details"
                      className={`p-1.5 rounded-lg border transition-colors shrink-0 mt-0.5 ${
                        isExpanded
                          ? 'bg-emerald-950/90 text-emerald-400 border-emerald-800'
                          : 'bg-slate-800/80 text-slate-400 border-slate-700/80 group-hover:text-slate-200'
                      }`}
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      {/* Merchant Title & Source Channel */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-slate-100 tracking-tight truncate">
                          {tx.merchant || 'General Merchant'}
                        </span>

                        <Badge
                          variant={
                            tx.source === 'WHATSAPP'
                              ? 'whatsapp'
                              : tx.source === 'MOBILE'
                              ? 'mobile'
                              : 'web'
                          }
                          size="sm"
                        >
                          {tx.source === 'WHATSAPP' && <MessageSquare className="w-3 h-3 mr-0.5" />}
                          {tx.source === 'MOBILE' && <Smartphone className="w-3 h-3 mr-0.5" />}
                          {tx.source === 'WEB' && <Globe className="w-3 h-3 mr-0.5" />}
                          {tx.source}
                        </Badge>

                        {/* Line Items Count Badge */}
                        <span className="px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 text-[11px] font-mono border border-slate-700/60">
                          {tx.line_items.length} {tx.line_items.length === 1 ? 'item' : 'items'}
                        </span>
                      </div>

                      {/* Date & Account / Category Sub-Ribbon */}
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-400">
                        <span className="font-mono text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {absolute} &bull; {time}
                        </span>

                        <span className="text-slate-600 hidden sm:inline">&bull;</span>

                        {/* Account Tag */}
                        <span className="flex items-center gap-1 text-slate-300">
                          {account?.type === 'BANK' ? (
                            <Building2 className="w-3 h-3 text-blue-400" />
                          ) : (
                            <Wallet className="w-3 h-3 text-emerald-400" />
                          )}
                          <span className="font-medium">{account?.name || 'Account'}</span>
                        </span>

                        <span className="text-slate-600 hidden sm:inline">&bull;</span>

                        {/* Envelope Tag */}
                        <span className="flex items-center gap-1 text-slate-300">
                          <Tag className="w-3 h-3 text-indigo-400" />
                          <span className="font-medium">
                            {envInfo?.envelopeName || 'Budget'}
                          </span>
                        </span>
                      </div>

                      {/* Quick Line-Item Pill Preview if collapsed */}
                      {!isExpanded && tx.line_items.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                          {tx.line_items.slice(0, 4).map((li) => (
                            <span
                              key={li.id}
                              className="px-2 py-0.5 rounded-md bg-slate-950/60 text-slate-300 text-[11px] border border-slate-800/80 font-sans"
                            >
                              {li.raw_item_name}{' '}
                              <span className="text-slate-500 font-mono">
                                (PKR {formatPKR(li.total_price)})
                              </span>
                            </span>
                          ))}
                          {tx.line_items.length > 4 && (
                            <span className="px-1.5 py-0.5 rounded text-slate-500 text-[11px] font-mono">
                              +{tx.line_items.length - 4} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Total Amount in PKR */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right sm:pl-4 border-t md:border-t-0 md:border-l border-slate-800/60 pt-2 md:pt-0">
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium block">
                        Amount Paid
                      </span>
                      <div className="text-base sm:text-lg font-bold font-mono text-emerald-400">
                        PKR {formatPKR(tx.total_amount)}
                      </div>
                    </div>
                    {onEditTransaction && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditTransaction(tx);
                        }}
                        aria-label="Edit transaction"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Expandable Multi-Level Receipt Breakdown Drawer */}
                {isExpanded && (
                  <ReceiptDetail
                    transaction={tx}
                    accounts={accounts}
                    envelopeGroups={envelopeGroups}
                    cpiTrends={cpiTrends}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Log Transaction Modal */}
      <LogTransactionModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        accounts={accounts}
        envelopeGroups={envelopeGroups}
        cpiTrends={cpiTrends}
        onSubmit={onLogTransaction}
      />
    </div>
  );
};
