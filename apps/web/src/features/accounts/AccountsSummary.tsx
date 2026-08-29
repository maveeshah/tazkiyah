import React from 'react';
import {
  Wallet,
  Building2,
  Smartphone,
  CreditCard,
  Plus,
  AlertTriangle,
  PieChart,
  Shield,
  Layers,
  Pencil,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge, type BadgeVariant } from '../../components/ui/Badge';
import type { AccountResponse, AccountType } from '../../types/api';

export interface AccountsSummaryProps {
  accounts: AccountResponse[];
  netLiquidWorth: number;
  totalCash: number;
  totalBank: number;
  totalEmi: number;
  totalCredit: number;
  onOpenAddAccount: () => void;
  onEditAccount?: (account: AccountResponse) => void;
  isLoading?: boolean;
}

interface InstitutionTheme {
  variant: BadgeVariant;
  bgGradient: string;
  borderColor: string;
  iconBg: string;
  iconColor: string;
  textColor: string;
  badgeLabel: string;
  institutionLabel: string;
}

function getInstitutionTheme(name: string, type: AccountType): InstitutionTheme {
  const lower = name.toLowerCase();

  if (lower.includes('meezan')) {
    return {
      variant: 'bank',
      bgGradient: 'from-blue-950/40 via-slate-900/60 to-slate-900/80',
      borderColor: 'border-blue-800/50 hover:border-blue-600/80',
      iconBg: 'bg-blue-900/40 border border-blue-700/50',
      iconColor: 'text-blue-400',
      textColor: 'text-blue-300',
      badgeLabel: 'Meezan Bank',
      institutionLabel: 'Islamic Banking & Savings',
    };
  }

  if (lower.includes('sada')) {
    return {
      variant: 'emi',
      bgGradient: 'from-teal-950/40 via-slate-900/60 to-slate-900/80',
      borderColor: 'border-teal-800/50 hover:border-teal-600/80',
      iconBg: 'bg-teal-900/40 border border-teal-700/50',
      iconColor: 'text-teal-400',
      textColor: 'text-teal-300',
      badgeLabel: 'Sadapay',
      institutionLabel: 'EMI & Digital Wallet',
    };
  }

  if (lower.includes('naya')) {
    return {
      variant: 'emi',
      bgGradient: 'from-orange-950/30 via-slate-900/60 to-slate-900/80',
      borderColor: 'border-orange-800/50 hover:border-orange-600/80',
      iconBg: 'bg-orange-900/40 border border-orange-700/50',
      iconColor: 'text-orange-400',
      textColor: 'text-orange-300',
      badgeLabel: 'Nayapay',
      institutionLabel: 'EMI & Instant Payments',
    };
  }

  if (lower.includes('cash') || lower.includes('wallet') || type === 'CASH') {
    return {
      variant: 'cash',
      bgGradient: 'from-emerald-950/40 via-slate-900/60 to-slate-900/80',
      borderColor: 'border-emerald-800/50 hover:border-emerald-600/80',
      iconBg: 'bg-emerald-900/40 border border-emerald-700/50',
      iconColor: 'text-emerald-400',
      textColor: 'text-emerald-300',
      badgeLabel: 'Physical Cash',
      institutionLabel: 'Liquid Wallet Cash',
    };
  }

  if (type === 'BANK') {
    return {
      variant: 'bank',
      bgGradient: 'from-sky-950/40 via-slate-900/60 to-slate-900/80',
      borderColor: 'border-sky-800/50 hover:border-sky-600/80',
      iconBg: 'bg-sky-900/40 border border-sky-700/50',
      iconColor: 'text-sky-400',
      textColor: 'text-sky-300',
      badgeLabel: 'Bank Account',
      institutionLabel: 'Scheduled Commercial Bank',
    };
  }

  if (type === 'EMI') {
    return {
      variant: 'emi',
      bgGradient: 'from-purple-950/40 via-slate-900/60 to-slate-900/80',
      borderColor: 'border-purple-800/50 hover:border-purple-600/80',
      iconBg: 'bg-purple-900/40 border border-purple-700/50',
      iconColor: 'text-purple-400',
      textColor: 'text-purple-300',
      badgeLabel: 'Digital Wallet',
      institutionLabel: 'Electronic Money Institution',
    };
  }

  return {
    variant: 'credit',
    bgGradient: 'from-rose-950/30 via-slate-900/60 to-slate-900/80',
    borderColor: 'border-slate-800 hover:border-slate-700',
    iconBg: 'bg-slate-800 border border-slate-700',
    iconColor: 'text-slate-400',
    textColor: 'text-slate-300',
    badgeLabel: 'Credit / Card',
    institutionLabel: 'Credit Account',
  };
}

