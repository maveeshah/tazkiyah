import React, { useState, useMemo } from 'react';
import type { CPITrendItem } from '../../types/api';

export interface CPIChartProps {
  items: CPITrendItem[];
  selectedIds?: string[];
  onToggleItem?: (id: string) => void;
  height?: number;
  className?: string;
}

// 10 distinct, accessible colors for multi-series visualization
const SERIES_COLORS = [
  '#10b981', // Emerald (Potato)
  '#38bdf8', // Sky Blue (Milk)
  '#f59e0b', // Amber (Eggs)
  '#f43f5e', // Rose (Petrol)
  '#a855f7', // Purple (Flour)
  '#14b8a6', // Teal (Cooking Oil)
  '#fb923c', // Orange (Onion)
  '#ec4899', // Pink (Tomato)
  '#6366f1', // Indigo (Sugar)
  '#84cc16', // Lime (Rice)
];

export const CPIChart: React.FC<CPIChartProps> = ({
  items,
  selectedIds,
  onToggleItem,
  height = 360,
  className = '',
}) => {
  // Local state for selected items if uncontrolled
  const [internalSelectedIds, setInternalSelectedIds] = useState<string[]>(() =>
    items.slice(0, 6).map((item) => item.canonical_item_id)
  );

  const activeSelectedIds = selectedIds ?? internalSelectedIds;

  const handleToggle = (id: string) => {
    if (onToggleItem) {
      onToggleItem(id);
    } else {
      setInternalSelectedIds((prev) =>
        prev.includes(id) ? (prev.length > 1 ? prev.filter((x) => x !== id) : prev) : [...prev, id]
      );
    }
  };

  const handleSelectAll = () => {
    if (!onToggleItem) {
      setInternalSelectedIds(items.map((item) => item.canonical_item_id));
    }
  };

  const handleDeselectAll = () => {
    if (!onToggleItem && items.length > 0) {
      setInternalSelectedIds([items[0].canonical_item_id]);
    }
  };

  // Hover state
  const [hoveredPoint, setHoveredPoint] = useState<{
    itemId: string;
    itemName: string;
    color: string;
    date: string;
    price: number;
    unit: string;
    merchant?: string | null;
    x: number;
    y: number;
  } | null>(null);

  // 1. Gather all unique chronological dates from all active series
  const { allDates, seriesData, minPrice, maxPrice } = useMemo(() => {
    const dateMap = new Map<string, number>(); // timestamp -> timestamp
    const activeItems = items.filter((item) => activeSelectedIds.includes(item.canonical_item_id));

    let min = Infinity;
    let max = -Infinity;

    activeItems.forEach((item) => {
      item.history.forEach((hp) => {
        const time = new Date(hp.recorded_at).getTime();
        if (!isNaN(time)) {
          dateMap.set(new Date(hp.recorded_at).toISOString().split('T')[0], time);
        }
        const p = typeof hp.unit_price === 'string' ? parseFloat(hp.unit_price) : Number(hp.unit_price);
        if (!isNaN(p)) {
          if (p < min) min = p;
          if (p > max) max = p;
        }
      });
    });

    if (min === Infinity) min = 0;
    if (max === -Infinity) max = 1000;
    if (min === max) {
      min = Math.max(0, min - 50);
      max = max + 50;
    }

    // Add 10% padding to y-scale
    const yPad = (max - min) * 0.1 || 20;
    const yMin = Math.max(0, Math.floor((min - yPad) / 10) * 10);
    const yMax = Math.ceil((max + yPad) / 10) * 10;

    const sortedDates = Array.from(dateMap.entries())
      .sort((a, b) => a[1] - b[1])
      .map((entry) => entry[0]);

    // Build series data with normalized points
    const mappedSeries = items.map((item, index) => {
      const color = SERIES_COLORS[index % SERIES_COLORS.length];
      const historySorted = [...item.history].sort(
        (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
      );

      return {
        item,
        color,
        history: historySorted,
        isActive: activeSelectedIds.includes(item.canonical_item_id),
      };
    });

    return {
      allDates: sortedDates,
      seriesData: mappedSeries,
      minPrice: yMin,
      maxPrice: yMax,
    };
  }, [items, activeSelectedIds]);

  // SVG Chart Geometry
  const padding = { top: 30, right: 40, bottom: 40, left: 65 };
  const viewBoxWidth = 800;
  const viewBoxHeight = height;
  const chartWidth = viewBoxWidth - padding.left - padding.right;
  const chartHeight = viewBoxHeight - padding.top - padding.bottom;

  // Coordinate conversion helpers
  const getX = (dateStr: string) => {
    const idx = allDates.indexOf(dateStr);
    if (idx === -1) return padding.left;
    if (allDates.length <= 1) return padding.left + chartWidth / 2;
    return padding.left + (idx / (allDates.length - 1)) * chartWidth;
  };

  const getY = (price: number) => {
    if (maxPrice <= minPrice) return padding.top + chartHeight / 2;
    const pct = (price - minPrice) / (maxPrice - minPrice);
    return padding.top + chartHeight - pct * chartHeight;
  };

  // Generate 5 Y-Axis Grid Lines
  const yTicks = useMemo(() => {
    const ticks: number[] = [];
    const step = (maxPrice - minPrice) / 4;
    for (let i = 0; i <= 4; i++) {
      ticks.push(Math.round(minPrice + step * i));
    }
    return ticks;
  }, [minPrice, maxPrice]);

  const formatDateLabel = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const formatTooltipDate = (dateStr: string) => {
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

  const formatPKR = (amount: number) => {
    return amount.toLocaleString('en-PK', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  return (
    <div className={`flex flex-col gap-4 w-full select-none ${className}`}>
      {/* Series Filter Selector Pills Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {items.map((item, idx) => {
            const isSelected = activeSelectedIds.includes(item.canonical_item_id);
            const color = SERIES_COLORS[idx % SERIES_COLORS.length];
            return (
              <button
                key={item.canonical_item_id}
                type="button"
                onClick={() => handleToggle(item.canonical_item_id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all duration-150 border cursor-pointer ${
                  isSelected
                    ? 'bg-slate-800 text-slate-100 shadow-sm'
                    : 'bg-slate-900/40 text-slate-400 border-slate-800/80 hover:border-slate-700 hover:text-slate-300 opacity-60'
                }`}
                style={{
                  borderColor: isSelected ? `${color}80` : undefined,
                }}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 transition-transform"
                  style={{
                    backgroundColor: color,
                    transform: isSelected ? 'scale(1)' : 'scale(0.7)',
                  }}
                />
                <span>{item.name}</span>
                <span className="text-[10px] text-slate-400">({item.standard_unit})</span>
              </button>
            );
          })}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <button
            type="button"
            onClick={handleSelectAll}
            className="hover:text-slate-200 transition-colors cursor-pointer px-2 py-0.5 rounded hover:bg-slate-800"
          >
            All
          </button>
          <span className="text-slate-600">&bull;</span>
          <button
            type="button"
            onClick={handleDeselectAll}
            className="hover:text-slate-200 transition-colors cursor-pointer px-2 py-0.5 rounded hover:bg-slate-800"
          >
            Reset
          </button>
        </div>
      </div>

      {/* SVG Multi-Line Chart Canvas */}
      <div className="relative w-full rounded-2xl bg-slate-950/60 border border-slate-800/80 p-3 sm:p-4 shadow-inner overflow-hidden">
        <svg
          viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          className="w-full h-auto overflow-visible"
          style={{ minHeight: height }}
          onMouseLeave={() => setHoveredPoint(null)}
        >
          <defs>
            {seriesData.map(({ item, color }) => (
              <linearGradient
                key={`grad-${item.canonical_item_id}`}
                id={`area-grad-${item.canonical_item_id}`}
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                <stop offset="90%" stopColor={color} stopOpacity={0.0} />
              </linearGradient>
            ))}
          </defs>

          {/* Horizontal Grid Lines & Y-Axis Labels */}
          {yTicks.map((tickVal) => {
            const yPos = getY(tickVal);
            return (
              <g key={`grid-${tickVal}`} className="transition-all duration-300">
                <line
                  x1={padding.left}
                  y1={yPos}
                  x2={viewBoxWidth - padding.right}
                  y2={yPos}
                  stroke="#334155"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  strokeOpacity={0.6}
                />
                <text
                  x={padding.left - 12}
                  y={yPos + 4}
                  textAnchor="end"
                  fill="#94a3b8"
                  fontSize="11"
                  fontFamily="monospace"
                  fontWeight="500"
                >
                  PKR {formatPKR(tickVal)}
                </text>
              </g>
            );
          })}

          {/* X-Axis Date Labels */}
          {allDates.map((dateStr) => {
            const xPos = getX(dateStr);
            return (
              <g key={`x-axis-${dateStr}`}>
                <line
                  x1={xPos}
                  y1={viewBoxHeight - padding.bottom}
                  x2={xPos}
                  y2={viewBoxHeight - padding.bottom + 6}
                  stroke="#475569"
                  strokeWidth={1.5}
                />
                <text
                  x={xPos}
                  y={viewBoxHeight - padding.bottom + 20}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="11"
                  fontFamily="sans-serif"
                  fontWeight="500"
                >
                  {formatDateLabel(dateStr)}
                </text>
              </g>
            );
          })}

          {/* Active Series Lines & Area Fills */}
          {seriesData
            .filter((s) => s.isActive)
            .map(({ item, color, history }) => {
              if (history.length === 0) return null;

              // Build path data
              const points = history
                .map((hp) => {
                  const dStr = new Date(hp.recorded_at).toISOString().split('T')[0];
                  const pVal = typeof hp.unit_price === 'string' ? parseFloat(hp.unit_price) : Number(hp.unit_price);
                  if (isNaN(pVal)) return null;
                  return {
                    x: getX(dStr),
                    y: getY(pVal),
                    price: pVal,
                    date: dStr,
                    rawDate: hp.recorded_at,
                    merchant: hp.merchant,
                    unit: hp.unit,
                  };
                })
                .filter(Boolean) as {
                x: number;
                y: number;
                price: number;
                date: string;
                rawDate: string;
                merchant?: string | null;
                unit: string;
              }[];

              if (points.length === 0) return null;

              const linePathData = points.reduce((acc, pt, i) => {
                return i === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`;
              }, '');

              const areaPathData = `
                ${linePathData}
                L ${points[points.length - 1].x},${viewBoxHeight - padding.bottom}
                L ${points[0].x},${viewBoxHeight - padding.bottom}
                Z
              `;

              return (
                <g key={`series-${item.canonical_item_id}`} className="transition-all duration-300">
                  {/* Subtle Gradient Area Fill under series */}
                  <path
                    d={areaPathData}
                    fill={`url(#area-grad-${item.canonical_item_id})`}
                    className="pointer-events-none"
                  />

                  {/* Line Stroke */}
                  <path
                    d={linePathData}
                    fill="none"
                    stroke={color}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-all duration-300 drop-shadow-md"
                  />

                  {/* Interactive Dot Markers */}
                  {points.map((pt, pIdx) => {
                    const isHovered =
                      hoveredPoint?.itemId === item.canonical_item_id &&
                      hoveredPoint?.date === pt.date;

                    return (
                      <g
                        key={`pt-${item.canonical_item_id}-${pIdx}`}
                        className="cursor-pointer"
                        onMouseEnter={() =>
                          setHoveredPoint({
                            itemId: item.canonical_item_id,
                            itemName: item.name,
                            color,
                            date: pt.date,
                            price: pt.price,
                            unit: pt.unit,
                            merchant: pt.merchant,
                            x: pt.x,
                            y: pt.y,
                          })
                        }
                      >
                        {/* Enlarged transparent hit area */}
                        <circle cx={pt.x} cy={pt.y} r={14} fill="transparent" />

                        {/* Outer pulsing ring if hovered */}
                        {isHovered && (
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={8}
                            fill={color}
                            fillOpacity={0.3}
                            className="animate-ping"
                          />
                        )}

                        {/* Core Dot Marker */}
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={isHovered ? 5.5 : 4}
                          fill={isHovered ? '#ffffff' : color}
                          stroke="#0f172a"
                          strokeWidth={2}
                          className="transition-all duration-150"
                        />
                      </g>
                    );
                  })}
                </g>
              );
            })}

          {/* Vertical Hover Indicator Guide Line */}
          {hoveredPoint && (
            <line
              x1={hoveredPoint.x}
              y1={padding.top}
              x2={hoveredPoint.x}
              y2={viewBoxHeight - padding.bottom}
              stroke="#64748b"
              strokeWidth={1}
              strokeDasharray="3 3"
              className="pointer-events-none"
            />
          )}
        </svg>

        {/* Interactive Floating Tooltip */}
        {hoveredPoint && (
          <div
            className="absolute z-20 pointer-events-none bg-slate-900/95 border border-slate-700/80 rounded-xl p-3 shadow-2xl backdrop-blur-md transition-all duration-75 text-xs flex flex-col gap-1 min-w-[180px] -translate-x-1/2 -translate-y-[115%]"
            style={{
              left: `${(hoveredPoint.x / viewBoxWidth) * 100}%`,
              top: `${(hoveredPoint.y / viewBoxHeight) * 100}%`,
            }}
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: hoveredPoint.color }}
                />
                <span className="font-semibold text-slate-100">{hoveredPoint.itemName}</span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">
                {formatTooltipDate(hoveredPoint.date)}
              </span>
            </div>

            <div className="flex items-baseline justify-between mt-0.5">
              <span className="text-slate-400">Unit Price:</span>
              <span className="font-bold font-mono text-emerald-400 text-sm">
                PKR {formatPKR(hoveredPoint.price)}
                <span className="text-[11px] text-slate-400 font-normal"> / {hoveredPoint.unit}</span>
              </span>
            </div>

            {hoveredPoint.merchant && (
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60 mt-0.5">
                <span>Vendor:</span>
                <span className="font-medium text-slate-300 truncate max-w-[120px]">
                  {hoveredPoint.merchant}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
