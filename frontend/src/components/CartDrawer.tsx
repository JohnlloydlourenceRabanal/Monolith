import React from 'react';
import {
  X,
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { CartItem, InventoryItem } from '../types';
import { getProductMeta } from '../data/productData';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  inventory: InventoryItem[];
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onSubmitOrder: () => void;
  isSubmitting: boolean;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  inventory,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onSubmitOrder,
  isSubmitting,
}) => {
  if (!isOpen) return null;

  const totalUnits = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop overlay */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between">
          {/* Header */}
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 leading-tight">
                  Your Order Cart
                </h3>
                <p className="text-xs text-slate-500">
                  {cart.length} {cart.length === 1 ? 'line item' : 'line items'} ({totalUnits} units total)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {cart.length > 0 && (
                <button
                  onClick={onClearCart}
                  className="text-xs text-rose-600 hover:text-rose-700 font-medium px-2 py-1 rounded hover:bg-rose-50 transition-colors"
                >
                  Clear Cart
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-5 divide-y divide-slate-100">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h4 className="text-sm font-semibold text-slate-800">Your cart is empty</h4>
                <p className="text-xs text-slate-500 max-w-[220px] mt-1">
                  Add products from the catalog to build a multi-item order.
                </p>
                <button
                  onClick={onClose}
                  className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
                >
                  Browse Products
                </button>
              </div>
            ) : (
              cart.map((item) => {
                const meta = getProductMeta(item.productId, item.name);
                const liveItem = inventory.find((i) => i.productId === item.productId);
                const liveStock = liveItem ? liveItem.stock : item.stock;
                const isOverStock = item.quantity > liveStock;

                return (
                  <div key={item.productId} className="py-4 first:pt-0 last:pb-0 flex gap-3">
                    <img
                      src={meta.imageUrl}
                      alt={item.name}
                      className="w-16 h-16 object-cover rounded-xl border border-slate-100 shrink-0 bg-slate-50"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <div>
                          <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                            {item.productId}
                          </span>
                          <h4 className="text-sm font-bold text-slate-900 mt-1 truncate">
                            {item.name}
                          </h4>
                          <span className="text-xs text-slate-500">
                            Available: {liveStock} units
                          </span>
                        </div>

                        <button
                          onClick={() => onRemoveItem(item.productId)}
                          className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Over-stock warning badge */}
                      {isOverStock && (
                        <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          <span>Only {liveStock} available in inventory!</span>
                        </div>
                      )}

                      {/* Quantity Controls */}
                      <div className="flex items-center justify-between mt-2 pt-1">
                        <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(item.productId, -1)}
                            className="p-1 hover:bg-slate-200 text-slate-600 transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-8 text-center text-xs font-bold text-slate-800 font-mono">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(item.productId, 1)}
                            className="p-1 hover:bg-slate-200 text-slate-600 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <span className="text-xs font-mono font-bold text-slate-700">
                          {item.quantity} {item.quantity === 1 ? 'unit' : 'units'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer & Submit Multi-Item Order */}
          {cart.length > 0 && (
            <div className="p-5 border-t border-slate-200 bg-slate-50/60">
              {/* Order Summary */}
              <div className="space-y-1.5 text-xs text-slate-600 mb-3">
                <div className="flex justify-between">
                  <span>Distinct Line Items</span>
                  <span className="font-bold text-slate-900">{cart.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Ordered Units</span>
                  <span className="font-bold text-slate-900">{totalUnits} units</span>
                </div>
              </div>

              {/* Atomic Guarantee Note */}
              <div className="bg-white p-2.5 rounded-xl border border-indigo-100 flex items-start gap-2 text-[11px] text-slate-600 shadow-sm mb-3">
                <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-slate-800">All-or-Nothing Guarantee:</strong> All items are
                  validated atomically. If any item has insufficient stock, the entire order rolls back and 0 units are deducted.
                </span>
              </div>

              {/* Submit Button */}
              <button
                type="button"
                onClick={onSubmitOrder}
                disabled={isSubmitting || cart.length === 0}
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold text-sm shadow-md shadow-indigo-100 flex items-center justify-center gap-2 transition-all active:scale-98"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Validating &amp; Reserving Stock...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Multi-Item Order ({totalUnits} {totalUnits === 1 ? 'unit' : 'units'})</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
