# In-Process Modular Monolith: Order & Inventory with Supabase and React

A reference architecture demonstrating a **modular monolith** built with **Java Spring Boot**, backed by **Supabase PostgreSQL**, and controlled via a modern **React (Vite + TypeScript)** frontend.

This project specifically practices **three integration styles simultaneously**:
1. **Module-to-Module In-Process Integration with Enforced Boundary**:
   - The `Order` and `Inventory` modules run in the same JVM process and communicate through strictly defined boundary APIs (`InventoryModuleApi`) without network calls.
   - Architectural boundaries are enforced at build time via **ArchUnit** tests: illegal cross-module imports of internal classes or entity leakage fail the build immediately.
2. **Service-to-Database Integration (Supabase / PostgreSQL)**:
   - Shared PostgreSQL database on Supabase managed by Spring Data JPA.
   - Both modules participate in a single atomic ACID transaction during checkout with pessimistic row locking (`@Lock(LockModeType.PESSIMISTIC_WRITE)`) to prevent inventory overselling.
3. **External Client Integration via REST**:
   - React frontend consumes Spring Boot REST APIs (`/api/orders`, `/api/inventory`) with CORS support, structured error payloads (`InsufficientStockException` &rarr; HTTP 409), and an interactive 3-tier integration inspector.

---

## Architecture Diagram

```
+---------------------------------------------------------------------------------------+
|                                [React Frontend (Vite)]                                |
+---------------------------------------------------------------------------------------+
                                           |
                              Style 1: REST over HTTP
                              POST /api/orders, GET /api/inventory
                                           |
                                           v
+---------------------------------------------------------------------------------------+
|                        Spring Boot Application (Single JVM)                           |
|                                                                                       |
|   +------------------------------------+    +-------------------------------------+   |
|   |            ORDER MODULE            |    |          INVENTORY MODULE           |   |
|   |                                    |    |                                     |   |
|   |  - OrderController (REST)          |    |  - InventoryController (REST)       |   |
|   |  - OrderService                    |    |  - InventoryServiceImpl             |   |
|   |  - Order / OrderItem (Entities)    |    |  - Product / InventoryStock (Ent.)  |   |
|   |                                    |    |                                     |   |
|   |                         Style 2: In-Process Boundary                          |   |
|   |  OrderService -------------------->|==>  InventoryModuleApi (Public API)       |   |
|   |  (No network hop, <0.1ms latency)  |    - checkAndReserveStock()              |   |
|   |                                    |    - releaseStock()                      |   |
|   |                                    |    - getProductBySku()                   |   |
|   +------------------------------------+    +-------------------------------------+   |
|                     \                                     /                           |
|                      \                                   /                            |
|                       \                                 /                             |
|                    Style 3: Single ACID Database Transaction                          |
+---------------------------------------------------------------------------------------+
                                           |
                               PostgreSQL Connection (JDBC)
                                           |
                                           v
+---------------------------------------------------------------------------------------+
|                            Supabase PostgreSQL Database                               |
|                     - products, inventory_stocks, orders, order_items                 |
+---------------------------------------------------------------------------------------+
```

---

## Directory Structure

```
Monolith/
├── backend/
│   ├── pom.xml
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/example/monolith/
│   │   │   │   ├── MonolithApplication.java
│   │   │   │   ├── common/                       # Global exceptions, CORS, OpenAPI, seed data
│   │   │   │   ├── inventory/
│   │   │   │   │   ├── api/                      # Public module boundary (DTOs & interface)
│   │   │   │   │   │   ├── InventoryModuleApi.java
│   │   │   │   │   │   └── dto/
│   │   │   │   │   └── internal/                 # Hidden domain, repositories, service, REST
│   │   │   │   │       ├── domain/
│   │   │   │   │       ├── repository/
│   │   │   │   │       ├── service/
│   │   │   │   │       └── controller/
│   │   │   │   └── order/
│   │   │   │       ├── api/                      # Domain events (OrderPlacedEvent)
│   │   │   │       └── internal/                 # Hidden domain, repositories, service, REST
│   │   │   │           ├── domain/
│   │   │   │           ├── repository/
│   │   │   │           ├── service/
│   │   │   │           └── controller/
│   │   │   └── resources/
│   │   │       ├── application.yml               # Base + local dev profile (H2 PostgreSQL mode)
│   │   │       └── application-supabase.yml      # Live Supabase connection pool profile
│   │   └── test/
│   │       └── java/com/example/monolith/
│   │           ├── ModularityBoundaryTest.java   # ArchUnit architectural rule enforcement
│   │           └── OrderInventoryIntegrationTest.java
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── components/
│       │   ├── ArchitectureTracker.tsx           # Real-time visual inspector of 3 integration styles
│       │   ├── InventoryManager.tsx              # Live stock indicators & restock modal
│       │   ├── OrderForm.tsx                     # Order checkout & error rollback display
│       │   └── OrderList.tsx                     # Committed database order history
│       ├── services/api.ts                       # HTTP client with error mapping
│       └── App.tsx
├── .env.example
└── README.md
```

