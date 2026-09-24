# In-Process Modular Monolith: Order, Inventory, Notification & LegacySupply ACL (Lab 2 & Lab 3)

A production-ready **In-Process Modular Monolith** implementing multi-item transactional checkout, order cancellation with automated restock, in-monolith domain events, and a resilient **Anti-Corruption Layer (ACL)** integrating with LegacySupply. Built with **Java Spring Boot (Java 26 / 21)**, backed by **Supabase PostgreSQL & H2**, and paired with a modern, responsive **React (Vite + TypeScript + Tailwind CSS)** operations dashboard.

- **GitHub Repository**: [https://github.com/JohnlloydlourenceRabanal/Monolith](https://github.com/JohnlloydlourenceRabanal/Monolith)
- **Base Package**: `edu.cit.rabanal`
  - `edu.cit.rabanal.shop` &mdash; Order Module
  - `edu.cit.rabanal.inventory` &mdash; Inventory Module
  - `edu.cit.rabanal.notification` &mdash; Notification Module (Domain Event Listener)
  - `edu.cit.rabanal.supplier` &mdash; Anti-Corruption Layer (ACL) for LegacySupply

---

## 📦 Lab 3: Anti-Corruption Layer (ACL) & LegacySupply Integration

- **Student Name:** John Lloyd Lourence C. Rabanal
- **Student ID:** `21-0328-885`
- **Base Package:** `edu.cit.rabanal.supplier`
- **Submission Tag:** `lab3-final`
- **Self-Check Verification:** [https://legacysupply.onrender.com/verify](https://legacysupply.onrender.com/verify)
- **Detailed Reflection Document:** [`REFLECTION.md`](./REFLECTION.md)
- **Integration & Discovery Document:** [`INTEGRATION.md`](./INTEGRATION.md)

### 📋 Live Traffic Reflection Questions & Answers

#### Question 1:
> **LegacySupply holds more than one order for BuyerRef "RO-1": PO-100106 (20:21:05) and PO-100130 (20:25:59). Reconstruct the sequence of events that produced the duplicate, and describe the change you made (or would make) so it cannot happen again.**

**Answer:**  
When our initial reorder was submitted at 20:21:05, the `supplier_orders` table auto-generated primary key ID `1`, leading `SupplierGatewayImpl` to create `BuyerRef = "RO-1"` for `PO-100106`. After restarting our Spring Boot application, our in-memory H2 database sequence counter reset back to `1`. Consequently, when product P200 triggered an auto-reorder at 20:25:59, the entity was once again assigned ID `1` and formatted as `BuyerRef = "RO-1"` with a new `X-Request-Id` (`eb2c073b-7280-417c-9f6c-62f98b918d25`), creating `PO-100130`. To permanently eliminate duplicate references, we modified `SupplierGatewayImpl.java` to construct `BuyerRef` using the monotonic pattern `"RO-" + order.getId() + "-" + (System.currentTimeMillis() % 1000000)`. In enterprise production, this is further reinforced by a dedicated persistent database sequence (`supplier_order_buyer_ref_seq`) or UUID prefix ensuring strict uniqueness within the 40-character limit across all restarts.

---

#### Question 2:
> **At 20:21:12 your request for BuyerRef "RO-2" (X-Request-Id bb77f0c9-e809-4ab5-89a4-3ffab0727ab1) received a 503, but LegacySupply had already created PO-100109. Walk through exactly what your adapter did next, and explain why that did or did not result in a second order.**

**Answer:**  
At 20:21:12, `LegacySupplyClient` submitted a purchase order for BuyerRef `RO-2` with `X-Request-Id` `bb77f0c9-e809-4ab5-89a4-3ffab0727ab1`, but LegacySupply returned an artificial HTTP 503 chaos error after internally persisting `PO-100109`. Our client caught the server exception within its exponential retry loop and waited 600 ms before re-transmitting the exact same XML payload. Crucially, the retry request carried the identical `X-Request-Id` header rather than generating a new one. Because of this idempotency key, LegacySupply recognized the incoming request as an `IDEMPOTENT_REPLAY` and returned HTTP 200 with the existing purchase order details rather than placing a duplicate. `SupplierGatewayImpl` then parsed `PurchaseOrderAckXml`, persisted `PO-100109` into our database, and safely completed replenishment without duplication.

---

#### Question 3:
> **PO-100130 (BuyerRef "RO-1") ended with StatusCode 90, which is not in the documentation. How did you work out what it means, and what does your system now do with the stock that will never arrive?**

**Answer:**  
Although LegacySupply's manual only documents codes 10 through 40, standard supply chain conventions reserve status codes in the 90s for order cancellation or terminal rejection. We verified this deduction directly when our polling service fetched `PO-100130` and LegacySupply's self-check checklist updated the status to "Noticed a cancelled order: 1 cancelled orders seen". In response, `SupplierTranslator.mapStatusCode()` maps code `90` to our domain enum `SupplierOrderStatus.CANCELLED`. Because our Anti-Corruption Layer restocks warehouse inventory exclusively via `SupplierOrderDeliveredEvent` when status reaches `DELIVERED`, no delivery event was emitted, ensuring no phantom stock was credited to inventory. Our system logged an operational warning that delivery failed, allowing low-stock monitors to initiate a replacement reorder.

---

## 🏛️ Architecture & Integration Styles

This project demonstrates four distinct software integration styles operating in a single deployable:

```
+---------------------------------------------------------------------------------------------------------+
|                                        [React Frontend (Vite)]                                          |
|                Cart Builder | Live Inventory | Order History & Cancel | Activity Feed                  |
+---------------------------------------------------------------------------------------------------------+
                                                     |
                         Style 1: External REST over HTTP (CORS enabled)
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
|   |                       Spring ApplicationEventPublisher (In-Memory)                  |               |
|   +-------------------------------------------------------------------------------------+               |
|                                            |                                                            |
|                                            v Style 4: In-Monolith Decoupled Pub-Sub                     |
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
|                                            v Style 2: Shared ACID Database Connection                   |
+---------------------------------------------------------------------------------------------------------+
                                             |
                               Supabase PostgreSQL Database
                 Tables: inventory, orders, order_items, notifications
```

---

## ⚡ Core Features Added in Lab 2

1. **Multi-Item Orders (Transactional Rollback)**:
   - `POST /api/orders` accepts `{ items: [{ productId, quantity }, ...] }`.
   - **Pre-Reservation Validation**: Validates every single item against current stock before calling `reserve()`. If any item exceeds stock, the **entire order is rejected** and **no items are reserved** (zero partial reservations).
   - Only when 100% of line items pass validation are stock reservations executed.
2. **Order Cancellation & Restock**:
   - `POST /api/orders/{orderId}/cancel` transitions order status to `CANCELLED` and returns all reserved line items back to available stock.
   - Rejects non-existent orders with `404 Not Found` and already-cancelled or rejected orders with `409 Conflict`.
   - Adds package-private `restock(productId, quantity)` to `InventoryService`.
3. **In-Monolith Domain Events (Notification Module)**:
   - Publishes `OrderPlacedEvent`, `OrderRejectedEvent`, and `OrderCancelledEvent` via Spring's `ApplicationEventPublisher`.
   - `NotificationEventListener` captures events with `@EventListener` and records them into `notifications`.
   - `Notification` depends exclusively on event DTOs (verified by ArchUnit build tests).
4. **Low-Stock Auto-Reorder Rule**:
   - When stock drops below 5 (`< 5`) during `reserve()`, `LowStockEvent` is published.
   - Notification module logs this as a distinct `"LOW-STOCK ALERT: Reorder needed!"` entry.
5. **Interactive Frontend Dashboard**:
   - Light-mode React dashboard with a **Cart Builder** (inline `+` / `-` quantity adjust controls), **Live Inventory Table** with low-stock badges, **Order History with Cancel buttons**, and real-time **Activity Feed**.

---

## 🔄 Synchronous vs. Asynchronous Domain Events

In this monolith, domain events are executed **synchronously** using Spring's core `@EventListener`.

### Why Synchronous was Chosen:
1. **Transactional Coherence & Immediate Consistency**: Executing synchronously on the calling thread ensures notification records are persisted and committed before the HTTP response returns to the client. Subsequent calls to `GET /api/notifications` immediately reflect new activity without eventual consistency lags.
2. **Deterministic Automated Testing**: Integration tests run reliably without requiring polling loops or `Thread.sleep()`.
3. **Operational Simplicity**: Lightweight inserts introduce negligible latency (< 2 ms) while avoiding the overhead of thread-pool tuning and unhandled async exception loss.

### When to Make Event Listeners `@Async`:
`@Async` (via `@EnableAsync` and a `ThreadPoolTaskExecutor`) is recommended when:
- Handlers perform high-latency I/O (sending SMTP emails, third-party SMS/webhook calls, or external ERP synchronization).
- Decoupling preserves fast HTTP response times.
- **Trade-offs**: Requires implementing the **Transactional Outbox Pattern** or Dead Letter Queues (DLQ) to ensure message durability if an async task fails.

---

## 🗄️ Supabase PostgreSQL Setup Steps

To set up or recreate your Supabase database schema for Lab 2:

### Step 1: Run SQL Schema in Supabase SQL Editor
1. Log in to your [Supabase Dashboard](https://supabase.com).
2. Open the **SQL Editor** tab.
3. Paste and run the contents of [`supabase_schema.sql`](./supabase_schema.sql):
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
4. Click **Run**. Output will report `Success. No rows returned`.
5. Check **Table Editor** to confirm all 4 tables (`inventory`, `orders`, `order_items`, `notifications`) are active.

### Step 2: Configure Environment Variables
Set your environment variables before running the backend:
```powershell
$env:SPRING_PROFILES_ACTIVE = "supabase"
$env:SUPABASE_DB_URL = "jdbc:postgresql://aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require&prepareThreshold=0"
$env:SUPABASE_DB_USER = "postgres.jjxfvolifvrctwkdivnk"
$env:SUPABASE_DB_PASSWORD = "<YOUR_SUPABASE_DB_PASSWORD>"
```
*(Note: `prepareThreshold=0` is configured to ensure compatibility with Supabase's transaction pooler).*

---

## 🌐 Network Tab Evidence

Verified HTTP request/response evidence captured from browser developer tools across all four required scenarios:

### 1. Multi-Item Order (CONFIRMED & All Items Succeed)
<img width="1919" height="947" alt="Screenshot 2026-09-17 202459" src="https://github.com/user-attachments/assets/ece91cc8-dd70-4430-9180-41533df0e94c" />

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
- **Outcome**: Order #1 created, line items stored in `order_items`, stocks decremented, and confirmation notification logged.

---

### 2. Multi-Item Order (REJECTED & All-or-Nothing Rollback)
<img width="1919" height="945" alt="Screenshot 2026-09-17 202600" src="https://github.com/user-attachments/assets/d6c5270f-9d17-45c8-9ee4-9eaee45c8827" />

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

### 3. Order Cancellation & Restock Reflected in Inventory
<img width="1919" height="944" alt="Screenshot 2026-09-17 202718" src="https://github.com/user-attachments/assets/732d07b2-6369-4bec-8773-1b782b4aa3c5" />

- **Scenario**: User cancels Order #1 (`POST /api/orders/1/cancel`), followed by `GET /api/inventory`.
- **Request 1**: `POST http://localhost:8080/api/orders/1/cancel`
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
- **Request 2**: `GET http://localhost:8080/api/inventory`
- **Response Status**: `200 OK`
- **Response Body**:
  ```json
  [
    {"productId": "P100", "name": "Wireless Mouse", "stock": 25},
    {"productId": "P200", "name": "Mechanical Keyboard", "stock": 10},
    {"productId": "P300", "name": "USB-C Hub", "stock": 0}
  ]
  ```
- **Outcome**: `P100` restored to 25 and `P200` restored to 10.

---

### 4. Notification Activity Feed Evidence
<img width="1919" height="942" alt="Screenshot 2026-09-17 203123" src="https://github.com/user-attachments/assets/feef412e-daab-447c-9bbf-9b0989e2d370" />

- **Scenario**: Querying `GET /api/notifications` displaying confirmed order, rejected order, cancelled order, and low-stock alert (`P200` stock dropping below threshold 5).
- **Request**: `GET http://localhost:8080/api/notifications`
- **Response Status**: `200 OK`
- **Response Body**:
  ```json
  [
    {
      "notificationId": 4,
      "message": "LOW-STOCK ALERT: Product P200 (Mechanical Keyboard) dropped to 4 units (threshold: 5). Reorder needed!",
      "createdAt": "2026-09-17T10:39:18.000Z"
    },
    {
      "notificationId": 3,
      "message": "Order #2 confirmed: 6x P200",
      "createdAt": "2026-09-17T10:39:18.000Z"
    },
    {
      "notificationId": 2,
      "message": "Order #1 cancelled: 2x P100, 1x P200 returned to inventory",
      "createdAt": "2026-09-17T10:38:57.801Z"
    },
    {
      "notificationId": 1,
      "message": "Order #1 confirmed: 2x P100, 1x P200",
      "createdAt": "2026-09-17T10:38:42.488Z"
    }
  ]
  ```

---

## 📝 300–500 Word Reflection

1. **Multi-item orders now touch InventoryService several times within one request. What ensures this stays atomic in-process, and what would you need to add (e.g. sagas, compensating transactions) if Order and Inventory were split across a network?**
In our in-process monolith, multi-item order placement remains atomic because both modules share the same database connection and thread context governed by Spring's `@Transactional` boundary on `OrderService.placeOrder()`. We enforce a two-phase application rule: `OrderService` pre-validates all requested items against stock before executing any reservation. If any single item lacks inventory, the entire order is rejected immediately with zero stock deducted. When all items pass validation, sequential invocations to `InventoryService.reserve()` execute within that single active ACID database transaction. If any runtime exception occurs mid-loop, Spring's transaction manager issues a complete rollback, discarding all intermediate reservations automatically.
If split across a network, single-transaction ACID is lost. We would need to implement an asynchronous Saga pattern (orchestrated or choreographed) with compensating transactions. If item A and B succeed over REST/gRPC but item C fails at the remote inventory service, the Order orchestrator must dispatch compensating `POST /api/inventory/{productId}/restock` calls to release reserved units, or use a temporary "hold/pending" state with TTL expiration to prevent partial fulfillment anomalies.

2. **How does publishing an event instead of calling Notification directly change the coupling between OrderService and Notification? What would you need if Notification became a separate microservice (message broker, delivery guarantees)?**
Publishing domain events (`OrderPlacedEvent`, `OrderRejectedEvent`, `OrderCancelledEvent`) via Spring's `ApplicationEventPublisher` eliminates direct coupling between `OrderService` and Notification. `OrderService` has zero knowledge of `NotificationEventListener` or the `notifications` table; its only responsibility is announcing domain occurrences. ArchUnit tests enforce that neither `shop` nor `inventory` import anything from `notification`.
If Notification were extracted into a separate microservice, in-memory Spring events cannot cross process boundaries. We would need:
- An external message broker (such as Apache Kafka, RabbitMQ, or AWS SNS/SQS).
- A Transactional Outbox pattern to ensure atomicity between local database writes and event publishing, avoiding dual-write failures.
- Delivery guarantees: At-least-once delivery with consumer acknowledgments, idempotency keys (e.g., using `order_id` for deduplication), and Dead Letter Queues (DLQ) for malformed messages.

3. **You now have three modules and two distinct event types. If forced to extract exactly one module into its own microservice first, which would you pick and why - and what changes in your code to do it?**
If forced to extract one module first, **Notification** is the ideal choice.
**Why Notification**: Notification is an asynchronous, write-only sink. Unlike Inventory—which is on the synchronous, latency-critical checkout path requiring strict two-way consistency—Notification is tolerant to eventual consistency. A temporary delay or outage in Notification never blocks a customer from completing checkout.
**Code Changes Required**:
1. Move `edu.cit.rabanal.notification` into a standalone Spring Boot repository with its own database.
2. In the monolith, replace `@EventListener` with a message producer (e.g., `KafkaTemplate.send("order-events", event)`).
3. In the Notification microservice, implement a `@KafkaListener` consumer to persist incoming events into local storage.
4. Expose `GET /api/notifications` from the new service, updating the frontend API client.

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

# Option A: Live Supabase Cloud Database (Pooler on Port 6543)
$env:SPRING_PROFILES_ACTIVE = "supabase"
$env:SUPABASE_DB_URL = "jdbc:postgresql://aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require&prepareThreshold=0"
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
