export interface InventoryItem {
  productId: string;
  name: string;
  stock: number;
}

export interface OrderRequest {
  productId: string;
  quantity: number;
}

export interface OrderResponse {
  status: 'CONFIRMED' | 'REJECTED';
  reason: string | null;
  inventory: InventoryItem | null;
}

export interface OrderRecord {
  orderId: number;
  productId: string;
  quantity: number;
  status: 'CONFIRMED' | 'REJECTED';
  reason: string | null;
  createdAt: string;
}
