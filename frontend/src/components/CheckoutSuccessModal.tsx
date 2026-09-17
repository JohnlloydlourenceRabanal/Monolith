import React from 'react';
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header decoration */}
        <div
          className={`p-6 text-center text-white ${
            isSuccess ? 'bg-gradient-to-br from-emerald-600 to-teal-700' : 'bg-gradient-to-br from-rose-600 to-red-700'
          }`}
        >
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md mx-auto flex items-center justify-center mb-3 text-white shadow-inner">
            {isSuccess ? (
              <CheckCircle2 className="w-10 h-10 text-white" />
            ) : (
              <XCircle className="w-10 h-10 text-white" />
            )}
          </div>

          <h3 className="text-xl font-extrabold tracking-tight">
            {isSuccess ? 'Multi-Item Order Confirmed!' : 'Order Validation Rejected'}
          </h3>

          <p className="text-xs text-white/90 mt-1 max-w-sm mx-auto">
            {isSuccess
              ? 'All items passed validation and inventory stock was reserved in a single atomic transaction.'
              : 'All-or-Nothing Atomic Guarantee triggered. No stock was deducted from any product.'}
          </p>
        </div>

        {/* Body content */}
        <div className="p-6">
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-4">
            <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-200">
              <span className="text-slate-500">Order Reference</span>
              <span className="font-mono font-bold text-slate-800">
                #{result.orderId > 0 ? result.orderId : 'N/A'}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs py-2 border-b border-slate-200">
              <span className="text-slate-500">Transaction Status</span>
              <span
                className={`font-bold uppercase ${
                  isSuccess ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {result.status}
              </span>
            </div>

            {result.reason && (
              <div className="pt-2 text-xs text-rose-700 bg-rose-50/70 p-2.5 rounded-xl mt-2 border border-rose-100">
                <strong>Reason:</strong> {result.reason}
              </div>
            )}
          </div>

          {/* Outcome Items List */}
          {result.items && result.items.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Processed Line Items:
              </h4>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {result.items.map((item, idx) => {
                  const meta = getProductMeta(item.productId);
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs p-2 rounded-xl bg-white border border-slate-100 shadow-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-mono font-bold text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                          {item.productId}
                        </span>
                        <span className="font-semibold text-slate-800 truncate">
                          {meta.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono font-medium text-slate-600">
                          Qty: {item.quantity}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            item.outcome === 'CONFIRMED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {item.outcome}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-colors"
            >
              Continue Browsing
            </button>

            <button
              onClick={() => {
                onClose();
                onViewOrders();
              }}
              className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-100 flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>View in Orders</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
