import React from 'react';
import { ClipboardList, CheckCircle, Clock } from 'lucide-react';
import { Order } from '../types';

interface OrderListProps {
  orders: Order[];
  loading: boolean;
}

export const OrderList: React.FC<OrderListProps> = ({ orders, loading }) => {
  return (
    <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-5">
      <div className="flex items-center justify-between border-b border-slate-700/60 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-indigo-400" />
            Order History &bull; Committed Transactions
          </h2>
          <p className="text-xs text-slate-400">
            Stored in PostgreSQL (<code className="text-indigo-300">orders</code> &amp; <code className="text-indigo-300">order_items</code>). Fetched via REST.
          </p>
        </div>
        <span className="text-xs px-2.5 py-1 bg-slate-700/80 rounded-lg text-slate-300 border border-slate-600 font-mono">
          {orders.length} Placed
        </span>
      </div>

      {loading && orders.length === 0 ? (
        <div className="p-8 text-center text-slate-400 text-sm">Loading order records...</div>
      ) : orders.length === 0 ? (
        <div className="p-8 text-center text-slate-500 text-sm border border-dashed border-slate-700 rounded-xl">
          No orders placed yet. Use the Order form to create your first in-process transaction!
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-slate-900/80 border border-slate-700/60 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-500 transition"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                    #{order.id}
                  </span>
                  <span className="text-xs font-medium text-slate-300">
                    {order.customerEmail}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    <CheckCircle className="w-3 h-3" />
                    {order.status}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  {order.items.map((item, idx) => (
                    <span
                      key={idx}
                      className="bg-slate-800/80 px-2 py-0.5 rounded text-[11px] text-slate-300 border border-slate-700/60"
                    >
                      <strong className="text-indigo-300">{item.quantity}x</strong> {item.sku} (${item.unitPrice.toFixed(2)})
                    </span>
                  ))}
                </div>

                {order.integrationStyleSummary && (
                  <p className="text-[10px] text-slate-500 font-mono">
                    {order.integrationStyleSummary}
                  </p>
                )}
              </div>

              <div className="flex md:flex-col items-end justify-between md:justify-center border-t md:border-t-0 pt-2 md:pt-0 border-slate-800">
                <span className="text-base font-black text-emerald-400 font-mono">
                  ${order.totalAmount.toFixed(2)}
                </span>
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-500" />
                  {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
