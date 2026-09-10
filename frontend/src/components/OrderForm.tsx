import React, { useState } from 'react';
import { ShoppingCart, Send, Info, AlertCircle } from 'lucide-react';
import { Product } from '../types';

interface OrderFormProps {
  products: Product[];
  onSubmitOrder: (email: string, sku: string, quantity: number) => Promise<void>;
  submitting: boolean;
}

export const OrderForm: React.FC<OrderFormProps> = ({ products, onSubmitOrder, submitting }) => {
  const [email, setEmail] = useState('developer@example.com');
  const [selectedSku, setSelectedSku] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [formError, setFormError] = useState<string | null>(null);

  // Auto-select first available product
  React.useEffect(() => {
    if (!selectedSku && products.length > 0) {
      setSelectedSku(products[0].sku);
    }
  }, [products, selectedSku]);

  const selectedProduct = products.find((p) => p.sku === selectedSku);
  const total = (selectedProduct?.price || 0) * quantity;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedSku) {
      setFormError('Please select a product');
      return;
    }

    try {
      await onSubmitOrder(email, selectedSku, quantity);
      // Reset to 1 quantity on success
      setQuantity(1);
    } catch (err: any) {
      setFormError(err.message || 'Failed to place order');
    }
  };

  return (
    <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-5">
      <div className="border-b border-slate-700/60 pb-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-indigo-400" />
          Order Module &bull; Place New Order
        </h2>
        <p className="text-xs text-slate-400">
          Submits to <code className="text-indigo-300">OrderController</code> &rarr; calls <code className="text-indigo-300">InventoryModuleApi</code> in-process &rarr; commits to Supabase.
        </p>
      </div>

      {formError && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block">Order Failed:</span>
            <span>{formError}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Customer Email */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Customer Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900/80 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500 font-mono text-xs"
            placeholder="alice@company.com"
            required
          />
        </div>

        {/* Product Selector */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Select Product
          </label>
          <select
            value={selectedSku}
            onChange={(e) => setSelectedSku(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900/80 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
            required
          >
            {products.map((p) => (
              <option key={p.sku} value={p.sku}>
                {p.name} ({p.sku}) &mdash; ${p.price.toFixed(2)} &bull; {p.availableQuantity} in stock
              </option>
            ))}
          </select>
        </div>

        {/* Quantity and Pricing preview */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Quantity
            </label>
            <input
              type="number"
              min="1"
              max="999"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-3 py-2 bg-slate-900/80 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
              required
            />
            {selectedProduct && (
              <span className="text-[11px] text-slate-400 mt-1 block">
                Available in inventory: <strong className="text-white">{selectedProduct.availableQuantity}</strong>
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Calculated Total
            </label>
            <div className="px-3 py-2 bg-slate-900/80 border border-slate-700 rounded-lg text-sm font-bold text-emerald-400 font-mono flex items-center h-[38px]">
              ${total.toFixed(2)}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Unit: ${selectedProduct?.price.toFixed(2) || '0.00'}
            </span>
          </div>
        </div>

        {/* Informational Callout */}
        <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs text-indigo-300 flex items-center gap-2">
          <Info className="w-4 h-4 flex-shrink-0" />
          <span>
            Placing an order triggers an <strong>atomic in-process check</strong> against the Inventory module with pessimistic row locking.
          </span>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting || products.length === 0}
          className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <span>Processing In-Process Transaction...</span>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Submit Order (${total.toFixed(2)})</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
