import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  RotateCcw,
  Clock,
  AlertCircle,
  Repeat,
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

  const getStatusBadge = () => {
    switch (order.status) {
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            CONFIRMED
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
            CANCELLED
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            REJECTED
          </span>
        );
    }
  };

  const totalItemsCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* Header */}
      <div className="p-5 bg-slate-50/70 border-b border-slate-200/70 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 font-mono font-bold text-sm shadow-xs">
            #{order.orderId}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-slate-900">Order #{order.orderId}</h4>
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

        <div>
          {getStatusBadge()}
        </div>
      </div>

      {/* Visual Timeline Stepper */}
      <div className="px-5 py-3.5 bg-white border-b border-slate-100">
        <div className="flex items-center justify-between text-[11px] relative">
          {/* Connector line */}
          <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-slate-100 -translate-y-1/2 z-0" />

          {/* Step 1: Placed */}
          <div className="relative z-10 flex flex-col items-center bg-white px-2">
            <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center mb-1">
              ✓
            </div>
            <span className="font-semibold text-slate-700">Order Placed</span>
          </div>

          {/* Step 2: In-Process Validation */}
          <div className="relative z-10 flex flex-col items-center bg-white px-2">
            <div
              className={`w-6 h-6 rounded-full font-bold flex items-center justify-center mb-1 ${
                order.status === 'REJECTED'
                  ? 'bg-rose-100 text-rose-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {order.status === 'REJECTED' ? '✕' : '✓'}
            </div>
            <span
              className={`font-semibold ${
                order.status === 'REJECTED' ? 'text-rose-600' : 'text-slate-700'
              }`}
            >
              {order.status === 'REJECTED' ? 'Stock Insufficient' : 'Stock Reserved'}
            </span>
          </div>

          {/* Step 3: Final State */}
          <div className="relative z-10 flex flex-col items-center bg-white px-2">
            <div
              className={`w-6 h-6 rounded-full font-bold flex items-center justify-center mb-1 ${
                order.status === 'CONFIRMED'
                  ? 'bg-emerald-600 text-white'
                  : order.status === 'CANCELLED'
                  ? 'bg-amber-500 text-white'
                  : 'bg-rose-500 text-white'
              }`}
            >
              {order.status === 'CONFIRMED' ? '★' : order.status === 'CANCELLED' ? '↺' : '!'}
            </div>
            <span
              className={`font-semibold ${
                order.status === 'CONFIRMED'
                  ? 'text-emerald-700'
                  : order.status === 'CANCELLED'
                  ? 'text-amber-700'
                  : 'text-rose-700'
              }`}
            >
              {order.status === 'CONFIRMED'
                ? 'Confirmed'
                : order.status === 'CANCELLED'
                ? 'Cancelled & Restocked'
                : 'Atomic Rollback'}
            </span>
          </div>
        </div>
      </div>

      {/* Reason / Explanation banner */}
      {order.reason && (
        <div
          className={`px-5 py-2.5 text-xs flex items-center gap-2 border-b ${
            order.status === 'CANCELLED'
              ? 'bg-amber-50/80 text-amber-800 border-amber-100'
              : 'bg-rose-50/80 text-rose-800 border-rose-100'
          }`}
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{order.reason}</span>
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
            return (
              <div
                key={idx}
                className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-100"
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

                <div className="text-right shrink-0">
                  <span className="font-mono font-bold text-slate-900 bg-white px-2.5 py-1 rounded border border-slate-200 text-xs">
                    x{item.quantity} {item.quantity === 1 ? 'unit' : 'units'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
          {order.status === 'CONFIRMED' ? (
            !showConfirmCancel ? (
              <button
                type="button"
                onClick={() => setShowConfirmCancel(true)}
                className="text-xs text-rose-600 hover:text-rose-700 font-semibold px-3 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Cancel Order</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-rose-50 p-2 rounded-xl border border-rose-200">
                <span className="text-xs text-rose-800 font-medium">Restock items?</span>
                <button
                  type="button"
                  onClick={() => {
                    onCancelOrder(order.orderId);
                    setShowConfirmCancel(false);
                  }}
                  disabled={isCancelling}
                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                >
                  {isCancelling ? 'Cancelling...' : 'Yes, Restock'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmCancel(false)}
                  className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1"
                >
                  No
                </button>
              </div>
            )
          ) : (
            <span className="text-xs text-slate-400 italic">
              {order.status === 'CANCELLED' ? 'Order cancelled & restocked' : 'Order rejected'}
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
