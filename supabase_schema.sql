-- ==========================================================
-- Supabase PostgreSQL Schema & Seed Script
-- Project: In-Process Modular Monolith (Order & Inventory)
-- Package: edu.cit.rabanal
-- ==========================================================

-- 1. Create the inventory table
CREATE TABLE IF NOT EXISTS inventory (
    product_id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    stock INT NOT NULL CHECK (stock >= 0)
);

-- 2. Create the orders table
CREATE TABLE IF NOT EXISTS orders (
    order_id BIGSERIAL PRIMARY KEY,
    product_id VARCHAR(64) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    status VARCHAR(32) NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3. Seed initial inventory
-- Requirements: P100 (Wireless Mouse) = 25, P200 (Mechanical Keyboard) = 10, P300 (USB-C Hub) = 0
INSERT INTO inventory (product_id, name, stock) VALUES
    ('P100', 'Wireless Mouse', 25),
    ('P200', 'Mechanical Keyboard', 10),
    ('P300', 'USB-C Hub', 0)
ON CONFLICT (product_id) DO UPDATE
SET name = EXCLUDED.name,
    stock = EXCLUDED.stock;
