import React, { useState } from 'react';
import {
  ShoppingBag,
  Star,
  Check,
  AlertTriangle,
  Eye,
  Plus,
  Minus,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { InventoryItem } from '../types';
import { ProductMetadata, getProductMeta } from '../data/productData';

interface ProductCardProps {
  item: InventoryItem;
  onAddToCart: (productId: string, quantity: number) => void;
  onQuickView: (meta: ProductMetadata, stock: number) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  item,
  onAddToCart,
  onQuickView,
}) => {
  const [qty, setQty] = useState<number>(1);
  const [added, setAdded] = useState<boolean>(false);

  const meta = getProductMeta(item.productId, item.name);
  const isOutOfStock = item.stock <= 0;
  const isLowStock = item.stock > 0 && item.stock < 5;

  const handleIncrement = () => {
    if (isOutOfStock) {
      setQty((prev) => prev + 1);
    } else if (qty < item.stock) {
      setQty((prev) => prev + 1);
    }
  };

  const handleDecrement = () => {
    if (qty > 1) {
      setQty((prev) => prev - 1);
    }
  };

  const handleAdd = () => {
    onAddToCart(item.productId, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
    setQty(1);
  };

  return (
    <div className="group relative bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all duration-300 flex flex-col overflow-hidden">
      {/* Product Image & Badges Container */}
      <div className="relative aspect-[4/3] bg-slate-50 overflow-hidden">
        <img
          src={meta.imageUrl}
          alt={item.name}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
          <span className="text-[11px] font-bold tracking-wide uppercase px-2.5 py-0.5 rounded-full bg-slate-900/80 backdrop-blur-sm text-white shadow-sm">
            {meta.category}
          </span>
          {meta.badge && (
            <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-indigo-600 text-white shadow-sm">
              {meta.badge}
            </span>
          )}
        </div>

        {/* SKU Badge */}
        <div className="absolute top-3 right-3 z-10">
          <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-white/90 text-slate-700 shadow-sm backdrop-blur-sm border border-slate-200">
            {item.productId}
          </span>
        </div>

        {/* Quick View Button on Hover */}
        <button
          onClick={() => onQuickView(meta, item.stock)}
          className="absolute inset-x-4 bottom-3 py-2 bg-white/95 hover:bg-white text-slate-800 text-xs font-semibold rounded-xl shadow-md backdrop-blur-sm flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        >
          <Eye className="w-3.5 h-3.5 text-indigo-600" />
          <span>Quick View Specs</span>
        </button>
      </div>

      {/* Card Content */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Rating & Stock Status */}
          <div className="flex items-center justify-between text-xs mb-2">
            <div className="flex items-center gap-1 text-amber-500 font-semibold">
              <Star className="w-3.5 h-3.5 fill-current" />
              <span>{meta.rating.toFixed(1)}</span>
              <span className="text-slate-400 font-normal">({meta.reviewsCount})</span>
            </div>

            <div>
              {isOutOfStock ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                  <AlertCircle className="w-3 h-3" />
                  0 Stock (Test Rollback)
                </span>
              ) : isLowStock ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                  <AlertTriangle className="w-3 h-3" />
                  Only {item.stock} left!
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" />
                  {item.stock} in stock
                </span>
              )}
            </div>
          </div>

          {/* Product Title (Exact name from database) */}
          <h3
            onClick={() => onQuickView(meta, item.stock)}
            className="font-bold text-slate-900 text-lg leading-snug hover:text-indigo-600 transition-colors cursor-pointer line-clamp-1"
            title={item.name}
          >
            {item.name}
          </h3>

          <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
            {meta.description}
          </p>

          {/* Specs Chips */}
          <div className="flex flex-wrap gap-1 mt-3">
            {meta.specs.slice(0, 2).map((spec, i) => (
              <span
                key={i}
                className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium truncate max-w-[200px]"
              >
                {spec}
              </span>
            ))}
          </div>
        </div>

        {/* Stock Level & Stepper */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-3 text-xs">
            <span className="text-slate-500 font-medium">Inventory Stock:</span>
            <span className="font-mono font-bold text-slate-900">
              {item.stock} units
            </span>
          </div>

          {/* Interactive Stepper & Add Button */}
          <div className="flex items-center gap-2">
            <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 overflow-hidden shrink-0">
              <button
                type="button"
                onClick={handleDecrement}
                disabled={qty <= 1}
                className="p-2 hover:bg-slate-200 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-8 text-center text-xs font-bold text-slate-800 font-mono">
                {qty}
              </span>
              <button
                type="button"
                onClick={handleIncrement}
                disabled={!isOutOfStock && qty >= item.stock}
                className="p-2 hover:bg-slate-200 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleAdd}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-semibold text-xs transition-all shadow-sm active:scale-95 ${
                added
                  ? 'bg-emerald-600 text-white shadow-emerald-200'
                  : isOutOfStock
                  ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-100'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100'
              }`}
              title={isOutOfStock ? 'Add out-of-stock item to cart to test all-or-nothing rollback' : 'Add to cart'}
            >
              {added ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Added!</span>
                </>
              ) : isOutOfStock ? (
                <>
                  <ShoppingBag className="w-4 h-4" />
                  <span>Add (Test Rollback)</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-4 h-4" />
                  <span>Add to Cart</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
