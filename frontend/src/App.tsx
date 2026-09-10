import React, { useState, useEffect, useCallback } from 'react';
import { ShoppingBag, CheckCircle2, AlertCircle, Package, ArrowRight } from 'lucide-react';
import { api } from './services/api';
import { InventoryItem, OrderResponse } from './types';

export const App: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('P100');
  const [quantity, setQuantity] = useState<number>(1);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [restocking, setRestocking] = useState<boolean>(false);

  // Result state
  const [orderResult, setOrderResult] = useState<OrderResponse | null>(null);

  const loadInventory = useCallback(async () => {
    try {
      const items = await api.getInventory();
      setInventory(items);
      if (items.length > 0 && !items.some((i) => i.productId === selectedProductId)) {
        setSelectedProductId(items[0].productId);
      }
    } catch (err) {
      console.error('Failed to load inventory:', err);
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
      await loadInventory();
    } catch (err: any) {
      console.error('Order error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRestockAll = async () => {
    setRestocking(true);
    try {
      const items = await api.restockAll();
      setInventory(items);
    } catch (err) {
      console.error('Failed to restock:', err);
    } finally {
      setRestocking(false);
    }
  };

  const selectedItem = inventory.find((i) => i.productId === selectedProductId);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased selection:bg-indigo-100 selection:text-indigo-900">
      {/* Top Header */}
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur sticky top-0 z-30 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-900 tracking-tight">
                Order &amp; Inventory System
              </h1>
              <p className="text-xs text-slate-500">
                In-process modular monolith
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-10 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Order Placement Form */}
          <div className="md:col-span-6">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 tracking-tight">
                  Place Order
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Select a product and enter the desired quantity.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Product Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700">
                    Product
                  </label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-600/10 transition font-medium"
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
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-700">
                      Quantity
                    </label>
                    {selectedItem && (
                      <span className={`text-xs font-mono font-medium ${
                        selectedItem.stock === 0
                          ? 'text-rose-600'
                          : selectedItem.stock < 5
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                      }`}>
                        Available: {selectedItem.stock}
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    min="1"
                    max="999"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-600/10 font-mono transition"
                    required
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium rounded-xl text-sm transition shadow-sm hover:shadow flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <span>Processing...</span>
                  ) : (
                    <>
                      <span>Submit Order</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Execution Result & Stock List */}
          <div className="md:col-span-6 space-y-6">
            {/* Order Result Card */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
              <h2 className="text-base font-semibold text-slate-900 tracking-tight">
                Order Result
              </h2>

              {!orderResult ? (
                <div className="py-10 text-center text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  Submit an order to view the status result here.
                </div>
              ) : (
                <div className={`p-4 rounded-xl border space-y-3 ${
                  orderResult.status === 'CONFIRMED'
                    ? 'bg-emerald-50/70 border-emerald-200'
                    : 'bg-rose-50/70 border-rose-200'
                }`}>
                  <div className="flex items-center gap-3">
                    {orderResult.status === 'CONFIRMED' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                    )}
                    <div>
                      <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 block">
                        Status
                      </span>
                      <span className={`text-base font-bold tracking-wide ${
                        orderResult.status === 'CONFIRMED' ? 'text-emerald-700' : 'text-rose-700'
                      }`}>
                        {orderResult.status}
                      </span>
                    </div>
                  </div>

                  {orderResult.reason && (
                    <div className="pt-2 border-t border-rose-200/70 text-xs text-rose-800">
                      <strong className="font-semibold">Reason:</strong> {orderResult.reason}
                    </div>
                  )}

                  {orderResult.inventory && (
                    <div className="pt-2 border-t border-slate-200/70 text-xs space-y-1">
                      <div className="text-slate-500 font-medium">Updated Inventory:</div>
                      <div className="flex items-center justify-between font-mono bg-white px-3 py-2 rounded-lg border border-slate-200 text-slate-800 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                        <span>{orderResult.inventory.productId} &bull; {orderResult.inventory.name}</span>
                        <strong className="text-slate-900">Stock: {orderResult.inventory.stock}</strong>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Current Inventory Stock Cards */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-indigo-600" />
                  <h2 className="text-base font-semibold text-slate-900 tracking-tight">
                    Current Stock
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={handleRestockAll}
                  disabled={restocking}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100/80 px-2.5 py-1 rounded-lg border border-indigo-200 transition disabled:opacity-50"
                >
                  {restocking ? 'Restocking...' : 'Restock All'}
                </button>
              </div>

              <div className="space-y-2.5">
                {inventory.map((item) => (
                  <div
                    key={item.productId}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-sm"
                  >
                    <div>
                      <span className="font-mono text-xs font-semibold text-indigo-600 mr-2">
                        {item.productId}
                      </span>
                      <span className="text-slate-800 font-medium">{item.name}</span>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-medium ${
                      item.stock === 0
                        ? 'bg-rose-100 text-rose-700 border border-rose-200'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}>
                      {item.stock} left
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
