import React from 'react';

export interface GaugeProps {
  value: number; // current value
  max?: number; // max scale (e.g. 6 or 12 months)
  min?: number;
  label?: string;
  unit?: string;
  subtext?: string;
  size?: number;
  thresholds?: {
    danger: number;
    warning: number;
    safe: number;
  };
  className?: string;
}

export const Gauge: React.FC<GaugeProps> = ({
  value,
  max = 12,
  min = 0,
  label = 'Runway',
  unit = 'mos',
  subtext,
  size = 180,
  thresholds = { danger: 2, warning: 4, safe: 6 },
  className = '',
}) => {
  const normalizedValue = Math.min(Math.max(value, min), max);
  const percentage = (normalizedValue - min) / (max - min);

  // Determine color based on thresholds
  let strokeColor = '#10b981'; // emerald
  let statusText = 'Healthy';
  if (value < thresholds.danger) {
    strokeColor = '#f43f5e'; // rose
    statusText = 'Critical';
  } else if (value < thresholds.warning) {
    strokeColor = '#f59e0b'; // amber
    statusText = 'Low';
  } else if (value < thresholds.safe) {
    strokeColor = '#0ea5e9'; // sky
    statusText = 'Moderate';
  }

  // Semi-circle SVG coordinates
  const radius = 70;
  const strokeWidth = 12;
  const center = size / 2;
  const startAngle = Math.PI * 0.8;
  const endAngle = Math.PI * 2.2;
  const totalAngle = endAngle - startAngle;

  const currentAngle = startAngle + totalAngle * percentage;

  // Arc path generator
  const polarToCartesian = (centerX: number, centerY: number, r: number, angleInRadians: number) => {
    return {
      x: centerX + r * Math.cos(angleInRadians),
      y: centerY + r * Math.sin(angleInRadians),
    };
  };

  const describeArc = (x: number, y: number, r: number, startA: number, endA: number) => {
    const start = polarToCartesian(x, y, r, endA);
    const end = polarToCartesian(x, y, r, startA);
    const largeArcFlag = endA - startA <= Math.PI ? '0' : '1';

    return ['M', start.x, start.y, 'A', r, r, 0, largeArcFlag, 0, end.x, end.y].join(' ');
  };

  const backgroundArc = describeArc(center, center + 10, radius, startAngle, endAngle);
  const activeArc = describeArc(center, center + 10, radius, startAngle, currentAngle);

  return (
    <div className={`flex flex-col items-center justify-center relative ${className}`}>
      <svg width={size} height={size * 0.75} viewBox={`0 0 ${size} ${size * 0.75}`} className="overflow-visible">
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f43f5e" />
            <stop offset="40%" stopColor="#f59e0b" />
            <stop offset="70%" stopColor="#0ea5e9" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>

        {/* Background track */}
        <path
          d={backgroundArc}
          fill="none"
          stroke="#1e293b"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Active filled arc */}
        {percentage > 0 && (
          <path
            d={activeArc}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        )}
      </svg>

      {/* Center content display */}
      <div className="absolute top-[38%] flex flex-col items-center justify-center text-center">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold font-mono tracking-tight text-slate-100">
            {value.toFixed(1)}
          </span>
          <span className="text-xs text-slate-400 font-medium">{unit}</span>
        </div>
        <span
          className="text-[11px] font-medium px-2 py-0.5 rounded-full mt-1 border"
          style={{
            color: strokeColor,
            borderColor: `${strokeColor}40`,
            backgroundColor: `${strokeColor}15`,
          }}
        >
          {statusText}
        </span>
      </div>

      {/* Bottom label */}
      <div className="mt-1 text-center">
        <span className="text-xs font-semibold text-slate-300 block">{label}</span>
        {subtext && <span className="text-[11px] text-slate-400">{subtext}</span>}
      </div>
    </div>
  );
};
