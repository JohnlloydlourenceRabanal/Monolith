import React from 'react';
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Check,
  X,
  PackageCheck,
} from 'lucide-react';
import { OrderResponse } from '../types';
import { getProductMeta } from '../data/productData';

interface CheckoutSuccessModalProps {
  result: OrderResponse | null;
  isOpen: boolean;
  onClose: () => void;
  onViewOrders: () => void;
}

export const CheckoutSuccessModal: React.FC<CheckoutSuccessModalProps> = ({
  result,
  isOpen,
  onClose,
  onViewOrders,
}) => {
  if (!isOpen || !result) return null;

  const isSuccess = result.status === 'CONFIRMED';
  const isRejected = result.status === 'REJECTED';

  // Identify which item caused the rejection
  const failedProductIdMatch = result.reason?.match(/P\d+/);
  const failedProductId = failedProductIdMatch ? failedProductIdMatch[0] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Close X in top right */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/20 hover:bg-black/30 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header decoration */}
        <div
          className={`p-6 sm:p-7 text-center text-white relative overflow-hidden ${
            isSuccess
              ? 'bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700'
              : 'bg-gradient-to-br from-rose-600 via-red-600 to-rose-700'
          }`}
        >
          {/* Subtle background glow */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-black/10 rounded-full blur-2xl pointer-events-none" />

          {/* Status Icon */}
          <div className="relative z-10 w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md mx-auto flex items-center justify-center mb-3 shadow-inner border border-white/20">
            {isSuccess ? (
              <CheckCircle2 className="w-10 h-10 text-white" />
            ) : (
              <ShieldAlert className="w-10 h-10 text-white" />
            )}
          </div>

          <div className="relative z-10">
            <span className="inline-block text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-black/25 text-white/90 mb-2 border border-white/15">
              {isSuccess ? 'HTTP 200 OK • Atomic Confirmation' : 'HTTP 400 Bad Request • All-or-Nothing Rollback'}
            </span>

            <h3 className="text-2xl font-black tracking-tight">
              {isSuccess ? 'Multi-Item Order Confirmed!' : 'All-or-Nothing Rollback Triggered'}
            </h3>

            <p className="text-xs text-white/90 mt-1.5 max-w-md mx-auto leading-relaxed">
              {isSuccess
                ? 'All requested line items passed stock validation and were reserved in a single in-process atomic transaction.'
                : 'Stock validation failed for one or more items. The active database transaction rolled back, ensuring ZERO units of any item were deducted.'}
            </p>
          </div>
        </div>

        {/* Body content */}
        <div className="p-6 sm:p-7 space-y-4">
          {/* Status Details Box */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Order Identifier</span>
              <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                #{result.orderId > 0 ? result.orderId : 'N/A'}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs py-2.5 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Transaction Result</span>
              <span
                className={`font-black uppercase tracking-wide text-xs px-2.5 py-0.5 rounded-md ${
                  isSuccess
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-100 text-rose-800 border border-rose-200'
                }`}
              >
                {result.status}
              </span>
            </div>

            {/* Architecture Explanations */}
            {isSuccess ? (
              <div className="pt-3 text-xs space-y-2">
                <div className="flex items-start gap-2 text-emerald-800 bg-emerald-50/70 p-3 rounded-xl border border-emerald-100">
                  <PackageCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-semibold">In-Process Monolith Execution:</strong>
                    <span>
                      Sequential <code className="font-mono bg-emerald-100/70 px-1 rounded">InventoryService.reserve()</code> calls completed within Spring's <code className="font-mono bg-emerald-100/70 px-1 rounded">@Transactional</code> scope. Stock was decremented and <code className="font-mono bg-emerald-100/70 px-1 rounded">OrderPlacedEvent</code> was dispatched.
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="pt-3 space-y-2.5">
                {/* Reason banner */}
                {result.reason && (
                  <div className="flex items-start gap-2 bg-rose-50 text-rose-800 p-3 rounded-xl border border-rose-200 text-xs">
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-bold block">Validation Failure:</strong>
                      <span>{result.reason}</span>
                    </div>
                  </div>
                )}

                {/* Educational Guarantee Banner */}
                <div className="flex items-start gap-2 bg-amber-50/80 text-amber-900 p-3 rounded-xl border border-amber-200 text-xs">
                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold block">Atomic Guarantee Verified:</strong>
                    <span>
                      Before reserving any item, <code className="font-mono bg-amber-100 px-1 rounded">OrderService</code> checked available stock. Because an item lacked sufficient stock, zero stock was deducted from ANY product in your database.
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Outcome Line Items List */}
          {result.items && result.items.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Processed Line Items ({result.items.length}):
              </h4>
              <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                {result.items.map((item, idx) => {
                  const meta = getProductMeta(item.productId);
                  const isFailedItem = failedProductId === item.productId || (isRejected && item.outcome === 'REJECTED');

                  return (
                    <div
                      key={idx}
                      className={`flex items-center justify-between text-xs p-3 rounded-xl border shadow-xs transition-colors ${
                        isSuccess
                          ? 'bg-white border-emerald-100'
                          : isFailedItem && failedProductId === item.productId
                          ? 'bg-rose-50/70 border-rose-200'
                          : 'bg-slate-50/70 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={meta.imageUrl}
                          alt={meta.name}
                          className="w-10 h-10 object-cover rounded-lg border border-slate-200 shrink-0 bg-white"
                        />
                        <div className="truncate">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                              {item.productId}
                            </span>
                            <span className="font-bold text-slate-800 truncate">
                              {meta.name}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500">
                            Requested: {item.quantity} {item.quantity === 1 ? 'unit' : 'units'}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        {isSuccess ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <Check className="w-3 h-3" />
                            Reserved
                          </span>
                        ) : failedProductId === item.productId ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                            <X className="w-3 h-3" />
                            0 Available (Caused Rejection)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            Rollback Protected (0 Deducted)
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-colors"
            >
              {isSuccess ? 'Continue Shopping' : 'Adjust Cart Items'}
            </button>

            <button
              onClick={() => {
                onClose();
                onViewOrders();
              }}
              className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-1.5 transition-colors ${
                isSuccess
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-100'
                  : 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-200'
              }`}
            >
              <span>View in Order History</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
