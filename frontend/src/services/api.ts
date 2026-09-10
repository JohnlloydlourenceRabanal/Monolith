import { ApiResponse, Order, Product } from '../types';

const API_BASE = 'http://localhost:8080/api';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  const json: ApiResponse<T> = await res.json().catch(() => ({
    success: false,
    message: `HTTP ${res.status}: ${res.statusText}`,
    data: null as any,
    timestamp: new Date().toISOString(),
  }));

  if (!res.ok || !json.success) {
    throw new Error(json.message || `Request failed with status ${res.status}`);
  }

  return json.data;
}

export const api = {
  // Inventory
  async getInventory(): Promise<Product[]> {
    return request<Product[]>('/inventory');
  },

  async restock(sku: string, amount: number): Promise<Product> {
    return request<Product>('/inventory/restock', {
      method: 'POST',
      body: JSON.stringify({ sku, amount }),
    });
  },

  // Orders
  async getOrders(): Promise<Order[]> {
    return request<Order[]>('/orders');
  },

  async createOrder(customerEmail: string, items: { sku: string; quantity: number }[]): Promise<Order> {
    return request<Order>('/orders', {
      method: 'POST',
      body: JSON.stringify({ customerEmail, items }),
    });
  },

  // Health check
  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/inventory`, { method: 'GET' });
      return res.ok;
    } catch {
      return false;
    }
  },
};