function getAccountIcon(type: AccountType) {
  switch (type) {
    case 'CASH':
      return <Wallet className="w-5 h-5" />;
    case 'BANK':
      return <Building2 className="w-5 h-5" />;
    case 'EMI':
      return <Smartphone className="w-5 h-5" />;
    case 'CREDIT':
      return <CreditCard className="w-5 h-5" />;
    default:
      return <Wallet className="w-5 h-5" />;
  }
}

export const AccountsSummary: React.FC<AccountsSummaryProps> = ({
  accounts,
  netLiquidWorth,
  totalCash,
  totalBank,
  totalEmi,
  totalCredit,
  onOpenAddAccount,
  onEditAccount,
  isLoading = false,
}) => {
  const activeAccounts = accounts.filter((a) => a.is_active);

  const formatPKR = (amount: number | string) => {
    const val = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
    return isNaN(val)
      ? '0.00'
      : val.toLocaleString('en-PK', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
  };

  const cashShare = netLiquidWorth > 0 ? (totalCash / netLiquidWorth) * 100 : 0;
  const bankShare = netLiquidWorth > 0 ? (totalBank / netLiquidWorth) * 100 : 0;
  const emiShare = netLiquidWorth > 0 ? (totalEmi / netLiquidWorth) * 100 : 0;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* Hero Liquid Worth Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-emerald-950/40 border border-slate-800/80 p-6 md:p-8 shadow-2xl shadow-black/40">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 rounded-md bg-emerald-950/80 text-emerald-300 text-xs font-mono font-medium border border-emerald-800/80 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                Total Liquid Capital (R5)
              </span>
              <span className="text-xs text-slate-400">
                {activeAccounts.length} Active Accounts
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold text-emerald-400 font-mono">PKR</span>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-50 font-mono">
                {formatPKR(netLiquidWorth)}
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-md">
              Aggregate liquid funds across physical cash, Islamic bank balances, and electronic money wallets.
            </p>
          </div>

          {/* Quick breakdown metrics */}
          <div className="grid grid-cols-3 gap-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 backdrop-blur-sm">
            <div className="flex flex-col">
              <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                <Building2 className="w-3 h-3 text-blue-400" /> Bank
              </span>
              <span className="text-sm font-semibold font-mono text-slate-200 mt-0.5">
                PKR {formatPKR(totalBank)}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {bankShare.toFixed(1)}%
              </span>
            </div>

            <div className="flex flex-col border-l border-slate-800/80 pl-3">
              <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                <Smartphone className="w-3 h-3 text-teal-400" /> Wallets
              </span>
              <span className="text-sm font-semibold font-mono text-slate-200 mt-0.5">
                PKR {formatPKR(totalEmi)}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {emiShare.toFixed(1)}%
              </span>
            </div>

            <div className="flex flex-col border-l border-slate-800/80 pl-3">
              <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                <Wallet className="w-3 h-3 text-emerald-400" /> Cash
              </span>
              <span className="text-sm font-semibold font-mono text-slate-200 mt-0.5">
                PKR {formatPKR(totalCash)}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {cashShare.toFixed(1)}%
              </span>
            </div>

            {totalCredit > 0 && (
              <div className="flex flex-col border-l border-slate-800/80 pl-3">
                <span className="text-[11px] text-rose-400 font-medium flex items-center gap-1">
                  <CreditCard className="w-3 h-3 text-rose-400" /> Credit
                </span>
                <span className="text-sm font-semibold font-mono text-rose-300 mt-0.5">
                  PKR {formatPKR(totalCredit)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Liquid Distribution Bar */}
        <div className="mt-6 pt-5 border-t border-slate-800/80">
          <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
            <span className="font-medium flex items-center gap-1.5 text-slate-300">
              <PieChart className="w-3.5 h-3.5 text-emerald-400" /> Asset Allocation Breakdown
            </span>
            <span className="font-mono text-[11px]">
              Bank ({bankShare.toFixed(0)}%) &bull; Wallets ({emiShare.toFixed(0)}%) &bull; Cash ({cashShare.toFixed(0)}%)
            </span>
          </div>

          <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden flex p-0.5 border border-slate-800 gap-0.5">
            {bankShare > 0 && (
              <div
                style={{ width: `${bankShare}%` }}
                className="bg-blue-500 h-full rounded-l-full transition-all duration-500"
                title={`Bank Accounts: ${bankShare.toFixed(1)}%`}
              />
            )}
            {emiShare > 0 && (
              <div
                style={{ width: `${emiShare}%` }}
                className="bg-teal-400 h-full transition-all duration-500"
                title={`Digital Wallets: ${emiShare.toFixed(1)}%`}
              />
            )}
            {cashShare > 0 && (
              <div
                style={{ width: `${cashShare}%` }}
                className="bg-emerald-500 h-full rounded-r-full transition-all duration-500"
                title={`Physical Cash: ${cashShare.toFixed(1)}%`}
              />
            )}
          </div>
        </div>
      </div>

      {/* Account Cards Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" /> Liquid Accounts & Wallets
            </h3>
            <p className="text-xs text-slate-400">
              Real-time balances across Islamic banking, digital EMIs, and cash in hand.
            </p>
          </div>

          <Button
            variant="emerald"
            size="sm"
            onClick={onOpenAddAccount}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Account
          </Button>
        </div>

        {activeAccounts.length === 0 && !isLoading ? (
          <Card className="text-center py-12">
            <Wallet className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h4 className="text-sm font-semibold text-slate-300">No accounts created yet</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
              Add your cash wallet, bank accounts (e.g. Meezan Bank), or fintech wallets (Sadapay, Nayapay).
            </p>
            <Button variant="primary" size="sm" onClick={onOpenAddAccount}>
              Create First Account
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {activeAccounts.map((account) => {
              const theme = getInstitutionTheme(account.name, account.type);
              const balanceNum =
                typeof account.current_balance === 'string'
                  ? parseFloat(account.current_balance)
                  : Number(account.current_balance);
              const isOverdrawn = account.is_overdrawn || balanceNum < 0;

              return (
                <div
                  key={account.id}
                  className={`rounded-2xl p-5 bg-gradient-to-b ${theme.bgGradient} border ${
                    isOverdrawn ? 'border-rose-600/80 shadow-rose-950/40' : theme.borderColor
                  } shadow-lg transition-all duration-200 hover:translate-y-[-2px] flex flex-col justify-between relative group`}
                >
                  {onEditAccount && (
                    <button
                      type="button"
                      onClick={() => onEditAccount(account)}
                      aria-label={`Edit ${account.name}`}
                      className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-900/70 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-emerald-400 transition-opacity"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {/* Top Bar: Icon & Badge */}
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div
                        className={`w-10 h-10 rounded-xl ${theme.iconBg} ${theme.iconColor} flex items-center justify-center shadow-sm`}
                      >
                        {getAccountIcon(account.type)}
                      </div>
                      <Badge variant={theme.variant} size="sm">
                        {theme.badgeLabel}
                      </Badge>
                    </div>

                    {/* Account Name & Subtitle */}
                    <h4 className="text-base font-semibold text-slate-100 tracking-tight">
                      {account.name}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">{theme.institutionLabel}</p>
                  </div>

                  {/* Balance Display */}
                  <div className="mt-6 pt-4 border-t border-slate-800/60">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                      <span>Available Balance</span>
                      {isOverdrawn && (
                        <span className="flex items-center gap-1 text-rose-400 font-semibold text-[11px]">
                          <AlertTriangle className="w-3 h-3" /> Overdrawn
                        </span>
                      )}
                    </div>

                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xs font-mono font-medium text-slate-400">PKR</span>
                      <span
                        className={`text-xl font-bold font-mono tracking-tight ${
                          isOverdrawn ? 'text-rose-400' : 'text-slate-100'
                        }`}
                      >
                        {formatPKR(account.current_balance)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
