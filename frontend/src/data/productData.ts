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

export interface ServiceItem {
  id: string;
  name: string;
  category: 'Services';
  duration: string;
  rating: number;
  reviewsCount: number;
  description: string;
  icon: string;
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

export const SERVICES_CATALOG: ServiceItem[] = [
  {
    id: 'SRV-01',
    name: 'Custom Gaming PC Assembly & Cable Management',
    category: 'Services',
    duration: '2-4 Hours',
    rating: 5.0,
    reviewsCount: 64,
    description: 'Professional hardware assembly, neat zip-tie harness cable routing, BIOS setup, and optimal fan curve tuning.',
    icon: 'Cpu'
  },
  {
    id: 'SRV-02',
    name: 'Thermal Paste Repaste & Deep Dust Sanitization',
    category: 'Services',
    duration: '1 Hour',
    rating: 4.9,
    reviewsCount: 93,
    description: 'Arctic thermal compound application, GPU heatsink ultrasonic cleaning, and thermal benchmark report.',
    icon: 'Wrench'
  },
  {
    id: 'SRV-03',
    name: 'OS Clean Install, Driver Suite & Hardware Diagnostics',
    category: 'Services',
    duration: '1-2 Hours',
    rating: 4.9,
    reviewsCount: 51,
    description: 'Clean OS installation, memory MemTest86 verification, SMART disk health check, and diagnostic validation.',
    icon: 'ShieldCheck'
  }
];

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
