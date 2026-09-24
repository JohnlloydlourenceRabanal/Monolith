-- ==========================================================
-- Supabase PostgreSQL Schema & Seed Script (Lab 2)
-- Project: In-Process Modular Monolith (Order & Inventory)
-- Package: edu.cit.rabanal
-- ==========================================================

-- Clean slate: drop tables in reverse dependency order
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;

-- 1. Create inventory table
CREATE TABLE inventory (
    product_id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    stock INT NOT NULL CHECK (stock >= 0)
);

-- 2. Create orders table
CREATE TABLE orders (
    order_id BIGSERIAL PRIMARY KEY,
    status VARCHAR(32) NOT NULL, -- 'CONFIRMED', 'REJECTED', 'CANCELLED'
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3. Create order_items table for multi-item orders
CREATE TABLE order_items (
    item_id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    product_id VARCHAR(64) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0)
);

-- 4. Create notifications table for in-monolith domain events
CREATE TABLE notifications (
    notification_id BIGSERIAL PRIMARY KEY,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 5. Create supplier_orders table for Lab 3 Anti-Corruption Layer
CREATE TABLE supplier_orders (
    id BIGSERIAL PRIMARY KEY,
    product_id VARCHAR(64) NOT NULL,
    buyer_ref VARCHAR(40) NOT NULL UNIQUE,
    request_id VARCHAR(80) NOT NULL UNIQUE,
    po_number VARCHAR(64),
    cases INT NOT NULL,
    units INT NOT NULL,
    status VARCHAR(32) NOT NULL, -- 'PENDING', 'SUBMITTED', 'PICKING', 'SHIPPED', 'DELIVERED', 'FAILED'
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 6. Seed initial inventory
-- Requirements: P100 (Wireless Mouse) = 25, P200 (Mechanical Keyboard) = 10, P300 (USB-C Hub) = 0
INSERT INTO inventory (product_id, name, stock) VALUES
    ('P100', 'Wireless Mouse', 25),
    ('P200', 'Mechanical Keyboard', 10),
    ('P300', 'USB-C Hub', 0);
