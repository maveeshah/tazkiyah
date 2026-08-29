import React from 'react';

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
}

export interface TabsProps<T extends string = string> {
  tabs: TabItem<T>[];
  activeTab: T;
  onChange: (tabId: T) => void;
  variant?: 'pills' | 'underline' | 'segmented';
  className?: string;
}

export function Tabs<T extends string = string>({
  tabs,
  activeTab,
  onChange,
  variant = 'pills',
  className = '',
}: TabsProps<T>) {
  if (variant === 'segmented') {
    return (
      <div
        className={`flex items-center p-1 bg-slate-900 border border-slate-800 rounded-2xl gap-1 ${className}`}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3.5 rounded-xl text-xs font-medium transition-all duration-150 select-none cursor-pointer ${
                isActive
                  ? 'bg-slate-800 text-emerald-400 shadow-md border border-slate-700 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              {tab.icon && <span className="w-4 h-4 flex items-center justify-center">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.badge && <span>{tab.badge}</span>}
            </button>
          );
        })}
      </div>
    );
  }

  if (variant === 'underline') {
    return (
      <div className={`flex border-b border-slate-800 gap-6 ${className}`}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-all select-none cursor-pointer ${
                isActive
                  ? 'border-emerald-400 text-emerald-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              {tab.icon && <span className="w-4 h-4 flex items-center justify-center">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.badge && <span>{tab.badge}</span>}
            </button>
          );
        })}
      </div>
    );
  }

  // Default: pills
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 py-2 px-4 rounded-xl text-xs font-medium transition-all duration-150 select-none cursor-pointer ${
              isActive
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800 font-semibold shadow-sm shadow-emerald-950'
                : 'bg-slate-900/80 text-slate-400 border border-slate-800 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            {tab.icon && <span className="w-4 h-4 flex items-center justify-center">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge && <span>{tab.badge}</span>}
          </button>
        );
      })}
    </div>
  );
}
