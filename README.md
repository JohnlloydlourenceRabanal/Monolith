# In-Process Modular Monolith: Order & Inventory Management System

A production-ready **In-Process Modular Monolith** implementing an **Order & Inventory Management System** built with **Java Spring Boot**, backed by **Supabase PostgreSQL**, and paired with a modern, responsive **React (Vite + TypeScript + Tailwind CSS)** frontend.

- **GitHub Repository**: [https://github.com/JohnlloydlourenceRabanal/Monolith](https://github.com/JohnlloydlourenceRabanal/Monolith)
- **Base Package**: `edu.cit.rabanal`
- **Database**: Supabase PostgreSQL (Cloud) & H2 (Local In-Memory)

---

## 🏛️ Architecture & Integration Styles

This project demonstrates three distinct software integration styles working in harmony:

```
+---------------------------------------------------------------------------------------+
|                                [React Frontend (Vite)]                                |
|                        Light-Mode Responsive UI (Port 5173)                           |
+---------------------------------------------------------------------------------------+
                                           |
                               Style 1: REST over HTTP
                       POST /api/orders, GET /api/inventory, GET /api/orders
                                           |
                                           v
+---------------------------------------------------------------------------------------+
|                       Spring Boot Modular Monolith (Single JVM)                       |
|                                                                                       |
|   +------------------------------------+    +-------------------------------------+   |
|   |         edu.cit.rabanal.shop       |    |      edu.cit.rabanal.inventory      |   |
|   |            (Order Module)          |    |          (Inventory Module)         |   |
|   |                                    |    |                                     |   |
|   |  - OrderController (REST API)      |    |  - InventoryController (REST API)   |   |
|   |  - OrderService                    |    |  - InventoryService (Public API)    |   |
|   |  - Order (JPA Entity)              |    |  - InventoryServiceImpl (pkg-priv)  |   |
|   |  - OrderRepository                 |    |  - InventoryItem (JPA Entity)       |   |
|   |                                    |    |  - InventoryRepository              |   |
|   |                         Style 2: In-Process Boundary                          |   |
|   |  OrderService -------------------->|==>  InventoryService (Interface)         |   |
|   |  (No network overhead, <0.1ms)     |    - getItem(productId)                  |   |
|   |                                    |    - deductStock(productId, qty)         |   |
|   |                                    |    - restockAll()                        |   |
|   +------------------------------------+    +-------------------------------------+   |
|                     \                                     /                           |
|                      \                                   /                            |
|                       \                                 /                             |
|                    Style 3: Single ACID Database Transaction                          |
+---------------------------------------------------------------------------------------+
                                           |
                              PostgreSQL Pooler (Port 6543)
                                           |
                                           v
+---------------------------------------------------------------------------------------+
|                            Supabase PostgreSQL Database                               |
|                         Tables: inventory, orders                                     |
+---------------------------------------------------------------------------------------+
```

1. **In-Process Boundary Enforced Integration (`Order` ➔ `Inventory`)**:
   - `OrderService` interacts with the inventory domain solely via the public `InventoryService` interface.
   - `InventoryServiceImpl` is strictly declared with **package-private visibility** (no `public` modifier), preventing direct instantiation or coupling from the `shop` package.
   - Boundary rules are verified at compile/test time using **ArchUnit** in `BoundaryTest.java`.
2. **Service-to-Database Integration (Supabase PostgreSQL)**:
   - Shared PostgreSQL database hosted on Supabase Cloud.
   - Atomic database operations ensure stock validation, stock decrement, and order audit trail entries happen reliably.
3. **External Client Integration via REST**:
   - Modern React client communicates over HTTP:
     - `POST /api/orders` &mdash; Places an order (`200 OK` on confirmation, `409 CONFLICT` on stock rejection).
     - `GET /api/inventory` &mdash; Retrieves real-time stock levels.
     - `POST /api/inventory/restock` &mdash; Resets stock to specified levels: Wireless Mouse (`P100`) = 25, Mechanical Keyboard (`P200`) = 10, USB-C Hub (`P300`) = 0.
     - `GET /api/orders` &mdash; Retrieves the full historical log of confirmed and rejected orders.

---

## 🗄️ Supabase PostgreSQL Setup Guide

Follow these steps to connect the application to your Supabase PostgreSQL instance:

### Step 1: Create Supabase Project
1. Log in to [Supabase](https://supabase.com).
2. Create a new project (e.g., `Monolith`) in your preferred region (e.g., `ap-south-1` South Asia / Mumbai).
3. Note your database password and Project Reference ID (e.g., `jjxfvolifvrctwkdivnk`).

### Step 2: Execute Database Schema & Seed Data
1. Navigate to the **SQL Editor** tab in your Supabase dashboard.
2. Open and paste the contents of [`supabase_schema.sql`](./supabase_schema.sql):
   ```sql
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

   -- 3. Seed required initial products
   INSERT INTO inventory (product_id, name, stock) VALUES
       ('P100', 'Wireless Mouse', 25),
       ('P200', 'Mechanical Keyboard', 10),
       ('P300', 'USB-C Hub', 0)
   ON CONFLICT (product_id) DO UPDATE
   SET name = EXCLUDED.name,
       stock = EXCLUDED.stock;
   ```
3. Click **Run**. Verify that `Success. No rows returned` is reported.
4. Check **Table Editor** to confirm `inventory` has 3 seeded records and `orders` is initialized.

### Step 3: Configure Spring Boot Connection
1. In Supabase, navigate to **Project Settings** ➔ **Database** ➔ **Connection string**.
2. Select **URI** under **Connection Pooling** (Port `6543`, Session mode).
   - Format: `jdbc:postgresql://aws-0-<REGION>.pooler.supabase.com:6543/postgres?sslmode=require`
   - Username: `postgres.<PROJECT_REF>`
3. Set your environment variables or provide them via PowerShell:
   ```powershell
   $env:SPRING_PROFILES_ACTIVE = "supabase"
   $env:SUPABASE_DB_URL = "jdbc:postgresql://aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require"
   $env:SUPABASE_DB_USER = "postgres.jjxfvolifvrctwkdivnk"
   $env:SUPABASE_DB_PASSWORD = "<YOUR_SUPABASE_DB_PASSWORD>"
   ```

---

## 🌐 Network Tab Evidence

The following captures the exact HTTP transactions observed in the browser developer tools (Network tab) when placing confirmed and rejected orders.

### 1. Confirmed Order (Sufficient Stock)
<img width="1919" height="1003" alt="image" src="https://github.com/user-attachments/assets/34299757-5e41-47df-9a3d-418a72f5c037" />

- **Action**: Purchasing 2 units of `P100` (Wireless Mouse, initial stock: 25).
- **Request URL**: `POST http://localhost:8080/api/orders`
- **Request Headers**:
  - `Content-Type: application/json`
  - `Accept: application/json`
- **Request Payload**:
  ```json
  {
    "productId": "P100",
    "quantity": 2
  }
  ```
- **Response Status**: `200 OK`
- **Response Headers**:
  - `Content-Type: application/json`
- **Response Payload**:
  ```json
  {
    "status": "CONFIRMED",
    "reason": null,
    "inventory": {
      "productId": "P100",
      "name": "Wireless Mouse",
      "stock": 23
    }
  }
  ```
- **Database Outcome**:
  - `inventory`: `P100` stock decremented from 25 to 23.
  - `orders`: New row inserted with `status = 'CONFIRMED'`, `quantity = 2`, `reason = null`.

---

### 2. Rejected Order (Insufficient Stock)
<img width="1919" height="991" alt="image" src="https://github.com/user-attachments/assets/f47e3273-db2c-4be5-a5c7-ecb90242a212" />

- **Action**: Attempting to purchase 1 unit of `P300` (USB-C Hub, initial stock: 0).
- **Request URL**: `POST http://localhost:8080/api/orders`
- **Request Headers**:
  - `Content-Type: application/json`
  - `Accept: application/json`
- **Request Payload**:
  ```json
  {
    "productId": "P300",
    "quantity": 1
  }
  ```
- **Response Status**: `409 Conflict`
- **Response Headers**:
  - `Content-Type: application/json`
- **Response Payload**:
  ```json
  {
    "status": "REJECTED",
    "reason": "Insufficient stock for product P300. Requested: 1, Available: 0",
    "inventory": {
      "productId": "P300",
      "name": "USB-C Hub",
      "stock": 0
    }
  }
  ```
- **Database Outcome**:
  - `inventory`: `P300` stock remains unchanged at 0.
  - `orders`: New row inserted with `status = 'REJECTED'`, `reason = 'Insufficient stock for product P300. Requested: 1, Available: 0'`.

---

## 📝 300–500 Word Reflection

Working on this modular monolith project really made me appreciate how much you get out of the box before even thinking about microservices. Keeping the Order and Inventory modules in-process means they talk through simple JVM method calls in shared memory. There's virtually zero latency—no JSON serialization, no HTTP overhead, and no waiting on the network. But the biggest win is transactional safety. Both reserving stock and placing the order happen inside a single @Transactional database session. If the stock isn't there, the whole thing rolls back automatically. Plus, the compiler and ArchUnit catch bad imports or interface mismatches immediately. If we split this into separate services over a network tomorrow, all of that simplicity vanishes. We’d suddenly have to worry about network drops, circuit breakers via Resilience4j, timeouts, and retries. Even worse, we'd lose plain old ACID transactions and have to wire up message queues like Kafka, an outbox pattern, and compensating transactions with the Saga pattern just to keep data in sync, on top of managing Docker setups and distributed tracing.

Setting InventoryServiceImpl to package-private was an eye-opener for me in terms of clean code boundaries. By dropping the public keyword, only classes inside edu.cit.rabanal.inventory can actually see the concrete class. This practically forces OrderService over in edu.cit.rabanal.shop to talk strictly to the InventoryService interface, leaving Spring to inject the bean at runtime. If we made the implementation public, it would be way too easy for someone to just write new InventoryServiceImpl() or autowire the class directly. That leaks internal implementation details across packages and tightly couples the code. Keeping it package-private makes sure our BoundaryTest.java ArchUnit test passes, stopping developers from creating bad architectural dependencies before the code even gets built.

That said, I realize microservices aren't "bad"—they just need a practical reason to exist. Moving Inventory into its own service really only makes sense if the workload demands it. For instance, if warehouse barcode scanners or flash sale traffic hit the inventory database with tens of thousands of read requests a minute, it makes sense to scale that piece horizontally without wasting resources spinning up more heavy order processing nodes. Another valid reason is team growth; if a separate logistics team takes over stock management and needs to deploy updates without touching our codebase, splitting it off makes life easier. Pulling that off would mean moving edu.cit.rabanal.inventory into its own repo with separate database credentials, swapping out local method calls in OrderService for a REST client or gRPC, and replacing the single transaction with event-driven messaging and cancellation steps to handle failures cleanly.

---

## 🚀 Running the Application

### Prerequisites
- Java 21+ (or JDK 26)
- Node.js 18+ and npm
- Maven (or included Maven Wrapper `mvnw.cmd`)

### 1. Run Backend
```powershell
cd backend
$env:JAVA_HOME = "C:\Program Files\Java\jdk-26.0.2.1"

# Option A: Run with Supabase profile
$env:SPRING_PROFILES_ACTIVE = "supabase"
$env:SUPABASE_DB_URL = "jdbc:postgresql://aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require"
$env:SUPABASE_DB_USER = "postgres.jjxfvolifvrctwkdivnk"
$env:SUPABASE_DB_PASSWORD = "<YOUR_SUPABASE_DB_PASSWORD>"
.\mvnw.cmd spring-boot:run

# Option B: Run with in-memory H2 profile (Zero-config default)
.\mvnw.cmd spring-boot:run
```
Backend starts on `http://localhost:8080`.

### 2. Run Frontend
In a separate terminal:
```powershell
cd frontend
npm install
npm run dev
```
Frontend starts on `http://localhost:5173`.

---

## 🧪 Running Automated Tests

Run the full verification test suite:
```powershell
cd backend
$env:JAVA_HOME = "C:\Program Files\Java\jdk-26.0.2.1"
.\mvnw.cmd test
```

### Verified Test Suites:
- **`BoundaryTest`**:
  - `inventoryServiceImplMustBePackagePrivate`: Enforces default visibility on `InventoryServiceImpl`.
  - `shopModuleMustNotDependOnInventoryServiceImpl`: ArchUnit rule verifying zero direct references from `shop` to `InventoryServiceImpl`.
- **`OrderServiceIntegrationTest`**:
  - `shouldConfirmOrderWhenStockIsSufficient`: Confirms stock decrement and successful order record creation.
  - `shouldRejectOrderWhenItemOutOfStock`: Confirms zero-stock rejection with reason message and untouched stock.
  - `shouldRejectOrderWhenRequestedQuantityExceedsStock`: Confirms over-quantity rejection and stock preservation.
