import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  History,
  Package,
  Bell,
  ArrowUpDown,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Zap,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Flame,
  Layers,
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
import { ProductMetadata, getProductMeta } from './data/productData';
import { Navbar, NavTab } from './components/Navbar';
import { ProductCard } from './components/ProductCard';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CartDrawer } from './components/CartDrawer';
import { OrderCard } from './components/OrderCard';
import { ServicesSection } from './components/ServicesSection';
import { CheckoutSuccessModal } from './components/CheckoutSuccessModal';
import { ToastContainer, ToastMessage } from './components/ToastContainer';

export const App: React.FC = () => {
  // Live Monolith Data
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);

  // Navigation & Filtering
  const [activeTab, setActiveTab] = useState<NavTab>('store');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<string>('featured');
  const [orderFilter, setOrderFilter] = useState<'ALL' | 'CONFIRMED' | 'CANCELLED' | 'REJECTED'>('ALL');
  const [notificationFilter, setNotificationFilter] = useState<'ALL' | 'STOCK' | 'CONFIRMED' | 'CANCELLED' | 'REJECTED'>('ALL');

  // Cart & Modals
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [selectedDetail, setSelectedDetail] = useState<{ meta: ProductMetadata; stock: number } | null>(null);
  const [orderResult, setOrderResult] = useState<OrderResponse | null>(null);
  const [isOrderResultModalOpen, setIsOrderResultModalOpen] = useState<boolean>(false);

  // Loading States
  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);
  const [isCancellingOrderId, setIsCancellingOrderId] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isRestockingAll, setIsRestockingAll] = useState<boolean>(false);

  // Toast System
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (title: string, message?: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Load backend data
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
    } catch (err) {
      console.error('Failed to load monolith data:', err);
    }
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setTimeout(() => setIsRefreshing(false), 500);
    addToast('Data Synchronized', 'Fetched latest inventory, orders, and domain events.', 'info');
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Cart Calculations
  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

  const lowStockCount = useMemo(() => {
    return inventory.filter((item) => item.stock > 0 && item.stock < 5).length;
  }, [inventory]);

  // Cart Actions
  const handleAddToCart = (productId: string, quantity: number) => {
    const existing = inventory.find((i) => i.productId === productId);
    if (!existing) return;

    setCart((prevCart) => {
      const alreadyInCart = prevCart.some((i) => i.productId === productId);
      if (alreadyInCart) {
        return prevCart.map((item) =>
          item.productId === productId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [
        ...prevCart,
        {
          productId: existing.productId,
          name: existing.name,
          quantity,
          stock: existing.stock,
        },
      ];
    });

    if (existing.stock <= 0) {
      addToast(
        'Added (0 Stock Item)',
        `${quantity}x ${existing.name} (0 stock) added. Submitting will trigger atomic rollback!`,
        'warning'
      );
    } else {
      addToast('Added to Cart', `${quantity}x ${existing.name} added to your cart.`, 'success');
    }
  };

  const handleUpdateCartQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId === productId) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null)
    );
  };

  const handleRemoveCartItem = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
    addToast('Item Removed', `Removed SKU ${productId} from your cart.`, 'info');
  };

  const handleClearCart = () => {
    setCart([]);
    addToast('Cart Cleared', 'All items removed from your cart.', 'info');
  };

  // Submit Order (All-or-Nothing Atomic Guarantee)
  const handleSubmitOrder = async () => {
    if (cart.length === 0) return;

    setIsSubmittingOrder(true);
    try {
      const response = await api.placeOrder({
        items: cart.map((c) => ({
          productId: c.productId,
          quantity: c.quantity,
        })),
      });

      setOrderResult(response);
      setIsOrderResultModalOpen(true);

      if (response.status === 'CONFIRMED') {
        setCart([]);
        setIsCartOpen(false);
        addToast(
          'Order Confirmed!',
          `Order #${response.orderId} processed with all-or-nothing rollback protection.`,
          'success'
        );
      } else {
        addToast(
          'Order Validation Failed',
          response.reason || 'Insufficient inventory stock for requested line items.',
          'error'
        );
      }

      await loadData();
    } catch (err: any) {
      console.error('Order submission error:', err);
      addToast('Order Submission Error', err.message || 'Network communication error.', 'error');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Cancel Order
  const handleCancelOrder = async (orderId: number) => {
    setIsCancellingOrderId(orderId);
    try {
      const response = await api.cancelOrder(orderId);
      setOrderResult(response);
      addToast(
        'Order Cancelled',
        `Order #${orderId} was cancelled and inventory was immediately restocked.`,
        'warning'
      );
      await loadData();
    } catch (err: any) {
      console.error('Cancel order error:', err);
      addToast('Cancellation Error', err.message || 'Failed to cancel order.', 'error');
    } finally {
      setIsCancellingOrderId(null);
    }
  };

  // Reorder Items
  const handleReorder = (items: { productId: string; quantity: number }[]) => {
    items.forEach((item) => {
      const inv = inventory.find((i) => i.productId === item.productId);
      if (inv && inv.stock > 0) {
        handleAddToCart(item.productId, Math.min(item.quantity, inv.stock));
      }
    });
    setIsCartOpen(true);
    addToast('Items Added to Cart', 'Reordered items loaded into your cart.', 'info');
  };

  // Restock All Items (Simulate Admin Reset)
  const handleRestockAll = async () => {
    setIsRestockingAll(true);
    try {
      const updated = await api.restockAll();
      setInventory(updated);
      addToast(
        'Inventory Restocked',
        'Reset stock to defaults: P100 (Mouse)=25, P200 (Keyboard)=10, P300 (USB-C Hub)=0',
        'success'
      );
      await loadData();
    } catch (err: any) {
      console.error('Restock error:', err);
      addToast('Restock Failed', err.message || 'Could not reset inventory.', 'error');
    } finally {
      setIsRestockingAll(false);
    }
  };

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    return inventory
      .filter((item) => {
        const meta = getProductMeta(item.productId, item.name);
        const matchesQuery =
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.productId.toLowerCase().includes(searchQuery.toLowerCase()) ||
          meta.description.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesCategory =
          selectedCategory === 'All' || meta.category === selectedCategory;

        return matchesQuery && matchesCategory;
      })
      .sort((a, b) => {
        const metaA = getProductMeta(a.productId, a.name);
        const metaB = getProductMeta(b.productId, b.name);

        if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
        if (sortBy === 'stock-desc') return b.stock - a.stock;
        if (sortBy === 'rating-desc') return metaB.rating - metaA.rating;
        return 0; // featured
      });
  }, [inventory, searchQuery, selectedCategory, sortBy]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (orderFilter === 'ALL') return true;
      return order.status === orderFilter;
    });
  }, [orders, orderFilter]);

  // Filtered Notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter((notif) => {
      const msg = notif.message.toUpperCase();
      if (notificationFilter === 'STOCK') return msg.includes('LOW-STOCK') || msg.includes('ALERT');
      if (notificationFilter === 'CONFIRMED') return msg.includes('CONFIRMED');
      if (notificationFilter === 'CANCELLED') return msg.includes('CANCELLED');
      if (notificationFilter === 'REJECTED') return msg.includes('REJECTED');
      return true;
    });
  }, [notifications, notificationFilter]);

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-800 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Interactive Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* Modern Sticky Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        cartCount={cartCount}
        onOpenCart={() => setIsCartOpen(true)}
        ordersCount={orders.length}
        lowStockCount={lowStockCount}
        notificationsCount={notifications.length}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onRefresh={handleManualRefresh}
        isRefreshing={isRefreshing}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ========================================================================= */}
        {/* VIEW 1: SHOP & PRODUCT CATALOG                                           */}
        {/* ========================================================================= */}
        {activeTab === 'store' && (
          <div className="space-y-8 animate-fade-in">
            {/* Store Hero Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-8 sm:p-12 shadow-xl">
              <div className="relative z-10 max-w-2xl">
                <div className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-300 text-xs font-semibold px-3 py-1 rounded-full border border-indigo-500/30 mb-4 backdrop-blur-sm">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Lab 2 In-Process Modular Monolith Edition</span>
                </div>

                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
                  High Performance Hardware &amp; Tech Services
                </h1>

                <p className="mt-4 text-slate-300 text-sm sm:text-base leading-relaxed">
                  Shop premium computer peripherals, parts, and expert assembly services with 
                  guaranteed all-or-nothing multi-item checkout, instant domain notifications, and 
                  one-click atomic cancellation.
                </p>

                {/* Promotional Guarantees */}
                <div className="mt-8 flex flex-wrap gap-3 sm:gap-4 text-xs font-medium text-slate-200">
                  <div className="flex items-center gap-2 bg-white/10 px-3.5 py-2 rounded-xl backdrop-blur-md border border-white/10">
                    <Zap className="w-4 h-4 text-indigo-400" />
                    <span>In-Process Monolith Speed</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/10 px-3.5 py-2 rounded-xl backdrop-blur-md border border-white/10">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Atomic Rollback Guarantee</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/10 px-3.5 py-2 rounded-xl backdrop-blur-md border border-white/10">
                    <RotateCcw className="w-4 h-4 text-amber-400" />
                    <span>1-Click Restock Cancellation</span>
                  </div>
                </div>
              </div>

              {/* Decorative background visual */}
              <div className="absolute -right-16 -bottom-16 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute right-10 top-1/2 -translate-y-1/2 hidden lg:block opacity-20 pointer-events-none">
                <Layers className="w-72 h-72 text-indigo-300" />
              </div>
            </div>

            {/* Catalog Filter & Controls Bar */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
                {['All', 'Peripherals', 'Accessories', 'Components'].map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                      selectedCategory === category
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>

              {/* Sorting & Search Indicator */}
              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sort:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 py-1.5 pl-2 pr-7 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="featured">Featured Hardware</option>
                    <option value="name-asc">Product Name (A-Z)</option>
                    <option value="stock-desc">Stock: Highest Available</option>
                    <option value="rating-desc">Highest Rated</option>
                  </select>
                </div>

                <span className="text-xs font-mono text-slate-400">
                  {filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'items'}
                </span>
              </div>
            </div>

            {/* Product Cards Grid */}
            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map((item) => (
                  <ProductCard
                    key={item.productId}
                    item={item}
                    onAddToCart={handleAddToCart}
                    onQuickView={(meta, stock) => setSelectedDetail({ meta, stock })}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-4">
                  <Package className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-800">No hardware found</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  No products matched your search or category filter. Try clearing your query or select "All".
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                  }}
                  className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors"
                >
                  Reset Catalog Filters
                </button>
              </div>
            )}

            {/* Tech Services Workshop Section */}
            <ServicesSection
              onBookService={(name) => {
                addToast(
                  'Consultation Booked!',
                  `Technician booked for: ${name}. You will receive a confirmation call shortly.`,
                  'success'
                );
              }}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: MY ORDERS & REAL-TIME TRACKING                                   */}
        {/* ========================================================================= */}
        {activeTab === 'orders' && (
          <div className="space-y-6 animate-fade-in">
            {/* Orders Header & Summary */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  <History className="w-6 h-6 text-indigo-600" />
                  <span>Order Tracking &amp; History</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Track live multi-item orders, review all-or-nothing rollback records, and trigger instant restock cancellations.
                </p>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                {(['ALL', 'CONFIRMED', 'CANCELLED', 'REJECTED'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setOrderFilter(filter)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      orderFilter === filter
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {filter === 'ALL' ? 'All Orders' : filter}
                  </button>
                ))}
              </div>
            </div>

            {/* Orders List */}
            {filteredOrders.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredOrders.map((order) => (
                  <OrderCard
                    key={order.orderId}
                    order={order}
                    onCancelOrder={handleCancelOrder}
                    isCancelling={isCancellingOrderId === order.orderId}
                    onReorder={handleReorder}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-4">
                  <History className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-800">No orders found</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  {orderFilter === 'ALL'
                    ? 'You have not submitted any orders yet. Add computer parts to your cart to get started.'
                    : `No orders currently match the "${orderFilter}" filter.`}
                </p>
                <button
                  onClick={() => {
                    setOrderFilter('ALL');
                    setActiveTab('store');
                  }}
                  className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Go to Store &amp; Build Order
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: INVENTORY ADMIN & AUTO-REORDER RULE MONITOR                      */}
        {/* ========================================================================= */}
        {activeTab === 'inventory' && (
          <div className="space-y-6 animate-fade-in">
            {/* Inventory Top KPI Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 font-medium">Catalog SKUs</span>
                  <div className="text-2xl font-black text-slate-900 mt-1">{inventory.length}</div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Package className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 font-medium">Total In-Stock Units</span>
                  <div className="text-2xl font-black text-emerald-600 mt-1">
                    {inventory.reduce((sum, i) => sum + i.stock, 0)}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 font-medium">Low Stock Alerts (&lt;5)</span>
                  <div className="text-2xl font-black text-amber-600 mt-1">
                    {lowStockCount}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 font-medium">Out of Stock</span>
                  <div className="text-2xl font-black text-rose-600 mt-1">
                    {inventory.filter((i) => i.stock === 0).length}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                  <AlertCircle className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Inventory Table Container */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <Package className="w-5 h-5 text-indigo-600" />
                    <span>Live Stock Levels &amp; Auto-Reorder Monitor</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Items dropping below 5 units automatically trigger a <code className="font-mono text-indigo-600 bg-indigo-50 px-1 rounded">LowStockEvent</code> domain notification.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleRestockAll}
                    disabled={isRestockingAll}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${isRestockingAll ? 'animate-spin' : ''}`} />
                    <span>Restock All to Defaults</span>
                  </button>

                  <button
                    onClick={handleManualRefresh}
                    disabled={isRefreshing}
                    className="p-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
                    title="Refresh Now"
                  >
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-6">Product &amp; SKU</th>
                      <th className="py-3.5 px-6">Category</th>
                      <th className="py-3.5 px-6">Available Stock</th>
                      <th className="py-3.5 px-6">Stock Health</th>
                      <th className="py-3.5 px-6">Auto-Reorder Rule</th>
                      <th className="py-3.5 px-6 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {inventory.map((item) => {
                      const meta = getProductMeta(item.productId, item.name);
                      const isLow = item.stock > 0 && item.stock < 5;
                      const isZero = item.stock === 0;

                      return (
                        <tr key={item.productId} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-4 px-6 flex items-center gap-3">
                            <img
                              src={meta.imageUrl}
                              alt={item.name}
                              className="w-10 h-10 object-cover rounded-xl border border-slate-200 shrink-0 bg-white"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded text-[11px]">
                                  {item.productId}
                                </span>
                                <span className="font-bold text-slate-900 text-xs">
                                  {item.name}
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-400">
                                Product ID: {item.productId}
                              </span>
                            </div>
                          </td>

                          <td className="py-4 px-6">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                              {meta.category}
                            </span>
                          </td>

                          <td className="py-4 px-6 font-mono font-bold text-sm text-slate-900">
                            {item.stock} units
                          </td>

                          <td className="py-4 px-6">
                            {isZero ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                                <AlertCircle className="w-3 h-3" />
                                Out of Stock
                              </span>
                            ) : isLow ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 animate-pulse">
                                <AlertTriangle className="w-3 h-3" />
                                Critical (&lt; 5)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" />
                                Healthy Stock
                              </span>
                            )}
                          </td>

                          <td className="py-4 px-6 text-[11px]">
                            {isLow ? (
                              <span className="text-amber-700 font-semibold flex items-center gap-1">
                                <Flame className="w-3.5 h-3.5 text-amber-500" />
                                LowStockEvent Published!
                              </span>
                            ) : isZero ? (
                              <span className="text-rose-600 font-medium">
                                Reorder Required immediately
                              </span>
                            ) : (
                              <span className="text-slate-400">Triggers if stock drops &lt; 5</span>
                            )}
                          </td>

                          <td className="py-4 px-6 text-right">
                            <button
                              onClick={() => {
                                handleAddToCart(item.productId, 1);
                                setIsCartOpen(true);
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                isZero
                                  ? 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                                  : 'bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600'
                              }`}
                            >
                              {isZero ? 'Add (Test Rollback)' : 'Add 1 to Cart'}
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

        {/* ========================================================================= */}
        {/* VIEW 4: NOTIFICATION MODULE & DOMAIN ACTIVITY FEED                       */}
        {/* ========================================================================= */}
        {activeTab === 'notifications' && (
          <div className="space-y-6 animate-fade-in">
            {/* Feed Header */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  <Bell className="w-6 h-6 text-indigo-600" />
                  <span>Domain Event Activity Feed</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Decoupled events consumed by <code className="font-mono text-indigo-600 bg-indigo-50 px-1 rounded">edu.cit.rabanal.notification</code> via Spring's <code className="font-mono text-indigo-600 bg-indigo-50 px-1 rounded">ApplicationEventPublisher</code>.
                </p>
              </div>

              {/* Event Type Filters */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl flex-wrap">
                {(['ALL', 'STOCK', 'CONFIRMED', 'CANCELLED', 'REJECTED'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setNotificationFilter(filter)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      notificationFilter === filter
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {filter === 'ALL'
                      ? 'All Events'
                      : filter === 'STOCK'
                      ? '⚠️ Stock Alerts'
                      : filter}
                  </button>
                ))}
              </div>
            </div>

            {/* Event Timeline Cards */}
            {filteredNotifications.length > 0 ? (
              <div className="space-y-3">
                {filteredNotifications.map((notif) => {
                  const isStockAlert =
                    notif.message.includes('LOW-STOCK') || notif.message.includes('ALERT');
                  const isConfirmed = notif.message.includes('confirmed');
                  const isCancelled = notif.message.includes('cancelled');
                  const isRejected = notif.message.includes('rejected');

                  const cardStyle = isStockAlert
                    ? 'border-amber-200 bg-amber-50/50 hover:bg-amber-50'
                    : isConfirmed
                    ? 'border-emerald-200 bg-emerald-50/30 hover:bg-emerald-50/60'
                    : isCancelled
                    ? 'border-amber-200 bg-slate-50 hover:bg-amber-50/40'
                    : isRejected
                    ? 'border-rose-200 bg-rose-50/30 hover:bg-rose-50/60'
                    : 'border-slate-200 bg-slate-50';

                  const badgeStyle = isStockAlert
                    ? 'bg-amber-100 text-amber-800 border-amber-200'
                    : isConfirmed
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    : isCancelled
                    ? 'bg-amber-100 text-amber-800 border-amber-200'
                    : 'bg-rose-100 text-rose-800 border-rose-200';

                  const notifDate = new Date(notif.createdAt);
                  const timeFormatted = isNaN(notifDate.getTime())
                    ? notif.createdAt
                    : notifDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

                  return (
                    <div
                      key={notif.notificationId}
                      className={`p-4 rounded-2xl border shadow-xs transition-all flex items-start gap-3.5 ${cardStyle}`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {isStockAlert ? (
                          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                            <AlertTriangle className="w-4 h-4" />
                          </div>
                        ) : isConfirmed ? (
                          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        ) : isCancelled ? (
                          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                            <RotateCcw className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                            <XCircle className="w-4 h-4" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${badgeStyle}`}
                            >
                              {isStockAlert
                                ? 'LowStockEvent'
                                : isConfirmed
                                ? 'OrderPlacedEvent'
                                : isCancelled
                                ? 'OrderCancelledEvent'
                                : 'OrderRejectedEvent'}
                            </span>
                            <span className="font-mono text-xs text-slate-400">
                              ID: #{notif.notificationId}
                            </span>
                          </div>

                          <span className="text-xs text-slate-400 font-mono">
                            {timeFormatted}
                          </span>
                        </div>

                        <p className="text-xs font-semibold text-slate-800 mt-1.5 leading-relaxed">
                          {notif.message}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-4">
                  <Bell className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-800">No domain events recorded</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Domain events will be recorded here when orders are placed, cancelled, or when inventory stock triggers the auto-reorder rule.
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Slide-Over Shopping Cart & Checkout Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        inventory={inventory}
        onUpdateQuantity={handleUpdateCartQty}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={handleClearCart}
        onSubmitOrder={handleSubmitOrder}
        isSubmitting={isSubmittingOrder}
      />

      {/* Product Deep Detail & Specifications Modal */}
      <ProductDetailModal
        meta={selectedDetail?.meta || null}
        stock={selectedDetail?.stock || 0}
        isOpen={Boolean(selectedDetail)}
        onClose={() => setSelectedDetail(null)}
        onAddToCart={handleAddToCart}
      />

      {/* Checkout Outcome & Atomic Rollback Modal */}
      <CheckoutSuccessModal
        result={orderResult}
        isOpen={isOrderResultModalOpen}
        onClose={() => setIsOrderResultModalOpen(false)}
        onViewOrders={() => setActiveTab('orders')}
      />

      {/* Clean Light-Mode Footer */}
      <footer className="mt-16 bg-white border-t border-slate-200 py-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <div className="font-bold text-slate-900">
              Rabanal's Computer Parts &amp; Services
            </div>
            <p className="text-slate-400 mt-0.5">
              In-Process Modular Monolith Architecture • CIT Department
            </p>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span className="hover:text-slate-600 cursor-pointer" onClick={() => setActiveTab('store')}>Storefront</span>
            <span>•</span>
            <span className="hover:text-slate-600 cursor-pointer" onClick={() => setActiveTab('orders')}>Orders</span>
            <span>•</span>
            <span className="hover:text-slate-600 cursor-pointer" onClick={() => setActiveTab('inventory')}>Inventory</span>
            <span>•</span>
            <span className="hover:text-slate-600 cursor-pointer" onClick={() => setActiveTab('notifications')}>Domain Activity</span>
          </div>

          <div className="text-slate-400 text-[11px] font-mono">
            Spring Boot 3.3.4 + React 18 + Supabase Pooler
          </div>
        </div>
      </footer>
    </div>
  );
};
