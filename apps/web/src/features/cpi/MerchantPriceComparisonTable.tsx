import React, { useState, useMemo } from 'react';
import {
  Search,
  Store,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Filter,
} from 'lucide-react';
import type { CPITrendItem } from '../../types/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';

export interface MerchantPriceComparisonTableProps {
  trends: CPITrendItem[];
  selectedItemId?: string | null;
  onSelectStaple?: (id: string) => void;
  className?: string;
}

interface FlatPricePoint {
  id: string;
  itemId: string;
  itemName: string;
  category: string;
  standardUnit: string;
  merchant: string;
  unitPrice: number;
  unit: string;
  recordedAt: string;
  averagePriceForItem: number;
  diffFromAverage: number;
  diffPercentage: number;
}

export const MerchantPriceComparisonTable: React.FC<MerchantPriceComparisonTableProps> = ({
  trends,
  selectedItemId,
  onSelectStaple,
  className = '',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterItemId, setFilterItemId] = useState<string>(selectedItemId || 'ALL');
  const [sortField, setSortField] = useState<'date' | 'price' | 'diff' | 'merchant'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Sync with selectedItemId prop when changed
  React.useEffect(() => {
    if (selectedItemId) {
      setFilterItemId(selectedItemId);
    }
  }, [selectedItemId]);

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

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-PK', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Flatten all price point history and compute averages per canonical item
  const flatData: FlatPricePoint[] = useMemo(() => {
    // 1. Compute average price per item
    const itemAverages = new Map<string, number>();
    trends.forEach((item) => {
      const validPrices = item.history
        .map((h) => (typeof h.unit_price === 'string' ? parseFloat(h.unit_price) : Number(h.unit_price)))
        .filter((p) => !isNaN(p));
      const avg = validPrices.length > 0 ? validPrices.reduce((a, b) => a + b, 0) / validPrices.length : 0;
      itemAverages.set(item.canonical_item_id, avg);
    });

    // 2. Flatten price points
    const rows: FlatPricePoint[] = [];
    trends.forEach((item) => {
      const avg = itemAverages.get(item.canonical_item_id) || 0;

      item.history.forEach((hp) => {
        const price = typeof hp.unit_price === 'string' ? parseFloat(hp.unit_price) : Number(hp.unit_price);
        if (isNaN(price)) return;

        const diff = price - avg;
        const diffPct = avg > 0 ? (diff / avg) * 100 : 0;

        rows.push({
          id: hp.id,
          itemId: item.canonical_item_id,
          itemName: item.name,
          category: item.category,
          standardUnit: item.standard_unit,
          merchant: hp.merchant || 'General Market / Bazaar',
          unitPrice: price,
          unit: hp.unit,
          recordedAt: hp.recorded_at,
          averagePriceForItem: avg,
          diffFromAverage: diff,
          diffPercentage: diffPct,
        });
      });
    });

    return rows;
  }, [trends]);

  // Filter and sort
  const filteredAndSortedData = useMemo(() => {
    return flatData
      .filter((row) => {
        // Filter by staple item
        if (filterItemId !== 'ALL' && row.itemId !== filterItemId) {
          return false;
        }

        // Search term filter (merchant or item name)
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          const matchesMerchant = row.merchant.toLowerCase().includes(term);
          const matchesItem = row.itemName.toLowerCase().includes(term);
          const matchesCategory = row.category.toLowerCase().includes(term);
          return matchesMerchant || matchesItem || matchesCategory;
        }

        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortField === 'date') {
          cmp = new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime();
        } else if (sortField === 'price') {
          cmp = a.unitPrice - b.unitPrice;
        } else if (sortField === 'diff') {
          cmp = a.diffPercentage - b.diffPercentage;
        } else if (sortField === 'merchant') {
          cmp = a.merchant.localeCompare(b.merchant);
        }

        return sortDirection === 'desc' ? -cmp : cmp;
      });
  }, [flatData, filterItemId, searchTerm, sortField, sortDirection]);

  const handleSort = (field: 'date' | 'price' | 'diff' | 'merchant') => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'date' ? 'desc' : 'asc');
    }
  };

  return (
    <Card variant="glass" className={`flex flex-col gap-4 ${className}`}>
      <CardHeader className="flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <CardTitle className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Store className="w-4 h-4 text-emerald-400" />
            Merchant Price Comparison & Historical Logs
          </CardTitle>
          <CardDescription>
            Direct vendor pricing across Imtiaz, Al-Fatah, Shell, Aghas, and local bazaars
          </CardDescription>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative flex items-center min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search vendor or staple..."
              className="w-full bg-slate-950/70 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
            />
          </div>

          {/* Staple Filter Dropdown */}
          <div className="relative flex items-center">
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
            <select
              value={filterItemId}
              onChange={(e) => {
                setFilterItemId(e.target.value);
                if (e.target.value !== 'ALL' && onSelectStaple) {
                  onSelectStaple(e.target.value);
                }
              }}
              className="bg-slate-950/70 border border-slate-800 rounded-xl pl-8 pr-7 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 cursor-pointer appearance-none"
            >
              <option value="ALL">All Staples ({trends.length})</option>
              {trends.map((item) => (
                <option key={item.canonical_item_id} value={item.canonical_item_id}>
                  {item.name} ({item.standard_unit})
                </option>
              ))}
            </select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto rounded-xl border border-slate-800/80">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 font-medium">
                <th
                  onClick={() => handleSort('date')}
                  className="px-4 py-3 cursor-pointer hover:text-slate-200 select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Date</span>
                    <ArrowUpDown className="w-3 h-3 ml-0.5 text-slate-500" />
                  </div>
                </th>
                <th className="px-4 py-3 select-none">Staple Item</th>
                <th
                  onClick={() => handleSort('merchant')}
                  className="px-4 py-3 cursor-pointer hover:text-slate-200 select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Merchant / Vendor</span>
                    <ArrowUpDown className="w-3 h-3 ml-0.5 text-slate-500" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('price')}
                  className="px-4 py-3 text-right cursor-pointer hover:text-slate-200 select-none whitespace-nowrap"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Unit Price (PKR)</span>
                    <ArrowUpDown className="w-3 h-3 ml-0.5 text-slate-500" />
                  </div>
                </th>
                <th className="px-4 py-3 select-none text-center">Unit</th>
                <th
                  onClick={() => handleSort('diff')}
                  className="px-4 py-3 text-right cursor-pointer hover:text-slate-200 select-none whitespace-nowrap"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Diff vs Avg</span>
                    <ArrowUpDown className="w-3 h-3 ml-0.5 text-slate-500" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-950/40 font-mono">
              {filteredAndSortedData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500 font-sans">
                    No price points found matching filters
                  </td>
                </tr>
              ) : (
                filteredAndSortedData.map((row) => {
                  const isAboveAvg = row.diffFromAverage > 0.01;
                  const isBelowAvg = row.diffFromAverage < -0.01;

                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-slate-900/60 transition-colors group"
                    >
                      {/* Date */}
                      <td className="px-4 py-3 text-slate-300 whitespace-nowrap font-sans text-xs">
                        {formatDate(row.recordedAt)}
                      </td>

                      {/* Staple Item */}
                      <td className="px-4 py-3 font-sans">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-100 group-hover:text-emerald-400 transition-colors">
                            {row.itemName}
                          </span>
                          <span className="text-[10px] text-slate-500 bg-slate-800/80 px-1.5 py-0.5 rounded">
                            {row.category}
                          </span>
                        </div>
                      </td>

                      {/* Merchant */}
                      <td className="px-4 py-3 font-sans text-slate-200 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Store className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[180px]">{row.merchant}</span>
                        </div>
                      </td>

                      {/* Unit Price */}
                      <td className="px-4 py-3 text-right font-bold text-slate-100 whitespace-nowrap">
                        PKR {formatPKR(row.unitPrice)}
                      </td>

                      {/* Unit */}
                      <td className="px-4 py-3 text-center text-slate-400 text-xs">
                        {row.unit}
                      </td>

                      {/* Diff vs Average */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {isAboveAvg ? (
                          <span className="inline-flex items-center gap-1 text-rose-400 text-xs font-semibold">
                            <TrendingUp className="w-3 h-3 text-rose-400" />
                            +{formatPKR(row.diffFromAverage)} (+{row.diffPercentage.toFixed(1)}%)
                          </span>
                        ) : isBelowAvg ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-semibold">
                            <TrendingDown className="w-3 h-3 text-emerald-400" />
                            {formatPKR(row.diffFromAverage)} ({row.diffPercentage.toFixed(1)}%)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-400 text-xs">
                            <Minus className="w-3 h-3 text-slate-500" />
                            Average
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table summary footnote */}
        <div className="p-3 text-[11px] text-slate-400 flex items-center justify-between font-mono">
          <span>Showing {filteredAndSortedData.length} recorded price points</span>
          <span>Baseline average computed per canonical basket item</span>
        </div>
      </CardContent>
    </Card>
  );
};
