import React from 'react';

export type BadgeVariant =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'cash'
  | 'bank'
  | 'emi'
  | 'credit'
  | 'whatsapp'
  | 'web'
  | 'mobile';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  className = '',
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  const variantClasses: Record<BadgeVariant, { container: string; dot: string }> = {
    default: {
      container: 'bg-slate-800 text-slate-300 border-slate-700',
      dot: 'bg-slate-400',
    },
    primary: {
      container: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80',
      dot: 'bg-emerald-400',
    },
    success: {
      container: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80',
      dot: 'bg-emerald-400',
    },
    warning: {
      container: 'bg-amber-950/80 text-amber-300 border-amber-800/80',
      dot: 'bg-amber-400',
    },
    danger: {
      container: 'bg-rose-950/80 text-rose-300 border-rose-800/80',
      dot: 'bg-rose-400',
    },
    info: {
      container: 'bg-cyan-950/80 text-cyan-300 border-cyan-800/80',
      dot: 'bg-cyan-400',
    },
    neutral: {
      container: 'bg-slate-800/80 text-slate-300 border-slate-700/80',
      dot: 'bg-slate-400',
    },
    // Account Types
    cash: {
      container: 'bg-emerald-950/70 text-emerald-300 border-emerald-800/70',
      dot: 'bg-emerald-400',
    },
    bank: {
      container: 'bg-blue-950/70 text-blue-300 border-blue-800/70',
      dot: 'bg-blue-400',
    },
    emi: {
      container: 'bg-teal-950/70 text-teal-300 border-teal-800/70',
      dot: 'bg-teal-400',
    },
    credit: {
      container: 'bg-purple-950/70 text-purple-300 border-purple-800/70',
      dot: 'bg-purple-400',
    },
    // Transaction Sources
    whatsapp: {
      container: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/80',
      dot: 'bg-emerald-400',
    },
    web: {
      container: 'bg-indigo-950/80 text-indigo-300 border-indigo-800/80',
      dot: 'bg-indigo-400',
    },
    mobile: {
      container: 'bg-violet-950/80 text-violet-300 border-violet-800/80',
      dot: 'bg-violet-400',
    },
  };

  const style = variantClasses[variant] || variantClasses.default;

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border transition-colors ${sizeClasses[size]} ${style.container} ${className}`}
      {...props}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${style.dot} animate-pulse`} />}
      {children}
    </span>
  );
};
