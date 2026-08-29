import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'glass' | 'solid' | 'outline' | 'gradient';
  hoverEffect?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'glass',
  hoverEffect = false,
  className = '',
  ...props
}) => {
  const variantStyles = {
    glass: 'bg-slate-900/70 backdrop-blur-md border border-slate-800/80 shadow-lg shadow-black/20',
    solid: 'bg-slate-900 border border-slate-800 shadow-md',
    outline: 'border border-slate-800 bg-transparent',
    gradient:
      'bg-gradient-to-b from-slate-900/90 to-slate-950/90 backdrop-blur-md border border-slate-800/80 shadow-xl',
  };

  const hoverStyles = hoverEffect
    ? 'transition-all duration-200 hover:border-slate-700 hover:shadow-xl hover:translate-y-[-1px]'
    : '';

  return (
    <div
      className={`rounded-2xl p-5 ${variantStyles[variant]} ${hoverStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div className={`flex items-center justify-between pb-3 mb-3 border-b border-slate-800/60 ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <h3 className={`text-base font-semibold text-slate-100 tracking-tight flex items-center gap-2 ${className}`} {...props}>
    {children}
  </h3>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <p className={`text-xs text-slate-400 mt-0.5 ${className}`} {...props}>
    {children}
  </p>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div className={`${className}`} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div className={`mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between ${className}`} {...props}>
    {children}
  </div>
);
