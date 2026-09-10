export interface Product {
  id: number;
  sku: string;
  name: string;
  description: string;
  price: number;
  availableQuantity: number;
  reservedQuantity: number;
}

export interface OrderItem {
  id: number;
  sku: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Order {
  id: number;
  customerEmail: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED' | 'CANCELLED';
  totalAmount: number;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
  integrationStyleSummary?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export interface IntegrationTrace {
  id: string;
  timestamp: string;
  type: 'CLIENT_TO_SERVICE' | 'MODULE_TO_MODULE' | 'SERVICE_TO_DATABASE';
  title: string;
  description: string;
  durationMs: number | string;
  status: 'success' | 'warning' | 'error';
  payload?: any;
}
