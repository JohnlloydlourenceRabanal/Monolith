import React, { useState } from 'react';
import { Package, PlusCircle, AlertTriangle, CheckCircle } from 'lucide-react';
import { Product } from '../types';

interface InventoryManagerProps {
  products: Product[];
  onRestock: (sku: string, amount: number) => Promise<void>;
  loading: boolean;
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({ products, onRestock, loading }) => {
  const [selectedSku, setSelectedSku] = useState<string | null>(null);
  const [restockAmount, setRestockAmount] = useState<number>(10);
  const [submitting, setSubmitting] = useState(false);

  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSku || restockAmount <= 0) return;
    try {
      setSubmitting(true);
      await onRestock(selectedSku, restockAmount);
      setSelectedSku(null);
      setRestockAmount(10);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-700/60 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-400" />
            Inventory Module &bull; Real-Time Stock
          </h2>
          <p className="text-xs text-slate-400">
            Managed by the Inventory bounded context. Queried via REST and reserved in-process by the Order module.
          </p>
        </div>
        <span className="text-xs px-2.5 py-1 bg-slate-700/80 rounded-lg text-slate-300 border border-slate-600 font-mono">
          {products.length} Products
        </span>
      </div>

      {loading && products.length === 0 ? (
        <div className="p-8 text-center text-slate-400 text-sm">Loading inventory from backend...</div>
      ) : products.length === 0 ? (
        <div className="p-8 text-center text-slate-500 text-sm border border-dashed border-slate-700 rounded-xl">
          No products in database yet. Please ensure the backend is running.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p) => {
            const isOutOfStock = p.availableQuantity === 0;
            const isLowStock = p.availableQuantity > 0 && p.availableQuantity <= 5;

            return (
              <div
                key={p.sku}
                className="bg-slate-900/80 border border-slate-700/60 rounded-xl p-4 flex flex-col justify-between hover:border-slate-500 transition group shadow-md"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700">
                        {p.sku}
                      </span>
                      <h3 className="font-bold text-sm text-white mt-1.5 line-clamp-1">{p.name}</h3>
                    </div>
                    <span className="text-sm font-extrabold text-emerald-400 font-mono">
                      ${p.price.toFixed(2)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2">{p.description}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-3">
                  {/* Stock Status Badges */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      {isOutOfStock ? (
                        <span className="flex items-center gap-1 text-rose-400 font-semibold">
                          <AlertTriangle className="w-3.5 h-3.5" /> Out of stock
                        </span>
                      ) : isLowStock ? (
                        <span className="flex items-center gap-1 text-amber-400 font-semibold">
                          <AlertTriangle className="w-3.5 h-3.5" /> Low stock
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-emerald-400 font-medium">
                          <CheckCircle className="w-3.5 h-3.5" /> In stock
                        </span>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-bold text-white font-mono">{p.availableQuantity}</span>
                      <span className="text-[11px] text-slate-400 ml-1">available</span>
                      {p.reservedQuantity > 0 && (
                        <span className="text-[10px] text-violet-400 block font-mono">
                          ({p.reservedQuantity} reserved)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Restock Button */}
                  <button
                    onClick={() => setSelectedSku(p.sku)}
                    className="w-full py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-xs font-medium text-slate-200 flex items-center justify-center gap-1.5 transition"
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-indigo-400" />
                    Restock
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Restock Modal */}
      {selectedSku && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div>
              <h3 className="text-base font-bold text-white">Restock Inventory</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Increase stock for product SKU: <span className="font-mono text-indigo-300">{selectedSku}</span>
              </p>
            </div>

            <form onSubmit={handleRestockSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Restock Amount (units)
                </label>
                <div className="flex gap-2 mb-2">
                  {[5, 10, 25, 50].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setRestockAmount(amt)}
                      className={`px-3 py-1 text-xs rounded-lg border transition ${
                        restockAmount === amt
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                      }`}
                    >
                      +{amt}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={restockAmount}
                  onChange={(e) => setRestockAmount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedSku(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition shadow disabled:opacity-50"
                >
                  {submitting ? 'Updating DB...' : 'Confirm Restock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
