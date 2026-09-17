export interface ProductMetadata {
  productId: string;
  name: string;
  category: 'Peripherals' | 'Accessories' | 'Components';
  rating: number;
  reviewsCount: number;
  badge?: string;
  specs: string[];
  description: string;
  imageUrl: string;
}

export const PRODUCT_CATALOG_METADATA: Record<string, ProductMetadata> = {
  P100: {
    productId: 'P100',
    name: 'Wireless Mouse',
    category: 'Peripherals',
    rating: 4.9,
    reviewsCount: 184,
    badge: 'Popular',
    specs: [
      'Optical Sensor',
      '2.4GHz Wireless Connectivity',
      'Ergonomic Hand Grip',
      'Rechargeable Battery'
    ],
    description: 'High-precision wireless optical mouse for smooth tracking and comfortable productivity.',
    imageUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=600&auto=format&fit=crop&q=80'
  },
  P200: {
    productId: 'P200',
    name: 'Mechanical Keyboard',
    category: 'Peripherals',
    rating: 4.8,
    reviewsCount: 126,
    badge: 'Featured',
    specs: [
      'Tactile Switches',
      'Customizable Backlighting',
      'Durable Keycaps',
      'USB Connectivity'
    ],
    description: 'Durable mechanical keyboard with tactile switches for responsive feedback and gaming.',
    imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&auto=format&fit=crop&q=80'
  },
  P300: {
    productId: 'P300',
    name: 'USB-C Hub',
    category: 'Accessories',
    rating: 4.7,
    reviewsCount: 79,
    specs: [
      'Multi-Port USB Expansion',
      'HDMI 4K Output',
      'Power Delivery Pass-Through',
      'Compact Aluminum Shell'
    ],
    description: 'Versatile multi-port USB-C adapter expanding connectivity for modern workstations.',
    imageUrl: '/images/usb_c_hub.jpg'
  }
};

export function getProductMeta(productId: string, fallbackName?: string): ProductMetadata {
  if (PRODUCT_CATALOG_METADATA[productId]) {
    const meta = PRODUCT_CATALOG_METADATA[productId];
    return {
      ...meta,
      name: fallbackName || meta.name,
    };
  }
  return {
    productId,
    name: fallbackName || productId,
    category: 'Components',
    rating: 4.7,
    reviewsCount: 20,
    specs: ['Standard Component', 'Tested Hardware'],
    description: 'Hardware item in modular monolith inventory.',
    imageUrl: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=600&auto=format&fit=crop&q=80'
  };
}
