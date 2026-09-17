import {
  InventoryItem,
  OrderRequest,
  OrderResponse,
  OrderRecord,
  NotificationRecord,
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

  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/inventory`);
      return res.ok;
    } catch {
      return false;
    }
  },
};
