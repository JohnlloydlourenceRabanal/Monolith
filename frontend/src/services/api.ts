import { InventoryItem, OrderRequest, OrderResponse, OrderRecord } from '../types';

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

  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/inventory`);
      return res.ok;
    } catch {
      return false;
    }
  },

  async restockAll(): Promise<InventoryItem[]> {
    const res = await fetch(`${API_BASE}/inventory/restock-all`, { method: 'POST' });
    if (!res.ok) {
      throw new Error(`Failed to restock inventory: ${res.status}`);
    }
    return res.json();
  },
};
