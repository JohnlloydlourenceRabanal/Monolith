import React, { useState } from 'react';
import {
  X,
  Star,
  CheckCircle2,
  AlertTriangle,
  ShoppingBag,
  Plus,
  Minus,
  Truck,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { ProductMetadata, ProductIcon } from '../data/productData';

interface ProductDetailModalProps {
  meta: ProductMetadata | null;
  stock: number;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (productId: string, quantity: number) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  meta,
  stock,
  isOpen,
  onClose,
  onAddToCart,
}) => {
  const [qty, setQty] = useState<number>(1);
  const [added, setAdded] = useState<boolean>(false);

  if (!isOpen || !meta) return null;

  const isOutOfStock = stock <= 0;
  const isLowStock = stock > 0 && stock < 5;

  const handleAdd = () => {
    onAddToCart(meta.productId, qty);
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-slate-500 hover:text-slate-900 flex items-center justify-center shadow-md transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Left: Product Icon Display */}
        <div className="md:w-1/2 bg-slate-50 p-8 flex flex-col justify-center items-center relative border-b md:border-b-0 md:border-r border-slate-100">
          <div className="w-28 h-28 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm mb-4">
            <ProductIcon productId={meta.productId} className="w-14 h-14" />
          </div>
          <span className="font-mono font-bold text-sm text-slate-700 bg-white px-3 py-1 rounded-xl border border-slate-200 shadow-xs">
            SKU: {meta.productId}
          </span>
          <div className="mt-6 flex flex-wrap justify-center items-center gap-3 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-indigo-600" /> Monolith Speed
            </span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" /> Atomic Rollback
            </span>
            <span className="flex items-center gap-1">
              <RotateCcw className="w-3.5 h-3.5 text-indigo-600" /> Restock
            </span>
          </div>
        </div>

        {/* Right: Info & Controls */}
        <div className="md:w-1/2 p-6 overflow-y-auto flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                {meta.category}
              </span>
              <span className="text-xs font-mono text-slate-400">SKU: {meta.productId}</span>
            </div>

            <h2 className="text-2xl font-bold text-slate-900 leading-tight">
              {meta.name}
            </h2>

            {/* Ratings & Reviews */}
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center text-amber-500">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < Math.floor(meta.rating) ? 'fill-current' : 'text-slate-200'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs font-semibold text-slate-700">
                {meta.rating.toFixed(1)}
              </span>
              <span className="text-xs text-slate-400">
                ({meta.reviewsCount} reviews)
              </span>
            </div>

            {/* Stock status */}
            <div className="mt-4">
              {isOutOfStock ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200">
                  Currently Out of Stock
                </span>
              ) : isLowStock ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Low Stock: Only {stock} units remaining!
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {stock} units in inventory
                </span>
              )}
            </div>

            <p className="mt-3 text-xs text-slate-600 leading-relaxed">
              {meta.description}
            </p>

            {/* Technical Specifications */}
            <div className="mt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2">
                Technical Highlights:
              </h4>
              <ul className="space-y-1 text-xs text-slate-600">
                {meta.specs.map((spec, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                    <span>{spec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Stepper & Add to Cart */}
          <div className="mt-6 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-3">
              <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setQty((prev) => Math.max(1, prev - 1))}
                  disabled={qty <= 1}
                  className="p-2 hover:bg-slate-200 text-slate-600 disabled:opacity-40"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-10 text-center text-sm font-bold text-slate-800 font-mono">
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={() => setQty((prev) => (!isOutOfStock && stock > 0 ? Math.min(stock, prev + 1) : prev + 1))}
                  className="p-2 hover:bg-slate-200 text-slate-600"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleAdd}
                className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all ${
                  added
                    ? 'bg-emerald-600 text-white shadow-emerald-200'
                    : isOutOfStock
                    ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-100 active:scale-95'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100 active:scale-95'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>
                  {added
                    ? 'Added to Cart!'
                    : isOutOfStock
                    ? `Add ${qty} to Cart (Test Rollback)`
                    : `Add ${qty} to Cart`}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
