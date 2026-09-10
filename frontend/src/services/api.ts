import { InventoryItem, OrderRequest, OrderResponse, NetworkEvidence } from '../types';

const API_BASE = 'http://localhost:8080/api';

export const api = {
  async getInventory(): Promise<InventoryItem[]> {
    const res = await fetch(`${API_BASE}/inventory`);
    if (!res.ok) {
      throw new Error(`Failed to load inventory: ${res.status}`);
    }
    return res.json();
  },

  async placeOrder(request: OrderRequest): Promise<{ response: OrderResponse; evidence: NetworkEvidence }> {
    const start = performance.now();
    const url = `${API_BASE}/orders`;
    const headers = { 'Content-Type': 'application/json' };

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });

    const durationMs = Math.round(performance.now() - start);
    const data: OrderResponse = await res.json();

    const evidence: NetworkEvidence = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      method: 'POST',
      url,
      statusCode: res.status,
      requestHeaders: headers,
      requestBody: request,
      responseBody: data,
      durationMs,
    };

    return { response: data, evidence };
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
