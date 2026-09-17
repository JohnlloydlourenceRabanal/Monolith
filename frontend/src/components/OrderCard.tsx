import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  RotateCcw,
  Clock,
  AlertCircle,
  Repeat,
  ShieldCheck,
  Check,
  X,
  PackageCheck,
} from 'lucide-react';
import { OrderRecord } from '../types';
import { getProductMeta } from '../data/productData';

interface OrderCardProps {
  order: OrderRecord;
  onCancelOrder: (orderId: number) => void;
  isCancelling: boolean;
  onReorder: (items: { productId: string; quantity: number }[]) => void;
}

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  onCancelOrder,
  isCancelling,
  onReorder,
}) => {
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);

  // Format date and relative time
  const orderDate = new Date(order.createdAt);
  const formattedDate = isNaN(orderDate.getTime())
    ? order.createdAt
    : orderDate.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

  const isConfirmed = order.status === 'CONFIRMED';
  const isCancelled = order.status === 'CANCELLED';
  const isRejected = order.status === 'REJECTED';

  // Identify failed product SKU if rejected
  const failedSkuMatch = order.reason?.match(/P\d+/);
  const failedSku = failedSkuMatch ? failedSkuMatch[0] : null;

  const getStatusBadge = () => {
    if (isConfirmed) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          CONFIRMED
        </span>
      );
    }
    if (isCancelled) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 shadow-xs">
          <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
          CANCELLED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 shadow-xs">
        <XCircle className="w-3.5 h-3.5 text-rose-600" />
        REJECTED (ROLLBACK)
      </span>
    );
  };

  const totalItemsCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 overflow-hidden shadow-sm hover:shadow-md ${
        isConfirmed
          ? 'bg-white border-emerald-200 hover:border-emerald-300'
          : isRejected
          ? 'bg-white border-rose-300 hover:border-rose-400'
          : 'bg-white border-amber-200 hover:border-amber-300'
      }`}
    >
      {/* Header */}
      <div
        className={`p-5 border-b flex flex-wrap items-center justify-between gap-3 ${
          isConfirmed
            ? 'bg-emerald-50/40 border-emerald-100'
            : isRejected
            ? 'bg-rose-50/50 border-rose-200'
            : 'bg-amber-50/40 border-amber-100'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono font-bold text-sm shadow-xs border ${
              isConfirmed
                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                : isRejected
                ? 'bg-rose-100 text-rose-800 border-rose-200'
                : 'bg-amber-100 text-amber-800 border-amber-200'
            }`}
          >
            #{order.orderId}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-extrabold text-slate-900">Order #{order.orderId}</h4>
              <span className="text-slate-400">•</span>
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                {formattedDate}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {totalItemsCount} {totalItemsCount === 1 ? 'unit' : 'units'} across {order.items.length} line {order.items.length === 1 ? 'item' : 'items'}
            </p>
          </div>
        </div>

        <div>{getStatusBadge()}</div>
      </div>

      {/* Visual Timeline Stepper */}
      <div className="px-5 py-3.5 bg-white border-b border-slate-100">
        <div className="flex items-center justify-between text-[11px] relative">
          {/* Connector line */}
          <div
            className={`absolute top-1/2 left-4 right-4 h-0.5 -translate-y-1/2 z-0 ${
              isConfirmed
                ? 'bg-emerald-200'
                : isRejected
                ? 'bg-rose-200'
                : 'bg-amber-200'
            }`}
          />

          {/* Step 1: Placed */}
          <div className="relative z-10 flex flex-col items-center bg-white px-2">
            <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center mb-1 text-[11px] shadow-xs">
              ✓
            </div>
            <span className="font-semibold text-slate-700">Order Placed</span>
          </div>

          {/* Step 2: Stock Validation */}
          <div className="relative z-10 flex flex-col items-center bg-white px-2">
            <div
              className={`w-6 h-6 rounded-full font-bold flex items-center justify-center mb-1 text-[11px] shadow-xs ${
                isRejected
                  ? 'bg-rose-600 text-white'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              {isRejected ? '✕' : '✓'}
            </div>
            <span
              className={`font-semibold ${
                isRejected ? 'text-rose-700 font-bold' : 'text-slate-700'
              }`}
            >
              {isRejected ? 'Stock Insufficient' : 'Stock Reserved'}
            </span>
          </div>

          {/* Step 3: Final State */}
          <div className="relative z-10 flex flex-col items-center bg-white px-2">
            <div
              className={`w-6 h-6 rounded-full font-bold flex items-center justify-center mb-1 text-[11px] shadow-xs ${
                isConfirmed
                  ? 'bg-emerald-600 text-white'
                  : isCancelled
                  ? 'bg-amber-500 text-white'
                  : 'bg-rose-600 text-white'
              }`}
            >
              {isConfirmed ? '★' : isCancelled ? '↺' : '!'}
            </div>
            <span
              className={`font-semibold ${
                isConfirmed
                  ? 'text-emerald-700 font-bold'
                  : isCancelled
                  ? 'text-amber-700 font-bold'
                  : 'text-rose-700 font-bold'
              }`}
            >
              {isConfirmed
                ? 'Confirmed & Ready'
                : isCancelled
                ? 'Cancelled & Restocked'
                : 'Atomic Rollback'}
            </span>
          </div>
        </div>
      </div>

      {/* Rejection / Explanation Banner */}
      {isRejected && (
        <div className="px-5 py-3 text-xs bg-rose-50/90 border-b border-rose-200 text-rose-900 space-y-1">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">{order.reason}</span>
              <p className="text-[11px] text-rose-700 mt-1 leading-relaxed">
                🛡️ <strong>Transactional Rollback Verified:</strong> Due to insufficient stock on product {failedSku || 'item'}, Spring's <code className="font-mono bg-rose-100 px-1 rounded">@Transactional</code> rolled back all operations. <strong>Zero units were deducted from inventory.</strong>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Banner */}
      {isCancelled && order.reason && (
        <div className="px-5 py-2.5 text-xs bg-amber-50/90 border-b border-amber-200 text-amber-900 flex items-center gap-2">
          <RotateCcw className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{order.reason}</span>
        </div>
      )}

      {/* Confirmed Info Banner */}
      {isConfirmed && (
        <div className="px-5 py-2 text-[11px] bg-emerald-50/60 border-b border-emerald-100 text-emerald-800 flex items-center gap-2">
          <PackageCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>In-Process Transaction Committed • Stock reserved &amp; Event published</span>
        </div>
      )}

      {/* Items list */}
      <div className="p-5">
        <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          Ordered Line Items:
        </h5>
        <div className="space-y-2.5">
          {order.items.map((item, idx) => {
            const meta = getProductMeta(item.productId);
            const isItemLackingStock = isRejected && (failedSku === item.productId || (order.reason && order.reason.includes(item.productId)));

            return (
              <div
                key={idx}
                className={`flex items-center justify-between text-xs p-3 rounded-xl border transition-colors ${
                  isConfirmed
                    ? 'bg-emerald-50/20 border-emerald-100'
                    : isItemLackingStock
                    ? 'bg-rose-50 border-rose-200'
                    : isRejected
                    ? 'bg-slate-50 border-slate-200'
                    : 'bg-slate-50 border-slate-100'
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
                      <span className="font-mono font-bold text-[10px] text-indigo-600 bg-indigo-50 px-1 rounded">
                        {item.productId}
                      </span>
                      <span className="font-semibold text-slate-800 truncate">
                        {meta.name}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-900 bg-white px-2.5 py-1 rounded border border-slate-200 text-xs shadow-xs">
                    x{item.quantity} {item.quantity === 1 ? 'unit' : 'units'}
                  </span>

                  {isConfirmed && (
                    <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <Check className="w-3 h-3" />
                      Reserved
                    </span>
                  )}

                  {isItemLackingStock && (
                    <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                      <X className="w-3 h-3" />
                      Lacked Stock
                    </span>
                  )}

                  {isRejected && !isItemLackingStock && (
                    <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      0 Deducted
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
          {isConfirmed ? (
            !showConfirmCancel ? (
              <button
                type="button"
                onClick={() => setShowConfirmCancel(true)}
                className="text-xs text-rose-600 hover:text-rose-700 font-bold px-3 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 transition-colors flex items-center gap-1.5"
                title="Cancel order and automatically restock all items back to inventory"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Cancel &amp; Auto-Restock</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-rose-50 p-2 rounded-xl border border-rose-200">
                <span className="text-xs text-rose-800 font-medium">Auto-restock items?</span>
                <button
                  type="button"
                  onClick={() => {
                    onCancelOrder(order.orderId);
                    setShowConfirmCancel(false);
                  }}
                  disabled={isCancelling}
                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{isCancelling ? 'Restocking...' : 'Yes, Restock Now'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmCancel(false)}
                  className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1"
                >
                  Dismiss
                </button>
              </div>
            )
          ) : (
            <span className="text-xs text-slate-400 italic">
              {isCancelled ? 'Order cancelled & restocked' : 'Transaction rolled back'}
            </span>
          )}

          {/* Reorder Button */}
          <button
            type="button"
            onClick={() =>
              onReorder(order.items.map((i) => ({ productId: i.productId, quantity: i.quantity })))
            }
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition-colors"
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>Reorder Items</span>
          </button>
        </div>
      </div>
    </div>
  );
};
