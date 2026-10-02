import React, { useState, useEffect, useCallback } from 'react';
import {
  Package,
  ShoppingBag,
  Truck,
  Bell,
  RefreshCw,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
  Clock,
  ArrowRight,
  ShieldCheck,
  Radio,
} from 'lucide-react';
import { api } from './services/api';
import { ProductCard } from './components/ProductCard';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutSuccessModal } from './components/CheckoutSuccessModal';
import { ChannelStatus } from './components/ChannelStatus';
import { ProductMetadata } from './data/productData';
import {
  InventoryItem,
  OrderResponse,
  OrderRecord,
  NotificationRecord,
  SupplierOrderSummary,
  CartItem,
} from './types';

export const App: React.FC = () => {
  // State: Initialize with the 3 catalog products so UI is never empty
  const [inventory, setInventory] = useState<InventoryItem[]>([
    { productId: 'P100', name: 'Wireless Mouse', stock: 25 },
    { productId: 'P200', name: 'Mechanical Keyboard', stock: 10 },
    { productId: 'P300', name: 'USB-C Hub', stock: 0 },
  ]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [supplierOrders, setSupplierOrders] = useState<SupplierOrderSummary[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'products' | 'inventory' | 'orders' | 'supplier' | 'channel' | 'activity'>('products');

  // Cart & Product Selection State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isSubmittingCart, setIsSubmittingCart] = useState<boolean>(false);
  const [selectedProductMeta, setSelectedProductMeta] = useState<ProductMetadata | null>(null);
  const [selectedProductStock, setSelectedProductStock] = useState<number>(0);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState<boolean>(false);

  // Supplier API Key State
  const [supplierConfig, setSupplierConfig] = useState<{ clientId: string; hasApiKey: boolean }>({
    clientId: '21-0328-885',
    hasApiKey: false,
  });

  // Order Placement Form
  const [selectedProduct, setSelectedProduct] = useState<string>('P100');
  const [quantity, setQuantity] = useState<number>(1);
  const [orderResult, setOrderResult] = useState<OrderResponse | null>(null);

  // Loading States
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showStatus = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const loadData = useCallback(async () => {
    try {
      const [invData, orderData, suppData, notifData, configData] = await Promise.all([
        api.getInventory().catch((e) => {
          console.error('getInventory failed:', e);
          return null;
        }),
        api.getOrders().catch((e) => {
          console.error('getOrders failed:', e);
          return [];
        }),
        api.getSupplierOrders().catch(() => []),
        api.getNotifications().catch((e) => {
          console.error('getNotifications failed:', e);
          return [];
        }),
        api.getSupplierConfig().catch(() => ({ clientId: '21-0328-885', hasApiKey: false })),
      ]);
      if (invData && Array.isArray(invData) && invData.length > 0) {
        setInventory(invData);
      }
      if (orderData) setOrders(orderData);
      if (suppData) setSupplierOrders(suppData);
      if (notifData) setNotifications(notifData);
      if (configData) setSupplierConfig(configData);
    } catch (err) {
      console.error('Failed to load monolith data:', err);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 8000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleManualSync = async () => {
    setIsLoading(true);
    await loadData();
    setIsLoading(false);
    showStatus('Data synchronized with Monolith backend', 'info');
  };

  const handleAddToCart = (productId: string, qty: number) => {
    const item = inventory.find((i) => i.productId === productId);
    if (!item) return;

    setCart((prev) => {
      const existing = prev.find((c) => c.productId === productId);
      if (existing) {
        return prev.map((c) =>
          c.productId === productId ? { ...c, quantity: c.quantity + qty } : c
        );
      }
      return [
        ...prev,
        {
          productId: item.productId,
          name: item.name,
          quantity: qty,
          stock: item.stock,
        },
      ];
    });
    showStatus(`Added ${qty}x ${item.name} to cart`, 'info');
  };

  const handleUpdateCartQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  const handleSubmitCartOrder = async () => {
    if (cart.length === 0) return;
    setIsSubmittingCart(true);
    try {
      const res = await api.placeOrder({
        items: cart.map((c) => ({ productId: c.productId, quantity: c.quantity })),
      });
      setOrderResult(res);
      setIsSuccessModalOpen(true);
      setCart([]);
      setIsCartOpen(false);
      await loadData();
      if (res.status === 'CONFIRMED') {
        showStatus(`Order #${res.orderId} Confirmed! Stock reserved.`, 'success');
      } else {
        showStatus(`Order Rejected: ${res.reason || 'Insufficient stock'}`, 'error');
      }
    } catch (err: any) {
      showStatus(`Cart checkout failed: ${err.message}`, 'error');
    } finally {
      setIsSubmittingCart(false);
    }
  };

  const handleQuickView = (meta: ProductMetadata, stock: number) => {
    setSelectedProductMeta(meta);
    setSelectedProductStock(stock);
    setIsDetailModalOpen(true);
  };

  const handlePlaceOrder = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (quantity <= 0) return;

    setIsLoading(true);
    setOrderResult(null);
    try {
      const res = await api.placeOrder({
        items: [{ productId: selectedProduct, quantity }],
      });
      setOrderResult(res);
      await loadData();
      if (res.status === 'CONFIRMED') {
        showStatus(`Order #${res.orderId} Confirmed! Stock reserved.`, 'success');
      } else {
        showStatus(`Order Rejected: ${res.reason || 'Insufficient stock'}`, 'error');
      }
    } catch (err: any) {
      showStatus(`Order failed: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: number) => {
    setIsLoading(true);
    try {
      await api.cancelOrder(orderId);
      await loadData();
      showStatus(`Order #${orderId} cancelled and restocked.`, 'info');
    } catch (err: any) {
      showStatus(`Cancel failed: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestockAll = async () => {
    setIsLoading(true);
    try {
      await api.restockAll();
      await loadData();
      showStatus('Inventory reset to initial baseline values', 'success');
    } catch (err: any) {
      showStatus(`Restock failed: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const lowStockCount = inventory.filter((i) => i.stock < 5).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Simple Top Navigation */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h1 className="font-semibold text-base sm:text-lg tracking-tight">
                Rabanal's Monolith &amp; Supplier System
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Student ID: <span className="text-slate-200 font-mono">21-0328-885</span> • Lab 3 Anti-Corruption Layer
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-sm transition-all active:scale-95"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Cart</span>
              {cart.reduce((sum, item) => sum + item.quantity, 0) > 0 && (
                <span className="bg-white text-indigo-700 text-[10px] font-bold px-1.5 py-0.2 rounded-full min-w-[18px] text-center">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              )}
            </button>

            <button
              onClick={handleManualSync}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors border border-slate-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
              <span>Sync Live</span>
            </button>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="max-w-6xl mx-auto px-4 flex gap-1 border-t border-slate-800 overflow-x-auto text-xs sm:text-sm">
          <button
            onClick={() => setActiveTab('products')}
            className={`flex items-center gap-2 py-2.5 px-3 font-medium border-b-2 transition-colors ${
              activeTab === 'products'
                ? 'border-indigo-400 text-white font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShoppingBag className="w-4 h-4 text-indigo-400" />
            <span>Products (3 Items)</span>
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-2 py-2.5 px-3 font-medium border-b-2 transition-colors ${
              activeTab === 'inventory'
                ? 'border-indigo-400 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Inventory</span>
            {lowStockCount > 0 && (
              <span className="bg-amber-500 text-slate-900 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                {lowStockCount} Low
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 py-2.5 px-3 font-medium border-b-2 transition-colors ${
              activeTab === 'orders'
                ? 'border-indigo-400 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Customer Orders</span>
            {orders.length > 0 && (
              <span className="bg-slate-700 text-slate-300 text-[10px] font-medium px-1.5 py-0.2 rounded-full">
                {orders.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('supplier')}
            className={`flex items-center gap-2 py-2.5 px-3 font-medium border-b-2 transition-colors ${
              activeTab === 'supplier'
                ? 'border-indigo-400 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Supplier Reorders (ACL)</span>
            {supplierOrders.length > 0 && (
              <span className="bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                {supplierOrders.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('channel')}
            className={`flex items-center gap-2 py-2.5 px-3 font-medium border-b-2 transition-colors ${
              activeTab === 'channel'
                ? 'border-indigo-400 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>Channel Status</span>
          </button>

          <button
            onClick={() => setActiveTab('activity')}
            className={`flex items-center gap-2 py-2.5 px-3 font-medium border-b-2 transition-colors ${
              activeTab === 'activity'
                ? 'border-indigo-400 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Activity Feed</span>
          </button>
        </div>
      </header>

      {/* Floating Status Notification */}
      {statusMessage && (
        <div
          className={`max-w-6xl mx-auto px-4 mt-3 w-full animate-fade-in`}
        >
          <div
            className={`p-3 rounded-lg text-xs font-medium flex items-center justify-between border ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : statusMessage.type === 'error'
                ? 'bg-rose-50 text-rose-800 border-rose-200'
                : 'bg-indigo-50 text-indigo-800 border-indigo-200'
            }`}
          >
            <span>{statusMessage.text}</span>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-xs font-bold opacity-60 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Content View */}
      <main className="max-w-6xl mx-auto px-4 py-6 flex-1 w-full space-y-6">
        {/* TAB 0: SELECTION OF PRODUCTS (STOREFRONT) */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            {/* Header & Quick Scenarios */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-base font-bold text-slate-900">
                    Product Selection &amp; Storefront
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Browse products, inspect specifications, and select quantities. Stock is reserved atomically in-process.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-slate-400 font-medium">Quick Test:</span>
                <button
                  onClick={() => {
                    handleAddToCart('P100', 1);
                    handleAddToCart('P200', 1);
                    setIsCartOpen(true);
                  }}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 font-medium"
                >
                  Multi-Item (Mouse + Keyboard)
                </button>
                <button
                  onClick={() => {
                    handleAddToCart('P100', 1);
                    handleAddToCart('P300', 1);
                    setIsCartOpen(true);
                  }}
                  className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg border border-rose-200 font-medium"
                >
                  Test Rollback (P300 Out of Stock)
                </button>
              </div>
            </div>

            {/* 3 Products Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {inventory.map((item) => (
                <ProductCard
                  key={item.productId}
                  item={item}
                  onAddToCart={handleAddToCart}
                  onQuickView={handleQuickView}
                />
              ))}
            </div>
          </div>
        )}

        {/* TAB 1: INVENTORY */}
        {activeTab === 'inventory' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Current Warehouse Inventory</h2>
                  <p className="text-xs text-slate-500">
                    Threshold is 5 units. Stock dropping below threshold immediately triggers an auto-reorder via SupplierGateway.
                  </p>
                </div>
                <button
                  onClick={handleRestockAll}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors border border-slate-300 disabled:opacity-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset All to Baseline</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Product ID</th>
                      <th className="py-2.5 px-3">Item Description</th>
                      <th className="py-2.5 px-3 text-center">Current Stock</th>
                      <th className="py-2.5 px-3 text-center">Threshold</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-right">Quick Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {inventory.map((item) => {
                      const isLow = item.stock < 5;
                      const isOut = item.stock === 0;
                      return (
                        <tr key={item.productId} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 font-mono font-semibold text-indigo-700">{item.productId}</td>
                          <td className="py-3 px-3 text-slate-900">{item.name}</td>
                          <td className="py-3 px-3 text-center font-bold text-base">{item.stock}</td>
                          <td className="py-3 px-3 text-center text-slate-500 font-mono">5 units</td>
                          <td className="py-3 px-3 text-center">
                            {isOut ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-100 text-rose-800">
                                Out of Stock
                              </span>
                            ) : isLow ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 animate-pulse">
                                Low Stock (&lt; 5)
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                                Healthy
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => {
                                setSelectedProduct(item.productId);
                                setQuantity(Math.max(1, item.stock - 3));
                                setActiveTab('orders');
                              }}
                              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium hover:underline inline-flex items-center gap-1"
                            >
                              <span>Test Order</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CUSTOMER ORDERS */}
        {activeTab === 'orders' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Simple Order Submission Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Direct Order Placement</h2>
                <p className="text-xs text-slate-500">
                  Orders execute atomically with in-process stock reservation.
                </p>
              </div>

              <form onSubmit={handlePlaceOrder} className="space-y-3">
                {/* 3 Interactive Product Selection Cards */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Select Product (Click to Choose)
                  </label>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {inventory.map((i) => {
                      const isSelected = selectedProduct === i.productId;
                      const isOut = i.stock === 0;
                      return (
                        <button
                          key={i.productId}
                          type="button"
                          onClick={() => {
                            setSelectedProduct(i.productId);
                            setQuantity(1);
                          }}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-500/20'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono font-bold text-xs text-indigo-700">{i.productId}</span>
                            <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                              isOut ? 'bg-rose-100 text-rose-700' : i.stock < 5 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              {i.stock} left
                            </span>
                          </div>
                          <div className="text-xs font-semibold text-slate-800 truncate" title={i.name}>
                            {i.name}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <select
                    value={selectedProduct}
                    onChange={(e) => setSelectedProduct(e.target.value)}
                    className="w-full text-xs p-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-600"
                  >
                    {inventory.map((i) => (
                      <option key={i.productId} value={i.productId}>
                        {i.productId} - {i.name} (Stock: {i.stock})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full text-xs sm:text-sm p-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                {/* Quick Presets */}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setQuantity(1)}
                    className="flex-1 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 text-slate-700"
                  >
                    Qty 1
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const item = inventory.find((i) => i.productId === selectedProduct);
                      if (item) setQuantity(Math.max(1, item.stock - 4));
                    }}
                    className="flex-1 py-1 text-xs bg-amber-50 hover:bg-amber-100 rounded border border-amber-200 text-amber-800 font-medium"
                    title="Order enough units to trigger LowStockEvent (< 5)"
                  >
                    Drop below 5
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const item = inventory.find((i) => i.productId === selectedProduct);
                      if (item) setQuantity(item.stock + 5);
                    }}
                    className="flex-1 py-1 text-xs bg-rose-50 hover:bg-rose-100 rounded border border-rose-200 text-rose-800"
                    title="Order more than stock to test atomic rollback"
                  >
                    Over-stock
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs sm:text-sm shadow-sm transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Order</span>
                </button>
              </form>

              {/* Instant Result Box */}
              {orderResult && (
                <div
                  className={`p-3 rounded-lg border text-xs space-y-1 ${
                    orderResult.status === 'CONFIRMED'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold">
                    {orderResult.status === 'CONFIRMED' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-600" />
                    )}
                    <span>Order #{orderResult.orderId}: {orderResult.status}</span>
                  </div>
                  {orderResult.reason && (
                    <p className="text-[11px] text-rose-700">{orderResult.reason}</p>
                  )}
                  {orderResult.status === 'CONFIRMED' && (
                    <p className="text-[11px] text-emerald-700">Stock successfully updated in monolith database.</p>
                  )}
                </div>
              )}
            </div>

            {/* Order History Table */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900">Customer Order History</h2>
                <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {orders.length} orders
                </span>
              </div>

              {orders.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No customer orders placed yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-2.5">Order ID</th>
                        <th className="py-2 px-2.5">Items</th>
                        <th className="py-2 px-2.5 text-center">Status</th>
                        <th className="py-2 px-2.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {orders.map((o) => (
                        <tr key={o.orderId} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-2.5 font-mono font-bold text-slate-800">#{o.orderId}</td>
                          <td className="py-2.5 px-2.5">
                            {o.items && o.items.length > 0 ? (
                              o.items.map((i) => `${i.quantity}x ${i.productId}`).join(', ')
                            ) : (
                              <span className="text-slate-400">None</span>
                            )}
                          </td>
                          <td className="py-2.5 px-2.5 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                o.status === 'CONFIRMED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : o.status === 'CANCELLED'
                                  ? 'bg-slate-200 text-slate-700'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {o.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-2.5 text-right">
                            {o.status === 'CONFIRMED' && (
                              <button
                                onClick={() => handleCancelOrder(o.orderId)}
                                disabled={isLoading}
                                className="text-[11px] text-rose-600 hover:text-rose-800 font-semibold hover:underline"
                              >
                                Cancel &amp; Restock
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: SUPPLIER REORDERS (ACL) */}
        {activeTab === 'supplier' && (
          <div className="space-y-4">
            {/* LegacySupply Connection Card (Read-only status) */}
            <div className={`p-4 rounded-xl border transition-all ${
              supplierConfig.hasApiKey 
                ? 'bg-emerald-50/70 border-emerald-200' 
                : 'bg-amber-50/70 border-amber-200'
            }`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${supplierConfig.hasApiKey ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs sm:text-sm font-bold text-slate-800">
                        {supplierConfig.hasApiKey ? 'LegacySupply Anti-Corruption Layer: Active & Connected' : 'LegacySupply API Connection: Pending Environment Key'}
                      </h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        supplierConfig.hasApiKey ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'
                      }`}>
                        {supplierConfig.hasApiKey ? 'Authenticated (ENV)' : 'Offline / Pending'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Client ID: <span className="font-mono font-semibold text-slate-900">{supplierConfig.clientId || '21-0328-885'}</span> •{' '}
                      {supplierConfig.hasApiKey
                        ? 'Authenticated via LEGACY_API_KEY. Autonomous XML session management, catalog sync, and delivery tracking active.'
                        : 'Reorders are buffered until the LEGACY_API_KEY environment variable is configured.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Truck className="w-5 h-5 text-indigo-600" />
                    <h2 className="text-base font-semibold text-slate-900">
                      Anti-Corruption Layer: Supplier Purchase Orders
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Orders placed with LegacySupply (`supplier_orders` table). Units are rounded up to whole cases/packs.
                  </p>
                </div>
              </div>

              {supplierOrders.length === 0 ? (
                <div className="py-10 text-center border border-dashed border-slate-200 rounded-lg">
                  <p className="text-xs text-slate-500 mb-2">No supplier reorders created yet.</p>
                  <button
                    onClick={() => {
                      setSelectedProduct('P100');
                      setQuantity(22);
                      setActiveTab('orders');
                    }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium underline"
                  >
                    Place an order to reduce P100 below 5 units and trigger auto-reorder
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Order ID</th>
                        <th className="py-2.5 px-3">BuyerRef</th>
                        <th className="py-2.5 px-3">PO Number</th>
                        <th className="py-2.5 px-3">Product</th>
                        <th className="py-2.5 px-3 text-center">Cases</th>
                        <th className="py-2.5 px-3 text-center">Total Units</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3 text-right">Updated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {supplierOrders.map((so) => (
                        <tr key={so.id} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-800">#{so.id}</td>
                          <td className="py-2.5 px-3 font-mono text-indigo-700">{so.buyerRef}</td>
                          <td className="py-2.5 px-3 font-mono font-semibold">
                            {so.poNumber ? (
                              <span className="text-slate-900">{so.poNumber}</span>
                            ) : (
                              <span className="text-amber-600 text-xs italic">Pending Dispatch</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-semibold">{so.productId}</td>
                          <td className="py-2.5 px-3 text-center">{so.cases} cs</td>
                          <td className="py-2.5 px-3 text-center font-bold">{so.units}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-bold ${
                                so.status === 'DELIVERED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : so.status === 'SHIPPED'
                                  ? 'bg-blue-100 text-blue-800'
                                  : so.status === 'PICKING'
                                  ? 'bg-purple-100 text-purple-800'
                                  : so.status === 'SUBMITTED'
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : so.status === 'PENDING'
                                  ? 'bg-amber-100 text-amber-800'
                                  : so.status === 'CANCELLED'
                                  ? 'bg-slate-200 text-slate-700'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {so.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right text-xs text-slate-400 font-mono">
                            {new Date(so.updatedAt).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: CHANNEL STATUS */}
        {activeTab === 'channel' && <ChannelStatus />}

        {/* TAB 5: ACTIVITY FEED */}
        {activeTab === 'activity' && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-base font-semibold text-slate-900">In-Monolith Domain Event Activity</h2>
                <p className="text-xs text-slate-500">
                  Decoupled events via Spring ApplicationEventPublisher (`notifications` table).
                </p>
              </div>
              <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                {notifications.length} events
              </span>
            </div>

            {notifications.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No activity recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {notifications.map((n) => {
                  const isLow = n.message.includes('LOW-STOCK') || n.message.includes('Auto-Reorder');
                  const isDelivered = n.message.includes('DELIVERED') || n.message.includes('delivered');
                  return (
                    <div
                      key={n.notificationId}
                      className={`p-3 rounded-lg border text-xs flex items-start justify-between gap-3 ${
                        isLow
                          ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                          : isDelivered
                          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                          : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {isLow ? (
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        ) : isDelivered ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <Clock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <p className="font-medium">{n.message}</p>
                          <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                            {new Date(n.createdAt).toLocaleTimeString()} • ID #{n.notificationId}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Simple Footer */}
      <footer className="bg-white border-t border-slate-200 py-3 text-center text-xs text-slate-500">
        <p>Rabanal Monolith &bull; Anti-Corruption Layer &bull; Systems Integration &amp; Architecture</p>
      </footer>

      {/* Cart & Product Modals */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        inventory={inventory}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveFromCart}
        onClearCart={handleClearCart}
        onSubmitOrder={handleSubmitCartOrder}
        isSubmitting={isSubmittingCart}
      />

      <ProductDetailModal
        meta={selectedProductMeta}
        stock={selectedProductStock}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onAddToCart={handleAddToCart}
      />

      <CheckoutSuccessModal
        result={orderResult}
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        onViewOrders={() => {
          setIsSuccessModalOpen(false);
          setActiveTab('orders');
        }}
      />
    </div>
  );
};
