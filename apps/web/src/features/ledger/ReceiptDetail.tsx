import React from 'react';
import {
  Receipt,
  MessageSquare,
  Globe,
  Smartphone,
  Tag,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  Wallet,
  FolderOpen,
  Info,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import type {
  TransactionResponse,
  AccountResponse,
  EnvelopeGroupResponse,
  CPITrendItem,
} from '../../types/api';

export interface ReceiptDetailProps {
  transaction: TransactionResponse;
  accounts?: AccountResponse[];
  envelopeGroups?: EnvelopeGroupResponse[];
  cpiTrends?: CPITrendItem[];
}

export const ReceiptDetail: React.FC<ReceiptDetailProps> = ({
  transaction,
  accounts = [],
  envelopeGroups = [],
  cpiTrends = [],
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

  const formatQuantity = (qty: number | string | undefined | null) => {
    if (qty === undefined || qty === null) return '1.000';
    const val = typeof qty === 'string' ? parseFloat(qty) : Number(qty);
    if (isNaN(val)) return String(qty);
    return val % 1 === 0 ? `${val}.000` : val.toFixed(3);
  };

  // Find Account
  const account = accounts.find((a) => a.id === transaction.account_id);

  // Find Envelope & Group
  let envelopeName = 'General Budget';
  let groupName = '';
  for (const group of envelopeGroups) {
    const env = group.envelopes.find((e) => e.id === transaction.envelope_id);
    if (env) {
      envelopeName = env.name;
      groupName = group.name;
      break;
    }
  }

  // Canonical mapping dictionary
  const canonicalMap = React.useMemo(() => {
    const map = new Map<string, CPITrendItem>();
    for (const cpi of cpiTrends) {
      map.set(cpi.canonical_item_id, cpi);
    }
    return map;
  }, [cpiTrends]);

  // Compute subtotal from line items
  const lineItemsSubtotal = React.useMemo(() => {
    return transaction.line_items.reduce((sum, item) => {
      const p = parseFloat(String(item.total_price)) || 0;
      return sum + p;
    }, 0);
  }, [transaction.line_items]);

  const totalAmount = parseFloat(String(transaction.total_amount)) || 0;
  const isBalanced = Math.abs(lineItemsSubtotal - totalAmount) < 0.05 || transaction.line_items.length === 0;

  const transactedDate = new Date(transaction.transacted_at);
  const formattedDate = transactedDate.toLocaleDateString('en-PK', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const formattedTime = transactedDate.toLocaleTimeString('en-PK', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="p-5 bg-slate-950/70 border-t border-slate-800/80 rounded-b-2xl flex flex-col gap-5 animate-in fade-in slide-in-from-top-1 duration-200">
      {/* Header Info & Metadata Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-b border-slate-800/60 pb-3">
        <div className="flex flex-wrap items-center gap-4 text-slate-300">
          <div className="flex items-center gap-1.5 font-mono text-slate-400">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>{formattedDate} at {formattedTime}</span>
          </div>

          <div className="flex items-center gap-1.5">
            {account?.type === 'BANK' ? (
              <Building2 className="w-3.5 h-3.5 text-blue-400" />
            ) : (
              <Wallet className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span className="text-slate-400">Account:</span>
            <span className="font-semibold text-slate-200">{account?.name || 'Account'}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <FolderOpen className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-slate-400">Envelope:</span>
            <span className="font-semibold text-slate-200">
              {envelopeName} {groupName && <span className="text-slate-400 font-normal">({groupName})</span>}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
          <span>TX ID:</span>
          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
            {transaction.id.slice(0, 8)}
          </span>
        </div>
      </div>

      {/* Raw Intake Preview (WhatsApp / Web / Mobile) */}
      {transaction.raw_input && (
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/80 p-3.5 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {transaction.source === 'WHATSAPP' && (
                <div className="p-1 rounded-md bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                  <MessageSquare className="w-3.5 h-3.5" />
                </div>
              )}
              {transaction.source === 'MOBILE' && (
                <div className="p-1 rounded-md bg-violet-950/80 text-violet-400 border border-violet-800/60">
                  <Smartphone className="w-3.5 h-3.5" />
                </div>
              )}
              {transaction.source === 'WEB' && (
                <div className="p-1 rounded-md bg-indigo-950/80 text-indigo-400 border border-indigo-800/60">
                  <Globe className="w-3.5 h-3.5" />
                </div>
              )}
              <span className="text-xs font-semibold text-slate-200">
                {transaction.source === 'WHATSAPP'
                  ? 'Raw WhatsApp Intake Message'
                  : transaction.source === 'MOBILE'
                  ? 'Mobile Ingestion Note'
                  : 'Web Manual Input Note'}
              </span>
            </div>
            <Badge
              variant={
                transaction.source === 'WHATSAPP'
                  ? 'whatsapp'
                  : transaction.source === 'MOBILE'
                  ? 'mobile'
                  : 'web'
              }
              size="sm"
            >
              {transaction.source}
            </Badge>
          </div>
          <p className="text-xs font-mono text-slate-300 bg-slate-950/60 rounded-lg p-2.5 border border-slate-800/60 select-all leading-relaxed">
            "{transaction.raw_input}"
          </p>
        </div>
      )}

      {/* Itemized Line Items Table */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Receipt className="w-3.5 h-3.5 text-emerald-400" />
            Receipt Breakdown ({transaction.line_items.length} {transaction.line_items.length === 1 ? 'item' : 'items'})
          </h5>
          {transaction.line_items.length > 0 && (
            <span className="text-[11px] font-mono text-slate-400">
              Unit Economics & Staple Mapping
            </span>
          )}
        </div>

        {transaction.line_items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-800 p-6 text-center text-xs text-slate-400 bg-slate-950/30">
            <Info className="w-6 h-6 text-slate-500 mx-auto mb-1.5" />
            <p className="text-slate-300 font-medium">No granular line items recorded</p>
            <p className="text-slate-500 text-[11px] mt-0.5">
              This transaction was logged with a single lump sum amount of PKR {formatPKR(transaction.total_amount)}.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-800/90 overflow-hidden bg-slate-900/60">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-medium">
                    <th className="py-2.5 px-3.5 w-8 text-center">#</th>
                    <th className="py-2.5 px-3.5">Item Name & Classification</th>
                    <th className="py-2.5 px-3.5 text-right">Quantity</th>
                    <th className="py-2.5 px-3.5 text-right">Unit Price</th>
                    <th className="py-2.5 px-3.5 text-right">Line Total</th>
                    <th className="py-2.5 px-3.5">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {transaction.line_items.map((item, idx) => {
                    const canonical = item.canonical_item_id
                      ? canonicalMap.get(item.canonical_item_id)
                      : undefined;
                    const unitPrice =
                      item.unit_price !== null && item.unit_price !== undefined
                        ? parseFloat(String(item.unit_price))
                        : parseFloat(String(item.total_price)) / (parseFloat(String(item.quantity)) || 1);

                    return (
                      <tr
                        key={item.id || idx}
                        className="hover:bg-slate-800/30 transition-colors group"
                      >
                        <td className="py-3 px-3.5 text-center font-mono text-slate-500 text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-3.5">
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold text-slate-200 group-hover:text-emerald-300 transition-colors">
                              {item.raw_item_name}
                            </span>
                            {canonical && (
                              <div className="flex items-center gap-1">
                                <Badge variant="primary" size="sm" className="text-[10px] py-0 px-1.5">
                                  <Tag className="w-2.5 h-2.5 mr-0.5" />
                                  CPI Staple: {canonical.name} ({canonical.category})
                                </Badge>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3.5 text-right font-mono text-slate-300">
                          {formatQuantity(item.quantity)}{' '}
                          <span className="text-slate-500 text-[11px] font-sans">{item.unit || 'unit'}</span>
                        </td>
                        <td className="py-3 px-3.5 text-right font-mono text-slate-300">
                          PKR {formatPKR(unitPrice)}
                          <span className="text-slate-500 text-[11px]">/{item.unit || 'unit'}</span>
                        </td>
                        <td className="py-3 px-3.5 text-right font-mono font-bold text-emerald-400">
                          PKR {formatPKR(item.total_price)}
                        </td>
                        <td className="py-3 px-3.5 text-slate-400 text-[11px] italic max-w-xs truncate">
                          {item.notes || <span className="text-slate-600 not-italic">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Subtotal & Integrity Summary Footer */}
            <div className="bg-slate-950/80 px-4 py-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                {isBalanced ? (
                  <span className="flex items-center gap-1.5 text-emerald-400 font-medium text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Receipt Subtotal Matches Transaction Total
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-amber-400 font-medium text-[11px]">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Subtotal discrepancy: PKR {formatPKR(Math.abs(lineItemsSubtotal - totalAmount))}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 font-mono text-xs">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <span>Line Items Sum:</span>
                  <span className="font-semibold text-slate-200">PKR {formatPKR(lineItemsSubtotal)}</span>
                </div>
                <div className="flex items-center gap-1.5 border-l border-slate-800 pl-4">
                  <span className="text-slate-400">Total Billed:</span>
                  <span className="font-bold text-emerald-400 text-sm">
                    PKR {formatPKR(transaction.total_amount)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
