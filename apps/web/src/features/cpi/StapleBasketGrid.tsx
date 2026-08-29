import React from 'react';
import { TrendingUp, TrendingDown, Minus, Eye, Check } from 'lucide-react';
import type { CPITrendItem } from '../../types/api';
import { Badge, type BadgeVariant } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';

export interface StapleBasketGridProps {
  trends: CPITrendItem[];
  selectedItemId?: string | null;
  activeItemIds?: string[];
  onSelectStaple?: (id: string) => void;
  onToggleStaple?: (id: string) => void;
  className?: string;
}

export const StapleBasketGrid: React.FC<StapleBasketGridProps> = ({
  trends,
  selectedItemId,
  activeItemIds = [],
  onSelectStaple,
  onToggleStaple,
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

  const getCategoryVariant = (category: string): BadgeVariant => {
    switch (category.toLowerCase()) {
      case 'fresh produce':
        return 'success';
      case 'dairy':
      case 'poultry & dairy':
        return 'info';
      case 'fuel':
        return 'danger';
      case 'grains & staples':
        return 'warning';
      case 'cooking essentials':
        return 'primary';
      default:
        return 'neutral';
    }
  };

  // Mini sparkline SVG generator for trend visualization
  const renderSparkline = (item: CPITrendItem, isPositiveInflation: boolean) => {
    const history = [...item.history].sort(
      (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
    );

    if (history.length < 2) return null;

    const prices = history
      .map((h) => (typeof h.unit_price === 'string' ? parseFloat(h.unit_price) : Number(h.unit_price)))
      .filter((p) => !isNaN(p));

    if (prices.length < 2) return null;

    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;

    const width = 80;
    const height = 28;
    const padding = 3;

    const points = prices.map((p, idx) => {
      const x = padding + (idx / (prices.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((p - min) / range) * (height - 2 * padding);
      return `${x},${y}`;
    });

    const strokeColor = isPositiveInflation ? '#f43f5e' : '#10b981'; // Rose if increasing price (inflation), Emerald if dropping (deflation)
    const linePath = `M ${points.join(' L ')}`;
    const areaPath = `${linePath} L ${width - padding},${height} L ${padding},${height} Z`;

    const gradientId = `spark-grad-${item.canonical_item_id}`;

    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible shrink-0"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={strokeColor} stopOpacity={0.3} />
            <stop offset="100%" stopColor={strokeColor} stopOpacity={0.0} />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path
          d={linePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* End dot marker */}
        {points.length > 0 && (
          <circle
            cx={Number(points[points.length - 1].split(',')[0])}
            cy={Number(points[points.length - 1].split(',')[1])}
            r={2.5}
            fill={strokeColor}
          />
        )}
      </svg>
    );
  };

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            Tracked Staple Basket
            <span className="text-xs font-mono font-normal text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
              {trends.length} items
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Pakistani household canonical staples with month-over-month (MoM) price tracking
          </p>
        </div>
      </div>

      {/* Grid of 10 Canonical Staple Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
        {trends.map((item) => {
          const isFocused = selectedItemId === item.canonical_item_id;
          const isInActiveSeries = activeItemIds.includes(item.canonical_item_id);
          const inflationRate = item.inflation_rate_percentage;
          const isPositiveInflation = inflationRate !== null && inflationRate !== undefined && inflationRate > 0;
          const isNegativeInflation = inflationRate !== null && inflationRate !== undefined && inflationRate < 0;

          return (
            <Card
              key={item.canonical_item_id}
              variant="glass"
              hoverEffect
              onClick={() => onSelectStaple?.(item.canonical_item_id)}
              className={`p-4 flex flex-col justify-between gap-3 cursor-pointer transition-all duration-200 group relative ${
                isFocused
                  ? 'border-emerald-500/80 bg-slate-900/90 shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500/50'
                  : isInActiveSeries
                  ? 'border-slate-700/80 bg-slate-900/60'
                  : 'opacity-85 hover:opacity-100'
              }`}
            >
              {/* Header: Name, Category, and Multi-toggle Check */}
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-slate-100 truncate group-hover:text-emerald-400 transition-colors">
                      {item.name}
                    </h4>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Badge variant={getCategoryVariant(item.category)} size="sm">
                        {item.category}
                      </Badge>
                      <span className="text-[11px] text-slate-400 font-medium">
                        /{item.standard_unit}
                      </span>
                    </div>
                  </div>

                  {/* Multi-toggle Quick Button */}
                  {onToggleStaple && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleStaple(item.canonical_item_id);
                      }}
                      title={isInActiveSeries ? 'Hide from chart' : 'Show in chart'}
                      className={`p-1 rounded-md transition-colors cursor-pointer ${
                        isInActiveSeries
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/80'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
                      }`}
                    >
                      {isInActiveSeries ? <Check className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                  )}
                </div>
              </div>

              {/* Middle: Sparkline & Inflation Rate Badge */}
              <div className="flex items-center justify-between gap-2 py-1">
                {renderSparkline(item, isPositiveInflation)}

                <div className="flex flex-col items-end">
                  {inflationRate !== null && inflationRate !== undefined ? (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono font-semibold border ${
                        isPositiveInflation
                          ? 'bg-rose-950/70 text-rose-300 border-rose-800/70'
                          : isNegativeInflation
                          ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800/70'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {isPositiveInflation ? (
                        <TrendingUp className="w-3 h-3 text-rose-400" />
                      ) : isNegativeInflation ? (
                        <TrendingDown className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Minus className="w-3 h-3 text-slate-400" />
                      )}
                      {isPositiveInflation ? `+${inflationRate.toFixed(1)}%` : `${inflationRate.toFixed(1)}%`}
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-500 font-mono">No trend</span>
                  )}
                  <span className="text-[10px] text-slate-500 mt-0.5">MoM Change</span>
                </div>
              </div>

              {/* Footer: Latest Price and Previous Price */}
              <div className="pt-2.5 border-t border-slate-800/70 flex items-baseline justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wide block">
                    Prev Price
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    PKR {formatPKR(item.previous_price)}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wide block">
                    Current Price
                  </span>
                  <span className="text-sm font-bold font-mono text-slate-100 group-hover:text-emerald-300 transition-colors">
                    PKR {formatPKR(item.latest_price)}
                  </span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