---

## The Three Integration Styles Explained

### 1. In-Process Boundary Integration (`Order` &rarr; `Inventory`)
- **How it works**: When an order is placed, `OrderService` directly calls the public interface `InventoryModuleApi.checkAndReserveStock(items)`.
- **Enforced Boundary**: The `Order` module is strictly prohibited from importing anything inside `com.example.monolith.inventory.internal.*` (no entities, no private repos, no internal classes).
- **ArchUnit Enforcement**: In `ModularityBoundaryTest.java`:
  ```java
  noClasses()
      .that().resideInAPackage("com.example.monolith.order..")
      .should().dependOnClassesThat()
      .resideInAPackage("com.example.monolith.inventory.internal..")
      .check(classes);
  ```
- **Performance**: Zero network serialization, sub-millisecond execution time, and shared transaction scope.

### 2. Service-to-Database Integration (Supabase PostgreSQL)
- **Shared Schema**: Both modules share the same PostgreSQL database.
- **ACID Transactions**: Both the stock deduction and order creation occur within the same `@Transactional` boundary. If stock is insufficient, the transaction rolls back cleanly with no orphaned order records.
- **Concurrency Protection**: The Inventory module uses pessimistic write locks (`@Lock(LockModeType.PESSIMISTIC_WRITE)`) sorted alphabetically by SKU to prevent deadlocks and race conditions.

### 3. External Client REST Integration (React &rarr; Spring Boot)
- **JSON REST Endpoints**: Standard HTTP verbs and status codes:
  - `GET /api/inventory`: Lists products with stock levels.
  - `POST /api/inventory/restock`: Restocks inventory items.
  - `POST /api/orders`: Submits an order (returns `201 CREATED` on success or `409 CONFLICT` on insufficient stock).
  - `GET /api/orders`: Retrieves historical order transactions.
- **OpenAPI / Swagger**: Interactive API documentation available at `http://localhost:8080/swagger-ui.html`.

---

## Quick Start Guide

### Prerequisites
- Java 21+ (or JDK 26)
- Node.js 18+ and npm

### 1. Run Backend (Zero-Config Local Profile)
By default, the backend runs with an in-memory PostgreSQL-compatible database pre-seeded with catalog products and stock levels:

```powershell
cd backend
$env:JAVA_HOME = "C:\Program Files\Java\jdk-26.0.2.1"
.\mvnw.cmd spring-boot:run
```

The backend starts on `http://localhost:8080`.
- Swagger UI: `http://localhost:8080/swagger-ui.html`
- H2 Console: `http://localhost:8080/h2-console` (JDBC URL: `jdbc:h2:mem:monolithdb`)

### 2. Connect to Supabase PostgreSQL (Optional / Production Profile)
To connect the backend to your live Supabase project:
1. Copy `.env.example` to `.env` or set environment variables:
   ```powershell
   $env:SPRING_PROFILES_ACTIVE = "supabase"
   $env:SUPABASE_DB_URL = "jdbc:postgresql://db.<YOUR-PROJECT-REF>.supabase.co:5432/postgres?sslmode=require"
   $env:SUPABASE_DB_USER = "postgres"
   $env:SUPABASE_DB_PASSWORD = "<YOUR-PASSWORD>"
   ```
2. Run the application:
   ```powershell
   .\mvnw.cmd spring-boot:run
   ```

### 3. Run React Frontend
In a new terminal window:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Running Verification Tests

Run the automated test suite to verify module boundary enforcement and transactional consistency:

```powershell
cd backend
$env:JAVA_HOME = "C:\Program Files\Java\jdk-26.0.2.1"
.\mvnw.cmd test
```

Tests include:
- `ModularityBoundaryTest`: Enforces strict module isolation using ArchUnit.
- `OrderInventoryIntegrationTest`: Tests in-process order placement, inventory reduction, and shortage transaction rollbacks.
