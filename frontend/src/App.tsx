import React, { useState, useEffect, useCallback } from 'react';
import {
  ShoppingBag,
  CheckCircle2,
  AlertCircle,
  Package,
  ArrowRight,
  History,
  Clock,
  Trash2,
  Plus,
  RotateCcw,
  Bell,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { api } from './services/api';
import {
  InventoryItem,
  OrderResponse,
  OrderRecord,
  NotificationRecord,
  CartItem,
} from './types';

export const App: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('P100');
  const [itemQuantity, setItemQuantity] = useState<number>(1);

  // Interaction state
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [restocking, setRestocking] = useState<boolean>(false);
  const [cancellingOrderId, setCancellingOrderId] = useState<number | null>(null);

  // Result state
  const [orderResult, setOrderResult] = useState<OrderResponse | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [items, orderList, notificationList] = await Promise.all([
        api.getInventory(),
        api.getOrders(),
        api.getNotifications(),
      ]);
      setInventory(items);
      setOrders(orderList);
      setNotifications(notificationList);

      if (items.length > 0 && !items.some((i) => i.productId === selectedProductId)) {
        setSelectedProductId(items[0].productId);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  }, [selectedProductId]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 6000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleAddToCart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || itemQuantity <= 0) return;

    const existingProduct = inventory.find((i) => i.productId === selectedProductId);
    if (!existingProduct) return;

    setCart((prevCart) => {
      const existingCartIndex = prevCart.findIndex((i) => i.productId === selectedProductId);
      if (existingCartIndex > -1) {
        const updated = [...prevCart];
        updated[existingCartIndex].quantity += itemQuantity;
        return updated;
      }
      return [
        ...prevCart,
        {
          productId: existingProduct.productId,
          name: existingProduct.name,
          quantity: itemQuantity,
          stock: existingProduct.stock,
        },
      ];
    });

    setItemQuantity(1);
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  const handleSubmitOrder = async () => {
    if (cart.length === 0) return;

    setSubmitting(true);
    try {
      const response = await api.placeOrder({
        items: cart.map((c) => ({
          productId: c.productId,
          quantity: c.quantity,
        })),
      });

      setOrderResult(response);
      setCart([]);
      await loadData();
    } catch (err: any) {
      console.error('Order error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelOrder = async (orderId: number) => {
    setCancellingOrderId(orderId);
    try {
      const response = await api.cancelOrder(orderId);
      setOrderResult(response);
      await loadData();
    } catch (err: any) {
      console.error('Cancellation error:', err);
      alert(err.message || 'Failed to cancel order');
    } finally {
      setCancellingOrderId(null);
    }
  };

  const handleRestockAll = async () => {
    setRestocking(true);
    try {
      const items = await api.restockAll();
      setInventory(items);
      await loadData();
    } catch (err) {
      console.error('Failed to restock:', err);
    } finally {
      setRestocking(false);
    }
  };

  const selectedItem = inventory.find((i) => i.productId === selectedProductId);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased selection:bg-indigo-100 selection:text-indigo-900">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur sticky top-0 z-30 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-900 tracking-tight">
                Order &amp; Inventory Modular Monolith
              </h1>
              <p className="text-xs text-slate-500">
                Multi-Item Rollback &bull; In-Monolith Events &bull; Auto-Reorder Alerts
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRestockAll}
              disabled={restocking}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100/80 px-3 py-1.5 rounded-lg border border-indigo-200 transition disabled:opacity-50 flex items-center gap-1.5"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${restocking ? 'animate-spin' : ''}`} />
              <span>{restocking ? 'Restocking...' : 'Restock All'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column (7 cols): Cart & Order Placement */}
          <div className="lg:col-span-7 space-y-6">
            {/* Step 1: Cart Builder */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 tracking-tight flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-indigo-600" />
                  <span>Build Multi-Item Order</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Add items to your cart. All items are validated atomically before reserving stock.
                </p>
              </div>

              {/* Add item to cart form */}
              <form onSubmit={handleAddToCart} className="space-y-4 bg-slate-50/70 p-4 rounded-xl border border-slate-200/60">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-7 space-y-1.5">
                    <label className="text-xs font-medium text-slate-700">Select Product</label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-indigo-600 font-medium"
                    >
                      {inventory.map((item) => (
                        <option key={item.productId} value={item.productId}>
                          {item.productId} &mdash; {item.name} ({item.stock} in stock)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-3 space-y-1.5">
                    <label className="text-xs font-medium text-slate-700">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      max="999"
                      value={itemQuantity}
                      onChange={(e) => setItemQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-indigo-600 font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <button
                      type="submit"
                      className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm transition shadow-sm flex items-center justify-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>

                {selectedItem && (
                  <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                    <span>Current availability for {selectedItem.productId}:</span>
                    <strong className={selectedItem.stock === 0 ? 'text-rose-600' : selectedItem.stock < 5 ? 'text-amber-600' : 'text-emerald-600'}>
                      {selectedItem.stock} units
                    </strong>
                  </div>
                )}
              </form>

              {/* Cart Items List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Cart Items ({cart.reduce((sum, item) => sum + item.quantity, 0)})
                  </span>
                  {cart.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearCart}
                      className="text-xs text-slate-400 hover:text-rose-600 transition"
                    >
                      Clear Cart
                    </button>
                  )}
                </div>

                {cart.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                    Your cart is empty. Add products above to start an order.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {cart.map((item) => (
                      <div
                        key={item.productId}
                        className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 shadow-sm text-sm"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {item.productId}
                          </span>
                          <span className="font-medium text-slate-800">{item.name}</span>
                          <span className="text-xs font-mono text-slate-500">
                            &times; {item.quantity}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFromCart(item.productId)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={handleSubmitOrder}
                      disabled={submitting}
                      className="w-full mt-4 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium rounded-xl text-sm transition shadow-sm hover:shadow flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {submitting ? (
                        <span>Validating &amp; Reserving Stock...</span>
                      ) : (
                        <>
                          <span>Submit Multi-Item Order</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Order Result Card */}
            {orderResult && (
              <div className={`p-5 rounded-2xl border shadow-sm space-y-4 ${
                orderResult.status === 'CONFIRMED'
                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                  : orderResult.status === 'CANCELLED'
                  ? 'bg-slate-100/90 border-slate-300 text-slate-900'
                  : 'bg-rose-50/80 border-rose-200 text-rose-950'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {orderResult.status === 'CONFIRMED' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    ) : orderResult.status === 'CANCELLED' ? (
                      <RotateCcw className="w-5 h-5 text-slate-600 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                    )}
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider block opacity-70">
                        Transaction Outcome
                      </span>
                      <strong className="text-base tracking-tight">
                        Order #{orderResult.orderId} &mdash; {orderResult.status}
                      </strong>
                    </div>
                  </div>
                </div>

                {orderResult.reason && (
                  <p className="text-xs border-t border-slate-200/60 pt-2 opacity-90">
                    <strong>Reason:</strong> {orderResult.reason}
                  </p>
                )}

                {orderResult.items && orderResult.items.length > 0 && (
                  <div className="space-y-1.5 border-t border-slate-200/60 pt-2">
                    <span className="text-xs font-medium opacity-80 block">Line Item Breakdown:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {orderResult.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="bg-white/90 px-3 py-1.5 rounded-lg border border-slate-200/70 text-xs flex items-center justify-between font-mono"
                        >
                          <span>{item.quantity}x {item.productId}</span>
                          <span className={`font-semibold text-[11px] ${
                            item.outcome === 'CONFIRMED'
                              ? 'text-emerald-700'
                              : item.outcome === 'RESTOCKED'
                              ? 'text-indigo-700'
                              : 'text-rose-700'
                          }`}>
                            {item.outcome}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Order History with Cancel Button */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-indigo-600" />
                  <h2 className="text-base font-semibold text-slate-900 tracking-tight">
                    Order History &amp; Actions
                  </h2>
                </div>
                <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                  {orders.length} orders
                </span>
              </div>

              {orders.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No orders recorded yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto pr-1">
                  {orders.map((order) => (
                    <div
                      key={order.orderId}
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm hover:bg-slate-50/70 px-2 rounded-lg transition"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            #{order.orderId}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            order.status === 'CONFIRMED'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : order.status === 'CANCELLED'
                              ? 'bg-slate-100 text-slate-700 border border-slate-300'
                              : 'bg-rose-100 text-rose-700 border border-rose-200'
                          }`}>
                            {order.status}
                          </span>
                          <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>

                        {/* Line Items List */}
                        <div className="text-xs text-slate-700 flex flex-wrap gap-1.5 pt-1">
                          {order.items && order.items.length > 0 ? (
                            order.items.map((item) => (
                              <span key={item.itemId} className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 text-[11px]">
                                {item.quantity}x {item.productId}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 italic">No line items</span>
                          )}
                        </div>

                        {order.reason && (
                          <p className="text-xs text-rose-600">
                            Reason: {order.reason}
                          </p>
                        )}
                      </div>

                      {/* Cancel Order Action */}
                      <div>
                        {order.status === 'CONFIRMED' && (
                          <button
                            type="button"
                            onClick={() => handleCancelOrder(order.orderId)}
                            disabled={cancellingOrderId === order.orderId}
                            className="text-xs font-medium text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg border border-rose-200 transition disabled:opacity-50 flex items-center gap-1"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>{cancellingOrderId === order.orderId ? 'Cancelling...' : 'Cancel & Restock'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column (5 cols): Live Inventory & Notification Activity Feed */}
          <div className="lg:col-span-5 space-y-6">
            {/* Live Inventory Dashboard */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-indigo-600" />
                  <h2 className="text-base font-semibold text-slate-900 tracking-tight">
                    Live Inventory
                  </h2>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  Threshold: &lt;5
                </span>
              </div>

              <div className="space-y-3">
                {inventory.map((item) => {
                  const isZero = item.stock === 0;
                  const isLow = item.stock < 5 && !isZero;

                  return (
                    <div
                      key={item.productId}
                      className={`p-3.5 rounded-xl border transition flex items-center justify-between ${
                        isZero
                          ? 'bg-rose-50/60 border-rose-200'
                          : isLow
                          ? 'bg-amber-50/60 border-amber-200'
                          : 'bg-slate-50 border-slate-200/70'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-indigo-600">
                            {item.productId}
                          </span>
                          <span className="text-sm font-semibold text-slate-800">
                            {item.name}
                          </span>
                        </div>
                        {isLow && (
                          <span className="text-[10px] font-medium text-amber-700 flex items-center gap-1 mt-0.5">
                            <AlertTriangle className="w-3 h-3" />
                            Reorder needed (low stock)
                          </span>
                        )}
                        {isZero && (
                          <span className="text-[10px] font-medium text-rose-700 flex items-center gap-1 mt-0.5">
                            <AlertCircle className="w-3 h-3" />
                            Depleted (0 stock)
                          </span>
                        )}
                      </div>

                      <div className="text-right">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold ${
                          isZero
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : isLow
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}>
                          {item.stock} left
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Notification Activity Feed */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-indigo-600" />
                  <h2 className="text-base font-semibold text-slate-900 tracking-tight">
                    Domain Activity Feed
                  </h2>
                </div>
                <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  {notifications.length} events
                </span>
              </div>

              {notifications.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No domain events published yet.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                  {notifications.map((notif) => {
                    const isLowStock = notif.message.includes('LOW-STOCK') || notif.message.includes('Reorder');
                    const isConfirmed = notif.message.includes('confirmed');
                    const isCancelled = notif.message.includes('cancelled');

                    return (
                      <div
                        key={notif.notificationId}
                        className={`p-3 rounded-xl border text-xs space-y-1 transition ${
                          isLowStock
                            ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                            : isConfirmed
                            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                            : isCancelled
                            ? 'bg-slate-100/90 border-slate-300 text-slate-900'
                            : 'bg-rose-50/80 border-rose-200 text-rose-950'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {isLowStock ? (
                            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                          ) : isConfirmed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                          ) : isCancelled ? (
                            <RotateCcw className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <p className="font-medium leading-relaxed">
                              {notif.message}
                            </p>
                            <span className="text-[10px] font-mono opacity-60 block mt-1">
                              {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
