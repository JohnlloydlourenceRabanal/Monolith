import {
  InventoryItem,
  OrderRequest,
  OrderResponse,
  OrderRecord,
  NotificationRecord,
  SupplierOrderSummary,
} from '../types';

const API_BASE = 'http://localhost:8080/api';

export const api = {
  async getInventory(): Promise<InventoryItem[]> {
    const res = await fetch(`${API_BASE}/inventory`);
    if (!res.ok) {
      throw new Error(`Failed to load inventory: ${res.status}`);
    }
    return res.json();
  },

  async getOrders(): Promise<OrderRecord[]> {
    const res = await fetch(`${API_BASE}/orders`);
    if (!res.ok) {
      throw new Error(`Failed to load orders: ${res.status}`);
    }
    return res.json();
  },

  async placeOrder(request: OrderRequest): Promise<OrderResponse> {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    return res.json();
  },

  async cancelOrder(orderId: number): Promise<OrderResponse> {
    const res = await fetch(`${API_BASE}/orders/${orderId}/cancel`, {
      method: 'POST',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to cancel order: ${res.status}`);
    }
    return res.json();
  },

  async getNotifications(): Promise<NotificationRecord[]> {
    const res = await fetch(`${API_BASE}/notifications`);
    if (!res.ok) {
      throw new Error(`Failed to load notifications: ${res.status}`);
    }
    return res.json();
  },

  async restockAll(): Promise<InventoryItem[]> {
    const res = await fetch(`${API_BASE}/inventory/restock-all`, { method: 'POST' });
    if (!res.ok) {
      throw new Error(`Failed to restock inventory: ${res.status}`);
    }
    return res.json();
  },

  async getSupplierOrders(): Promise<SupplierOrderSummary[]> {
    const res = await fetch(`${API_BASE}/supplier/orders`);
    if (!res.ok) {
      throw new Error(`Failed to load supplier orders: ${res.status}`);
    }
    return res.json();
  },

  async pollSupplierOrders(): Promise<void> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch(`${API_BASE}/supplier/poll`, {
        method: 'POST',
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(`Failed to poll supplier orders: ${res.status}`);
      }
    } finally {
      clearTimeout(timeoutId);
    }
  },

  async getSupplierConfig(): Promise<{ clientId: string; hasApiKey: boolean }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    try {
      const res = await fetch(`${API_BASE}/supplier/config`, { signal: controller.signal });
      if (!res.ok) {
        throw new Error(`Failed to get supplier config: ${res.status}`);
      }
      return res.json();
    } finally {
      clearTimeout(timeoutId);
    }
  },

  async setSupplierApiKey(apiKey: string): Promise<void> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    try {
      const res = await fetch(`${API_BASE}/supplier/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(`Failed to set API key: ${res.status}`);
      }
    } finally {
      clearTimeout(timeoutId);
    }
  },

  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/inventory`);
      return res.ok;
    } catch {
      return false;
    }
  },
};
