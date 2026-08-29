import React from 'react';
import { Wallet, PieChart, ReceiptText, TrendingUp, Target, AlertCircle, Users } from 'lucide-react';
import { Tabs, type TabItem } from '../ui/Tabs';

export type DashboardView = 'accounts' | 'budget' | 'ledger' | 'cpi' | 'goals' | 'users';

export interface NavigationProps {
  activeView: DashboardView;
  onViewChange: (view: DashboardView) => void;
  overspentCount?: number;
  transactionsCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeView,
  onViewChange,
  overspentCount = 0,
  transactionsCount,
}) => {
  const tabs: TabItem<DashboardView>[] = [
    {
      id: 'accounts',
      label: 'Accounts & Wallets',
      icon: <Wallet className="w-4 h-4" />,
    },
    {
      id: 'budget',
      label: 'Zero-Based Budget',
      icon: <PieChart className="w-4 h-4" />,
      badge:
        overspentCount > 0 ? (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-semibold border border-rose-500/40">
            <AlertCircle className="w-2.5 h-2.5" />
            {overspentCount} overspent
          </span>
        ) : undefined,
    },
    {
      id: 'ledger',
      label: 'Transaction Ledger',
      icon: <ReceiptText className="w-4 h-4" />,
      badge:
        transactionsCount !== undefined && transactionsCount > 0 ? (
          <span className="px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-mono">
            {transactionsCount}
          </span>
        ) : undefined,
    },
    {
      id: 'cpi',
      label: 'Personal CPI',
      icon: <TrendingUp className="w-4 h-4" />,
    },
    {
      id: 'goals',
      label: 'Goals & Runway',
      icon: <Target className="w-4 h-4" />,
    },
    {
      id: 'users',
      label: 'Users & Household',
      icon: <Users className="w-4 h-4" />,
    },
  ];

  return (
    <nav className="w-full flex items-center justify-between overflow-x-auto pb-1">
      <Tabs<DashboardView>
        tabs={tabs}
        activeTab={activeView}
        onChange={onViewChange}
        variant="segmented"
        className="w-full max-w-3xl"
      />
    </nav>
  );
};
