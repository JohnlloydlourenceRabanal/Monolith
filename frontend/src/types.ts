export interface InventoryItem {
  productId: string;
  name: string;
  stock: number;
}

export interface OrderItemRequest {
  productId: string;
  quantity: number;
}

export interface OrderRequest {
  items: OrderItemRequest[];
}

export interface OrderItemOutcome {
  productId: string;
  quantity: number;
  outcome: string;
}

export interface OrderResponse {
  orderId: number;
  status: 'CONFIRMED' | 'REJECTED' | 'CANCELLED';
  reason: string | null;
  items: OrderItemOutcome[];
  inventory: InventoryItem[];
}

export interface OrderItemRecord {
  itemId: number;
  productId: string;
  quantity: number;
}

export interface OrderRecord {
  orderId: number;
  status: 'CONFIRMED' | 'REJECTED' | 'CANCELLED';
  reason: string | null;
  createdAt: string;
  items: OrderItemRecord[];
}

export interface NotificationRecord {
  notificationId: number;
  message: string;
  createdAt: string;
}

export interface CartItem {
  productId: string;
  name: string;
  quantity: number;
  stock: number;
  category?: string;
}
