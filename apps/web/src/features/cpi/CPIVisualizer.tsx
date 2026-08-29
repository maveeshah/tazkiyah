import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  Activity,
  Flame,
  ShieldCheck,
  LineChart,
} from 'lucide-react';
import type { CPITrendItem } from '../../types/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { CPIChart } from '../../components/charts/CPIChart';
import { StapleBasketGrid } from './StapleBasketGrid';
import { MerchantPriceComparisonTable } from './MerchantPriceComparisonTable';

export interface CPIVisualizerProps {
  cpiTrends: CPITrendItem[];
  isLoading?: boolean;
  className?: string;
}

export const CPIVisualizer: React.FC<CPIVisualizerProps> = ({
  cpiTrends,
  className = '',
}) => {
  // Active chart series (default to all or top 6)
  const [activeSeriesIds, setActiveSeriesIds] = useState<string[]>(() =>
    cpiTrends.slice(0, 6).map((item) => item.canonical_item_id)
  );

  // Single focused staple for highlighting
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);

  // Update activeSeriesIds if cpiTrends changes and activeSeriesIds is empty
  React.useEffect(() => {
    if (activeSeriesIds.length === 0 && cpiTrends.length > 0) {
      setActiveSeriesIds(cpiTrends.slice(0, 6).map((item) => item.canonical_item_id));
    }
  }, [cpiTrends, activeSeriesIds.length]);

  const handleToggleSeries = (id: string) => {
    setActiveSeriesIds((prev) =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter((x) => x !== id) : prev) : [...prev, id]
    );
  };

  const handleFocusStaple = (id: string) => {
    setFocusedItemId(id);
    if (!activeSeriesIds.includes(id)) {
      setActiveSeriesIds((prev) => [...prev, id]);
    }
  };

  // Observed date span across all price history, formatted "Mon YYYY – Mon YYYY".
  const timeSpanLabel = useMemo(() => {
    const times = cpiTrends
      .flatMap((t) => t.history.map((h) => new Date(h.recorded_at).getTime()))
      .filter((n) => !Number.isNaN(n));
    if (times.length === 0) return 'No price history yet';
    const fmt = (ms: number) =>
      new Date(ms).toLocaleDateString('en-PK', { month: 'short', year: 'numeric' });
    const lo = fmt(Math.min(...times));
    const hi = fmt(Math.max(...times));
    return lo === hi ? lo : `${lo} – ${hi}`;
  }, [cpiTrends]);

  // Compute aggregate Personal CPI statistics
  const cpiStats = useMemo(() => {
    if (cpiTrends.length === 0) {
      return {
        avgInflationRate: 0,
        highestInflationItem: null as CPITrendItem | null,
        lowestInflationItem: null as CPITrendItem | null,
        totalPricePoints: 0,
        inflatingCount: 0,
        deflatingCount: 0,
      };
    }

    let sumInflation = 0;
    let validInflationCount = 0;
    let highest: CPITrendItem | null = null;
    let lowest: CPITrendItem | null = null;
    let totalPoints = 0;
    let inflating = 0;
    let deflating = 0;

    cpiTrends.forEach((item) => {
      totalPoints += item.history.length;
      if (item.inflation_rate_percentage !== null && item.inflation_rate_percentage !== undefined) {
        sumInflation += item.inflation_rate_percentage;
        validInflationCount++;

        if (item.inflation_rate_percentage > 0) inflating++;
        if (item.inflation_rate_percentage < 0) deflating++;

        if (!highest || item.inflation_rate_percentage > (highest.inflation_rate_percentage ?? -Infinity)) {
          highest = item;
        }
        if (!lowest || item.inflation_rate_percentage < (lowest.inflation_rate_percentage ?? Infinity)) {
          lowest = item;
        }
      }
    });

    const avg = validInflationCount > 0 ? sumInflation / validInflationCount : 0;

    return {
      avgInflationRate: avg,
      highestInflationItem: highest,
      lowestInflationItem: lowest,
      totalPricePoints: totalPoints,
      inflatingCount: inflating,
      deflatingCount: deflating,
    };
  }, [cpiTrends]);

  return (
    <div className={`flex flex-col gap-6 animate-in fade-in duration-200 ${className}`}>
      {/* 1. Hero Personal Inflation Rate Overview Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-br from-slate-900 via-slate-950 to-amber-950/30 p-6 md:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold border bg-amber-950/70 text-amber-300 border-amber-700/80 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-amber-400" />
                Personal CPI & Inflation Engine (R3)
              </span>
              <span className="text-xs text-slate-300 font-medium flex items-center gap-1 bg-slate-800/80 px-2.5 py-0.5 rounded-full border border-slate-700">
                {timeSpanLabel}
              </span>
            </div>

            <div className="flex flex-col mt-1">
              <span className="text-xs text-slate-400 font-medium tracking-wide uppercase">
                Household Basket Average MoM Inflation
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-lg font-bold font-mono text-amber-400">
                  {cpiStats.avgInflationRate > 0 ? '+' : ''}
                </span>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight font-mono text-amber-300">
                  {cpiStats.avgInflationRate.toFixed(2)}%
                </h1>
                <span className="text-sm font-medium text-slate-400 ml-1">MoM Average</span>
              </div>
            </div>

            <p className="text-xs md:text-sm text-slate-300 max-w-2xl mt-1">
              Real price index calculated from your itemized receipts across Pakistani supermarkets, fuel stations, and local markets. Tracks true cost-of-living increases vs official headline CPI.
            </p>
          </div>

          {/* Quick Stat Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full lg:w-auto">
            {/* Stat 1: Highest Inflation */}
            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span className="flex items-center gap-1 text-rose-400">
                  <Flame className="w-3.5 h-3.5" /> Highest Spike
                </span>
              </div>
              <span className="text-sm font-bold text-slate-100 truncate">
                {cpiStats.highestInflationItem?.name || 'N/A'}
              </span>
              <span className="text-xs font-mono text-rose-400 font-semibold mt-1">
                +{cpiStats.highestInflationItem?.inflation_rate_percentage?.toFixed(1)}% MoM
              </span>
            </div>

            {/* Stat 2: Most Stable */}
            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span className="flex items-center gap-1 text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" /> Most Stable
                </span>
              </div>
              <span className="text-sm font-bold text-slate-100 truncate">
                {cpiStats.lowestInflationItem?.name || 'N/A'}
              </span>
              <span className="text-xs font-mono text-emerald-400 font-semibold mt-1">
                +{cpiStats.lowestInflationItem?.inflation_rate_percentage?.toFixed(1)}% MoM
              </span>
            </div>

            {/* Stat 3: Basket Coverage */}
            <div className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span className="flex items-center gap-1 text-blue-400">
                  <ShoppingBag className="w-3.5 h-3.5" /> Price Points
                </span>
              </div>
              <span className="text-sm font-bold text-slate-100">
                {cpiStats.totalPricePoints} Logs
              </span>
              <span className="text-xs font-mono text-slate-400 mt-1">
                Across {cpiTrends.length} Staples
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Staple Basket Cards Grid (All 10 Canonical Items) */}
      <StapleBasketGrid
        trends={cpiTrends}
        selectedItemId={focusedItemId}
        activeItemIds={activeSeriesIds}
        onSelectStaple={handleFocusStaple}
        onToggleStaple={handleToggleSeries}
      />

      {/* 3. Pure React 19 SVG Multi-Series CPI Time Series Chart */}
      <Card variant="glass">
        <CardHeader className="flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <LineChart className="w-4 h-4 text-emerald-400" />
              Historical Unit Price Evolution ({timeSpanLabel})
            </CardTitle>
            <CardDescription>
              Unit price in PKR with auto-scaling dynamic grid lines and interactive tooltip breakdown
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="primary" size="sm">
              {activeSeriesIds.length} series active
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <CPIChart
            items={cpiTrends}
            selectedIds={activeSeriesIds}
            onToggleItem={handleToggleSeries}
            height={360}
          />
        </CardContent>
      </Card>

      {/* 4. Merchant Price Comparison Table */}
      <MerchantPriceComparisonTable
        trends={cpiTrends}
        selectedItemId={focusedItemId}
        onSelectStaple={handleFocusStaple}
      />
    </div>
  );
};
