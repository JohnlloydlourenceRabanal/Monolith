import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { ArchitectureTracker } from './components/ArchitectureTracker';
import { InventoryManager } from './components/InventoryManager';
import { OrderForm } from './components/OrderForm';
import { OrderList } from './components/OrderList';
import { api } from './services/api';
import { Product, Order, IntegrationTrace } from './types';

export const App: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [traces, setTraces] = useState<IntegrationTrace[]>([]);
  const [backendConnected, setBackendConnected] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [submittingOrder, setSubmittingOrder] = useState<boolean>(false);

  const addTrace = useCallback((trace: Omit<IntegrationTrace, 'id' | 'timestamp'>) => {
    const newTrace: IntegrationTrace = {
      ...trace,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
    };
    setTraces((prev) => [newTrace, ...prev.slice(0, 49)]);
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const isHealthy = await api.checkHealth();
      setBackendConnected(isHealthy);

      if (isHealthy) {
        const [invData, orderData] = await Promise.all([
          api.getInventory(),
          api.getOrders(),
        ]);
        setProducts(invData);
        setOrders(orderData);
      }
    } catch (err) {
      setBackendConnected(false);
      console.error('Error connecting to backend:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // 10s auto-refresh
    return () => clearInterval(interval);
  }, [loadData]);

  // Handle Order Placement
  const handleOrderSubmit = async (email: string, sku: string, quantity: number) => {
    setSubmittingOrder(true);
    const startRest = performance.now();

    try {
      // 1. External Client -> Spring Boot REST
      const order = await api.createOrder(email, [{ sku, quantity }]);
      const restDuration = (performance.now() - startRest).toFixed(1);

      addTrace({
        type: 'CLIENT_TO_SERVICE',
        title: `POST /api/orders (${sku} x${quantity})`,
        description: `External React client dispatched HTTP request to Spring Boot OrderController. Received HTTP 201 CREATED.`,
        durationMs: `${restDuration}ms HTTP`,
        status: 'success',
      });

      // 2. In-Process Boundary Integration
      addTrace({
        type: 'MODULE_TO_MODULE',
        title: `OrderService ➔ InventoryModuleApi.checkAndReserveStock()`,
        description: `In-process Java method call across module boundary. Stock deducted in-memory with zero network overhead.`,
        durationMs: '< 0.1ms In-Process',
        status: 'success',
      });

      // 3. Service to Supabase Database Integration
      addTrace({
        type: 'SERVICE_TO_DATABASE',
        title: `Supabase Postgres: ACID Txn Committed (Order #${order.id})`,
        description: `Single database transaction: 'orders', 'order_items', and 'inventory_stocks' updated atomically.`,
        durationMs: 'ACID Committed',
        status: 'success',
      });

      // Refresh data
      await loadData();
    } catch (error: any) {
      const restDuration = (performance.now() - startRest).toFixed(1);

      addTrace({
        type: 'CLIENT_TO_SERVICE',
        title: `POST /api/orders Failed: ${error.message}`,
        description: `Backend returned error response. Stock availability check or validation triggered clean rollback.`,
        durationMs: `${restDuration}ms`,
        status: 'error',
      });

      throw error;
    } finally {
      setSubmittingOrder(false);
    }
  };

  // Handle Restock
  const handleRestock = async (sku: string, amount: number) => {
    const startRest = performance.now();
    try {
      await api.restock(sku, amount);
      const restDuration = (performance.now() - startRest).toFixed(1);

      addTrace({
        type: 'CLIENT_TO_SERVICE',
        title: `POST /api/inventory/restock (${sku} +${amount})`,
        description: `Restock request completed successfully via InventoryController REST API.`,
        durationMs: `${restDuration}ms HTTP`,
        status: 'success',
      });

      addTrace({
        type: 'SERVICE_TO_DATABASE',
        title: `Supabase Postgres: inventory_stocks updated for ${sku}`,
        description: `Pessimistic row lock acquired; availableQuantity increased by ${amount}.`,
        durationMs: 'Row Updated',
        status: 'success',
      });

      await loadData();
    } catch (error: any) {
      addTrace({
        type: 'CLIENT_TO_SERVICE',
        title: `Restock failed: ${error.message}`,
        description: 'Failed to update inventory in database.',
        durationMs: 'Error',
        status: 'error',
      });
      throw error;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased">
      <Header
        backendConnected={backendConnected}
        onRefresh={loadData}
        loading={loading}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Architecture Inspector & Live Call Traces */}
        <ArchitectureTracker
          traces={traces}
          onClearTraces={() => setTraces([])}
        />

        {/* Dashboard Grid: Left side Forms/Inventory, Right side Order History */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Order Placement Form */}
          <div className="lg:col-span-5 space-y-8">
            <OrderForm
              products={products}
              onSubmitOrder={handleOrderSubmit}
              submitting={submittingOrder}
            />

            <OrderList
              orders={orders}
              loading={loading}
            />
          </div>

          {/* Real-time Inventory Catalog */}
          <div className="lg:col-span-7">
            <InventoryManager
              products={products}
              onRestock={handleRestock}
              loading={loading}
            />
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-800 bg-slate-900/60 py-6 text-center text-xs text-slate-500">
        <p>
          Modular Monolith Architecture Demo &bull; In-Process Boundary &bull; Supabase Postgres &bull; Spring Boot + React
        </p>
      </footer>
    </div>
  );
};
