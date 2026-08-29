import React from 'react';

export interface ProgressBarProps {
  value: number; // current value
  max?: number; // max value (default 100)
  label?: string;
  subLabel?: string;
  showPercentage?: boolean;
  color?: 'emerald' | 'amber' | 'rose' | 'blue' | 'purple' | 'auto';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  label,
  subLabel,
  showPercentage = false,
  color = 'auto',
  size = 'md',
  className = '',
}) => {
  const percentage = Math.min(Math.max((value / (max || 1)) * 100, 0), 100);

  // Dynamic auto color calculation based on percentage
  const resolvedColor =
    color === 'auto'
      ? percentage >= 100
        ? 'emerald'
        : percentage >= 75
        ? 'blue'
        : percentage >= 40
        ? 'amber'
        : 'rose'
      : color;

  const colorStyles = {
    emerald: 'bg-emerald-500 shadow-emerald-500/30',
    amber: 'bg-amber-500 shadow-amber-500/30',
    rose: 'bg-rose-500 shadow-rose-500/30',
    blue: 'bg-blue-500 shadow-blue-500/30',
    purple: 'bg-purple-500 shadow-purple-500/30',
  };

  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  return (
    <div className={`w-full flex flex-col gap-1.5 ${className}`}>
      {(label || subLabel || showPercentage) && (
        <div className="flex justify-between items-center text-xs">
          {label && <span className="font-medium text-slate-300">{label}</span>}
          <div className="flex items-center gap-2 text-slate-400">
            {subLabel && <span>{subLabel}</span>}
            {showPercentage && (
              <span className="font-mono font-medium text-slate-200">
                {Math.round(percentage)}%
              </span>
            )}
          </div>
        </div>
      )}
      <div className={`w-full bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-slate-700/50`}>
        <div
          className={`rounded-full transition-all duration-500 ease-out shadow-sm ${heightClasses[size]} ${colorStyles[resolvedColor]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
