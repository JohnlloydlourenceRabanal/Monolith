import React, { useState, useEffect, useCallback } from 'react';
import { ShoppingCart, CheckCircle2, XCircle, Database, Layers, Radio, RefreshCw, Send, AlertTriangle } from 'lucide-react';
import { api } from './services/api';
import { InventoryItem, OrderResponse } from './types';

export const App: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('P100');
  const [quantity, setQuantity] = useState<number>(2);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [backendOnline, setBackendOnline] = useState<boolean>(false);

  // Result state
  const [orderResult, setOrderResult] = useState<OrderResponse | null>(null);

  const loadInventory = useCallback(async () => {
    try {
      setLoading(true);
      const isOnline = await api.checkHealth();
      setBackendOnline(isOnline);
      if (isOnline) {
        const items = await api.getInventory();
        setInventory(items);
        if (items.length > 0 && !items.some(i => i.productId === selectedProductId)) {
          setSelectedProductId(items[0].productId);
        }
      }
    } catch (err) {
      setBackendOnline(false);
      console.error('Failed to load inventory:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedProductId]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || quantity <= 0) return;

    setSubmitting(true);
    try {
      const { response } = await api.placeOrder({
        productId: selectedProductId,
        quantity,
      });

      setOrderResult(response);

      // Refresh inventory stock
      await loadInventory();
    } catch (err: any) {
      console.error('Order error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedItem = inventory.find((i) => i.productId === selectedProductId);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="bg-slate-900/90 border-b border-slate-800 sticky top-0 z-40 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-600/30">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white flex items-center gap-2">
                In-Process Monolith: Order &amp; Inventory
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                  edu.cit.rabanal
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Package-Private Boundary &bull; Supabase Postgres &bull; REST Client
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium ${
              backendOnline
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}>
              <Radio className={`w-3 h-3 ${backendOnline ? 'animate-pulse' : ''}`} />
              <span>{backendOnline ? 'Spring Boot (:8080) Online' : 'Backend Offline'}</span>
            </div>

            <button
              onClick={loadInventory}
              disabled={loading}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition"
              title="Refresh Inventory"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* 2-Column Clean Layout: Left Order Form, Right Order Result & Inventory */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Order Form */}
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-indigo-400" />
                  Place Order Form
                </h2>
                <span className="text-[11px] font-mono text-slate-400">POST /api/orders</span>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Product Dropdown */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Product Selection
                  </label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 font-medium"
                    required
                  >
                    {inventory.map((item) => (
                      <option key={item.productId} value={item.productId}>
                        {item.productId} &mdash; {item.name} ({item.stock} in stock)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity Input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      Order Quantity
                    </label>
                    {selectedItem && (
                      <span className={`text-xs font-mono font-bold ${
                        selectedItem.stock === 0
                          ? 'text-rose-400'
                          : selectedItem.stock < 5
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}>
                        Stock: {selectedItem.stock}
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    min="1"
                    max="999"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                    required
                  />
                  <div className="flex gap-2 mt-2">
                    {[1, 2, 5, 10, 15].map((qty) => (
                      <button
                        key={qty}
                        type="button"
                        onClick={() => setQuantity(qty)}
                        className={`px-2.5 py-1 text-xs rounded-lg border transition font-mono ${
                          quantity === qty
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {qty}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Testing Preset Buttons */}
                <div className="pt-2 border-t border-slate-800 space-y-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                    Quick Scenario Presets:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => { setSelectedProductId('P100'); setQuantity(2); }}
                      className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-xs text-emerald-300 text-left transition"
                    >
                      <strong className="block">Confirmed Path</strong>
                      <span className="text-[10px] text-emerald-400/80">P100 (qty 2) &rarr; Success</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setSelectedProductId('P300'); setQuantity(1); }}
                      className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg text-xs text-rose-300 text-left transition"
                    >
                      <strong className="block">Rejected Path</strong>
                      <span className="text-[10px] text-rose-400/80">P300 (qty 1) &rarr; Stock 0</span>
                    </button>
                  </div>
                </div>

                {/* Submit Action */}
                <button
                  type="submit"
                  disabled={submitting || !backendOnline}
                  className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <span>Processing In-Process Call...</span>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Submit Order ({quantity}x {selectedProductId})</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Order Execution Result & Live Database Inventory Table */}
          <div className="lg:col-span-6 space-y-6">
            {/* Prominent Result Area */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h2 className="text-base font-bold text-white border-b border-slate-800 pb-3">
                Order Execution Result
              </h2>

              {!orderResult ? (
                <div className="py-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                  No orders placed yet in this session. Submit the form to see the live response status.
                </div>
              ) : (
                <div className={`p-4 rounded-xl border space-y-3 ${
                  orderResult.status === 'CONFIRMED'
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200'
                    : 'bg-rose-500/10 border-rose-500/40 text-rose-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {orderResult.status === 'CONFIRMED' ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                      ) : (
                        <XCircle className="w-6 h-6 text-rose-400" />
                      )}
                      <div>
                        <span className="text-xs uppercase tracking-wider font-bold block text-slate-400">
                          Transaction Status
                        </span>
                        <span className={`text-lg font-black tracking-wide ${
                          orderResult.status === 'CONFIRMED' ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {orderResult.status}
                        </span>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 rounded bg-slate-900/80 font-mono text-xs border border-slate-800 text-slate-300">
                      HTTP {orderResult.status === 'CONFIRMED' ? '200 OK' : '409 CONFLICT'}
                    </span>
                  </div>

                  {orderResult.reason && (
                    <div className="pt-2 border-t border-rose-500/20 text-xs flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong className="block text-rose-300">Rejection Reason:</strong>
                        <span className="text-rose-200">{orderResult.reason}</span>
                      </div>
                    </div>
                  )}

                  {orderResult.inventory && (
                    <div className="pt-2 border-t border-slate-800/60 text-xs space-y-1">
                      <div className="text-slate-400 font-semibold">Updated Inventory State:</div>
                      <div className="flex items-center justify-between bg-slate-900/60 p-2.5 rounded-lg font-mono">
                        <span>{orderResult.inventory.productId} &bull; {orderResult.inventory.name}</span>
                        <strong className="text-white">Stock: {orderResult.inventory.stock}</strong>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Current Inventory Snapshot Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                <Database className="w-4 h-4 text-emerald-400" />
                Live Supabase Database: `inventory` Table
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {inventory.map((item) => (
                  <div
                    key={item.productId}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1 hover:border-slate-700 transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-indigo-400">{item.productId}</span>
                      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                        item.stock === 0
                          ? 'bg-rose-500/20 text-rose-400'
                          : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {item.stock} left
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-white truncate">{item.name}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-800 bg-slate-900 py-4 text-center text-xs text-slate-500">
        In-Process Monolith &bull; edu.cit.rabanal.shop &amp; edu.cit.rabanal.inventory &bull; Supabase Postgres &bull; React
      </footer>
    </div>
  );
};
