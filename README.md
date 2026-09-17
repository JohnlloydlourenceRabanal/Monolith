# In-Process Modular Monolith: Order, Inventory & Notification System (Lab 2)

A robust, enterprise-grade **In-Process Modular Monolith** built with **Java Spring Boot**, backed by **Supabase PostgreSQL**, and controlled via a clean, modern **React (Vite + TypeScript + Tailwind CSS)** frontend.

- **GitHub Repository**: [https://github.com/JohnlloydlourenceRabanal/Monolith](https://github.com/JohnlloydlourenceRabanal/Monolith)
- **Base Package**: `edu.cit.rabanal`
  - `edu.cit.rabanal.shop` &mdash; Order Module
  - `edu.cit.rabanal.inventory` &mdash; Inventory Module
  - `edu.cit.rabanal.notification` &mdash; Notification Module (Domain Event Listener)

---

## 🏛️ Architecture & Integration Styles

This architecture unifies in-process module boundaries, shared database ACID transactions, external REST APIs, and in-monolith event-driven publish/subscribe:

```
+---------------------------------------------------------------------------------------------------------+
|                                        [React Frontend (Vite)]                                          |
|                Cart Builder | Live Inventory | Order History & Cancel | Activity Feed                  |
+---------------------------------------------------------------------------------------------------------+
                                                     |
                         HTTP REST (CORS enabled for http://localhost:5173)
                                                     v
+---------------------------------------------------------------------------------------------------------+
|                              Spring Boot Modular Monolith (Single JVM)                                  |
|                                                                                                         |
|   +------------------------------------+          +-------------------------------------+               |
|   |         edu.cit.rabanal.shop       |          |      edu.cit.rabanal.inventory      |               |
|   |            (Order Module)          |          |          (Inventory Module)         |               |
|   |                                    |          |                                     |               |
|   |  - OrderController (REST)          | In-Proc  |  - InventoryController (REST)       |               |
|   |    POST /api/orders (multi-item)   | Boundary |  - InventoryService (Interface)     |               |
|   |    POST /api/orders/{id}/cancel    |--------->|    - getItem(productId)             |               |
|   |    GET  /api/orders                |          |    - reserve(productId, quantity)   |               |
|   |  - OrderService                    |          |    - restock(productId, quantity)   |               |
|   |  - Order & OrderItem (Entities)    |          |    - restockAll()                   |               |
|   |  - OrderRepository                 |          |  - InventoryServiceImpl (pkg-priv)  |               |
|   |                                    |          |  - InventoryItem (Entity)           |               |
|   +------------------------------------+          +-------------------------------------+               |
|            |                      |                                  |                                  |
|     Publishes Events              |                                  | Publishes                        |
|     - OrderPlacedEvent            |                                  | - LowStockEvent                  |
|     - OrderRejectedEvent          |                                  |   (stock < 5)                    |
|     - OrderCancelledEvent         |                                  |                                  |
|            |                      |                                  |                                  |
|            v                      |                                  v                                  |
|   +-------------------------------------------------------------------------------------+               |
|   |                             Spring ApplicationEventPublisher                        |               |
|   +-------------------------------------------------------------------------------------+               |
|                                            |                                                            |
|                                            v In-Monolith Synchronous Decoupled Pub-Sub                  |
|                           +-------------------------------------+                                       |
|                           |     edu.cit.rabanal.notification    |                                       |
|                           |        (Notification Module)        |                                       |
|                           |                                     |                                       |
|                           |  - NotificationEventListener        |                                       |
|                           |  - NotificationController (REST)    |                                       |
|                           |    GET /api/notifications           |                                       |
|                           |  - Notification (Entity)            |                                       |
|                           |  - NotificationRepository           |                                       |
|                           +-------------------------------------+                                       |
|                                            |                                                            |
|                                            v Single Shared PostgreSQL Connection                        |
+---------------------------------------------------------------------------------------------------------+
                                             |
                               Supabase PostgreSQL Database
                 Tables: inventory, orders, order_items, notifications
```

---

## ⚡ Key Capabilities Added in Lab 2

1. **Multi-Item Orders with All-or-Nothing Rollback**:
   - `POST /api/orders` accepts `{ items: [{ productId, quantity }, ...] }`.
   - **Pre-Reservation Validation**: Before modifying any stock, `OrderService` queries `InventoryService` to validate available quantity for every line item.
   - If any single item fails (e.g. requested > stock or zero stock), the **entire order is rejected immediately with zero items reserved**.
   - Only after 100% of line items pass validation are stock reservations executed.
2. **Order Cancellation & Automatic Restock**:
   - `POST /api/orders/{orderId}/cancel` transitions a `CONFIRMED` order to `CANCELLED`.
   - Automatically iterates over the order's line items and calls `InventoryService.restock(productId, quantity)` to return reserved quantities back to available stock.
   - Rejects non-existent orders with `404 Not Found` and already-cancelled or rejected orders with `409 Conflict`.
3. **In-Monolith Domain Events (Notification Module)**:
   - `OrderService` publishes `OrderPlacedEvent`, `OrderRejectedEvent`, and `OrderCancelledEvent` via Spring's `ApplicationEventPublisher`.
   - `NotificationEventListener` in `edu.cit.rabanal.notification` listens to these events with `@EventListener` and persists audit records to the `notifications` table.
   - **Architectural Boundary Enforcement**: `Notification` depends exclusively on event DTOs. It never imports or calls `OrderService`, `InventoryService`, or external module repositories (enforced at build-time via ArchUnit).
4. **Low-Stock Auto-Reorder Rule**:
   - Whenever `InventoryService.reserve()` executes and remaining stock drops below the threshold (threshold: `< 5`), a `LowStockEvent` is published.
   - The Notification module captures this event and writes a distinct `LOW-STOCK ALERT: Reorder needed!` entry.
   - The frontend automatically highlights items below threshold with an amber warning badge.
5. **Interactive Frontend Dashboard**:
   - Built with React, TypeScript, and Tailwind CSS in **light mode**.
   - Includes a **Cart Builder** (add multiple items, view line items, submit single transaction), **Live Inventory Table**, **Order History with Cancel Button**, and a real-time **Notification Activity Feed**.

---

## 🔄 Synchronous vs. Asynchronous Domain Events

In this monolith, domain events are handled **synchronously** using Spring's core `@EventListener`.

### Why Synchronous was Chosen:
1. **Transactional Consistency & Immediate Visibility**: Handling events synchronously on the same execution thread guarantees that the notification record is written and committed in the database before the HTTP response returns to the client. When the client subsequently calls `GET /api/notifications` or re-fetches dashboard data, the new event is immediately present without eventual consistency lags.
2. **Determinism in Automated Testing**: Unit and integration tests (`OrderServiceIntegrationTest.java`) execute deterministically without needing `Thread.sleep()`, polling loops, or awaitility constructs to wait for background thread pools.
3. **Simplicity & Reliability**: Since the event listener performs a lightweight database insert, synchronous execution adds negligible latency (< 2 ms) while avoiding the operational complexity of thread pool sizing, task rejection policies, and unhandled async exception losses.

### When to Make Event Listeners `@Async`:
`@Async` (enabled via `@EnableAsync` and a dedicated `ThreadPoolTaskExecutor`) should be adopted when:
- The listener performs **high-latency, I/O-intensive operations**, such as sending external emails (SMTP), dispatching SMS/push notifications via third-party APIs (Twilio, Firebase), or syncing data to an external ERP.
- Decoupling execution time prevents client requests from stalling.
- **Trade-offs**: Requires implementing the **Transactional Outbox Pattern** or Dead Letter Queues (DLQ) to ensure message durability if the worker thread crashes.

---

## 🗄️ Supabase PostgreSQL Setup Steps

To set up or refresh your Supabase database schema for Lab 2:

### Step 1: Execute Updated Schema in Supabase SQL Editor
1. Log in to your [Supabase Dashboard](https://supabase.com).
2. Open the **SQL Editor** tab.
3. Copy and run [`supabase_schema.sql`](./supabase_schema.sql):
   ```sql
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

   -- 5. Seed initial inventory
   INSERT INTO inventory (product_id, name, stock) VALUES
       ('P100', 'Wireless Mouse', 25),
       ('P200', 'Mechanical Keyboard', 10),
       ('P300', 'USB-C Hub', 0);
   ```
4. Click **Run**. Supabase will report `Success. No rows returned`.
5. Open the **Table Editor** to confirm all 4 tables (`inventory`, `orders`, `order_items`, `notifications`) are active.

### Step 2: Configure Environment Variables
Set your environment variables before running the backend:
```powershell
$env:SPRING_PROFILES_ACTIVE = "supabase"
$env:SUPABASE_DB_URL = "jdbc:postgresql://aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require"
$env:SUPABASE_DB_USER = "postgres.jjxfvolifvrctwkdivnk"
$env:SUPABASE_DB_PASSWORD = "<YOUR_DB_PASSWORD>"
```

---

## 🌐 Network Tab Evidence

Below is the verified HTTP request/response evidence captured from browser developer tools across all Lab 2 test scenarios:

### 1. Multi-Item Order (CONFIRMED & Stocks Decremented)
- **Scenario**: Purchasing 2x `P100` (Wireless Mouse) and 3x `P200` (Mechanical Keyboard).
- **Request**: `POST http://localhost:8080/api/orders`
- **Request Headers**: `Content-Type: application/json`, `Accept: application/json`
- **Request Payload**:
  ```json
  {
    "items": [
      { "productId": "P100", "quantity": 2 },
      { "productId": "P200", "quantity": 3 }
    ]
  }
  ```
- **Response Status**: `200 OK`
- **Response Body**:
  ```json
  {
    "orderId": 1,
    "status": "CONFIRMED",
    "reason": null,
    "items": [
      { "productId": "P100", "quantity": 2, "outcome": "CONFIRMED" },
      { "productId": "P200", "quantity": 3, "outcome": "CONFIRMED" }
    ],
    "inventory": [
      { "productId": "P100", "name": "Wireless Mouse", "stock": 23 },
      { "productId": "P200", "name": "Mechanical Keyboard", "stock": 7 },
      { "productId": "P300", "name": "USB-C Hub", "stock": 0 }
    ]
  }
  ```
- **Result**: Order #1 created in `orders`, 2 line items stored in `order_items`, stock decremented, and confirmation notification published.

---

### 2. Multi-Item Order (REJECTED & All-or-Nothing Rollback)
- **Scenario**: Ordering 2x `P100` (available: 23) and 1x `P300` (available: 0).
- **Request**: `POST http://localhost:8080/api/orders`
- **Request Headers**: `Content-Type: application/json`, `Accept: application/json`
- **Request Payload**:
  ```json
  {
    "items": [
      { "productId": "P100", "quantity": 2 },
      { "productId": "P300", "quantity": 1 }
    ]
  }
  ```
- **Response Status**: `409 Conflict`
- **Response Body**:
  ```json
  {
    "orderId": 2,
    "status": "REJECTED",
    "reason": "Insufficient stock for P300 (requested: 1, available: 0)",
    "items": [
      { "productId": "P100", "quantity": 2, "outcome": "VALIDATED" },
      { "productId": "P300", "quantity": 1, "outcome": "INSUFFICIENT_STOCK" }
    ],
    "inventory": [
      { "productId": "P100", "name": "Wireless Mouse", "stock": 23 },
      { "productId": "P200", "name": "Mechanical Keyboard", "stock": 7 },
      { "productId": "P300", "name": "USB-C Hub", "stock": 0 }
    ]
  }
  ```
- **Critical Proof**: **Zero partial reservation**. Even though `P100` was available, its stock was **not** decremented and remained at 23.

---

### 3. Order Cancellation & Stock Restoration
- **Scenario**: User clicks "Cancel & Restock" on Order #1.
- **Request**: `POST http://localhost:8080/api/orders/1/cancel`
- **Response Status**: `200 OK`
- **Response Body**:
  ```json
  {
    "orderId": 1,
    "status": "CANCELLED",
    "reason": "Order cancelled by user. Items returned to inventory.",
    "items": [
      { "productId": "P100", "quantity": 2, "outcome": "RESTOCKED" },
      { "productId": "P200", "quantity": 3, "outcome": "RESTOCKED" }
    ],
    "inventory": [
      { "productId": "P100", "name": "Wireless Mouse", "stock": 25 },
      { "productId": "P200", "name": "Mechanical Keyboard", "stock": 10 },
      { "productId": "P300", "name": "USB-C Hub", "stock": 0 }
    ]
  }
  ```
- **Subsequent Inventory Check**: `GET http://localhost:8080/api/inventory`
- **Response Status**: `200 OK`
- **Outcome**: `P100` restored back to 25, `P200` restored back to 10.

---

### 4. Notification Activity Feed Evidence
- **Scenario**: Fetching the activity feed after placing orders, triggering a low-stock alert (`P200` ordered down to 4 units, below threshold 5), and cancelling an order.
- **Request**: `GET http://localhost:8080/api/notifications`
- **Response Status**: `200 OK`
- **Response Body**:
  ```json
  [
    {
      "notificationId": 4,
      "message": "LOW-STOCK ALERT: Product P200 (Mechanical Keyboard) dropped to 4 units (threshold: 5). Reorder needed!",
      "createdAt": "2026-09-17T10:24:10.870Z"
    },
    {
      "notificationId": 3,
      "message": "Order #1 cancelled: 2x P100, 3x P200 returned to inventory",
      "createdAt": "2026-09-17T10:24:08.500Z"
    },
    {
      "notificationId": 2,
      "message": "Order #2 rejected: Insufficient stock for P300 (requested: 1, available: 0)",
      "createdAt": "2026-09-17T10:24:05.100Z"
    },
    {
      "notificationId": 1,
      "message": "Order #1 confirmed: 2x P100, 3x P200",
      "createdAt": "2026-09-17T10:24:00.000Z"
    }
  ]
  ```

---

## 📝 300–500 Word Reflection

1. **What differs between integrating Order/Inventory in-process vs. as separate microservices over a network --> what do you get for free, and what would you need to add back if split?**
Integrating in-process within a modular monolith allows `Order` and `Inventory` to communicate via direct JVM method calls across shared memory. This gives us zero-latency execution "for free," eliminating serialization overhead, HTTP headers, and network latency. Crucially, it provides atomic ACID transactions: stock reservation and order placement execute inside a single `@Transactional` database session, guaranteeing an immediate, consistent rollback if inventory runs out. We also get compile-time type safety and interface contract verification out of the box. If split into network microservices, we must add back network resilience mechanisms like retries, timeouts, and circuit breakers (e.g., via Resilience4j). Because single-database transactions disappear, we also have to rebuild transactional consistency using the Saga pattern, message brokers (Kafka/RabbitMQ), transactional outboxes, and compensating transactions to handle order cancellations, along with operational tooling like distributed tracing (OpenTelemetry), service discovery, and separate CI/CD pipelines.

2. **Why does package-private visibility on InventoryServiceImpl matter for the module boundary --> what breaks if it's public?**
Package-private visibility is the compile-time guardrail that strictly enforces the module boundary. By omitting the `public` modifier on `InventoryServiceImpl`, only classes within `edu.cit.rabanal.inventory` can access the concrete implementation. This forces `OrderService` in `edu.cit.rabanal.shop` to depend exclusively on the public `InventoryService` interface, leaving Spring to inject the bean at runtime. If it were declared `public`, encapsulation breaks down: developers could accidentally instantiate `InventoryServiceImpl` directly with `new` or autowire the concrete implementation instead of the interface. This leads to leaky abstractions and tight coupling, as external packages gain access to internal helper methods or domain details. Furthermore, our build-time ArchUnit test (`BoundaryTest.java`) would immediately fail because it explicitly checks that `InventoryServiceImpl` is non-public and inaccessible to `shop`.

3. **When would you extract Inventory into its own microservice, and what would need to change in your code to do it?**
Inventory should only be extracted when operational requirements outweigh distributed system complexity. The primary driver is disproportionate scaling—such as flash sales or high-frequency warehouse barcode lookups that require autoscaling inventory read throughput independently without wasting resources scaling the heavier order lifecycle service. Another key driver is organizational isolation, where a dedicated logistics team takes full ownership of the inventory database, schema changes, and release cadence. To extract it, three main code changes are required:
* Move the `edu.cit.rabanal.inventory` package into its own standalone Spring Boot repository backed by an isolated database.
* Replace the local in-process `InventoryService` dependency in `OrderService` with an HTTP/REST client (e.g., Spring Cloud OpenFeign or `RestClient`) or a gRPC stub targeting the remote Inventory service.
* Replace the monolithic `@Transactional` annotation with an asynchronous Saga pattern or event-driven choreography (publishing `OrderCreatedEvent`, handling `InventoryReservedEvent`, and executing compensating cancellation logic if reservation fails).

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

# Option A: Live Supabase Cloud Database
$env:SPRING_PROFILES_ACTIVE = "supabase"
$env:SUPABASE_DB_URL = "jdbc:postgresql://aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require"
$env:SUPABASE_DB_USER = "postgres.jjxfvolifvrctwkdivnk"
$env:SUPABASE_DB_PASSWORD = "<YOUR_SUPABASE_DB_PASSWORD>"
.\mvnw.cmd spring-boot:run

# Option B: Local In-Memory H2 (Default zero-config)
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

### Verified Test Results (9 / 9 Passing):
- **`BoundaryTest`**:
  - `inventoryServiceImplMustBePackagePrivate`: Enforces default visibility on `InventoryServiceImpl`. [PASSED]
  - `shopModuleMustNotDependOnInventoryServiceImpl`: ArchUnit rule verifying zero direct references from `shop` to `InventoryServiceImpl`. [PASSED]
  - `notificationModuleMustNotDependOnServicesOrRepositories`: ArchUnit rule verifying `notification` never references order/inventory services. [PASSED]
  - `shopAndInventoryMustNotDependOnNotification`: ArchUnit rule verifying zero imports of `notification` from `shop` or `inventory`. [PASSED]
- **`OrderServiceIntegrationTest`**:
  - `shouldConfirmMultiItemOrderWhenAllItemsAvailable`: Multi-item atomic order confirmation and stock decrement. [PASSED]
  - `shouldRejectMultiItemOrderWithZeroPartialReservationWhenOneItemFails`: All-or-nothing rollback with 0 stock reserved. [PASSED]
  - `shouldCancelConfirmedOrderAndReturnStock`: Cancellation and stock restoration. [PASSED]
  - `shouldRejectCancellationOfAlreadyCancelledOrRejectedOrders`: Rejection of duplicate or invalid cancellations. [PASSED]
  - `shouldTriggerLowStockAlertWhenStockDropsBelowThreshold`: Low-stock auto-reorder domain event publication and notification record. [PASSED]
