# LegacySupply Partner Integration & Discovery Document (Lab 3)

**Author:** John Lloyd Lourence C. Rabanal  
**Student ID:** `21-0328-885`  
**Base Package:** `edu.cit.rabanal.supplier`  
**External Service Base URL:** `https://legacysupply.onrender.com/api/v1`  
**Interface Manual:** `https://legacysupply.onrender.com/docs`  
**Self-Check Verification Portal:** `https://legacysupply.onrender.com/verify`  

---

## 1. Product Mapping Table

The Anti-Corruption Layer (ACL) maintains strict separation between our Monolith's internal product catalog and LegacySupply's wholesale inventory items. All purchase orders placed with LegacySupply are translated from individual units to whole supplier cases/packs, rounding up.

| Monolith Product ID | Monolith Product Name | LegacySupply SupplierSku | Description | Pack Size | Supplier UOM | Unit Cost |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| **P100** | Wireless Mouse | `LEZ-1290` | WIRELESS MOUSE 2.4GHZ | **24** | `CS` (Case) | PHP 450.00 |
| **P200** | Mechanical Keyboard | `LEZ-6626` | KEYBOARD MECH TKL | **24** | `CS` (Case) | PHP 1,250.00 |
| **P300** | USB-C Hub | `LEZ-9515` | USB HUB 4-PORT | **20** | `CS` (Case) | PHP 650.00 |

---

## 2. Session Protocol & Measured Lifetime

### How Authentication Works:
LegacySupply uses short-lived, stateful XML session tokens:
1. The client sends a `POST /auth/token` request with `Content-Type: application/xml`:
   ```xml
   <AuthRequest>
     <ClientId>21-0328-885</ClientId>
     <ApiKey>[REDACTED - READ FROM LS_API_KEY]</ApiKey>
   </AuthRequest>
   ```
2. A successful response (`HTTP 200 OK`) returns the session token:
   ```xml
   <AuthResponse>
     <SessionToken>9f1c84b2e67a421...</SessionToken>
     <IssuedAt>2026-09-24T10:45:00.000Z</IssuedAt>
   </AuthResponse>
   ```
3. All subsequent requests (`GET /catalog`, `POST /purchase-orders`, `GET /purchase-orders/{PoNumber}`) must provide the token in the HTTP header:
   ```http
   X-LS-Session: 9f1c84b2e67a421...
   ```

### Measured Session Lifetime:
- **Observed TTL:** LegacySupply sessions remain active for approximately **120 seconds (2 minutes)** of inactivity, or up to a maximum lifespan of 5 minutes.
- **Handling in Adapter (`SessionManager`):** The Anti-Corruption Layer never forces manual token pasting or fixed timer guesswork. If any request fails with `HTTP 401` (`E-AUTH-03 Session not recognized` or `E-AUTH-07 Session not valid`), the `SessionManager` immediately invalidates the cached session, requests a new session token via `POST /auth/token`, and automatically retries the operation transparently.

---

## 3. Error Codes & Root Cause Analysis

During interface discovery and edge-case probing, the following LegacySupply error responses were cataloged:

| Error Code | HTTP Status | Message | Root Cause & Reproduction | ACL Mitigation / System Behavior |
| :--- | :---: | :--- | :--- | :--- |
| **`E-AUTH-01`** | 401 | Credentials rejected. | Invalid API key or student ID supplied in `<AuthRequest>`. | Log configuration error and alert administrator. |
| **`E-AUTH-02`** | 401 | Session header missing. | Request omitted the `X-LS-Session` header. | `LegacySupplyClient` automatically attaches `X-LS-Session` header to every protected request. |
| **`E-AUTH-03`** | 401 | Session not recognized. | Provided session token does not exist on the server. | `SessionManager.invalidateSession()` clears token and triggers fresh authentication. |
| **`E-AUTH-07`** | 401 | Session not valid. | Session token has timed out / expired past TTL. | Auto-reauthenticate on 401 and retry the original call. |
| **`E-FMT-01`** | 415 | Unsupported media. | Sent `application/json` or missing `Content-Type`. | Enforce `Content-Type: application/xml` and `Accept: application/xml` on all calls. |
| **`E-FMT-02`** | 400 | Malformed document. | Invalid XML syntax, unclosed tags, or malformed root element. | Use strongly-typed Jackson XML serialization (`AuthRequestXml`, `PurchaseOrderXml`). |
| **`E-REF-05`** | 400 | BuyerRef invalid. | Missing `BuyerRef` or string longer than 40 characters. | Formatted as `"RO-" + supplier_order_id`, guaranteeing brevity and uniqueness. |
| **`E-SKU-02`** | 422 | Item not recognized. | Requested item number does not exist in partner catalog. | `SupplierTranslator` maps internal product IDs only to verified catalog SKUs. |
| **`E-QTY-11`** | 422 | Quantity invalid. | Quantity &le; 0, &gt; 99, or fractional decimal. | Whole number validation: cases clamped between 1 and 99. |
| **`E-IDEM-04`** | 409 | Request id reused with different content. | Reusing an `X-Request-Id` header with different payload contents. | Idempotency invariant: Each `SupplierOrder` has a fixed UUID `request_id` generated at creation and reused across all retries. |
| **`E-PO-04`** | 404 | Order not found. | Querying `/purchase-orders/{PoNumber}` with non-existent PO. | Verify PO Number returned from initial `201 PurchaseOrderAck`. |
| **`E-QRY-06`** | 400 | Query parameter required. | Calling `/purchase-orders` without `buyerRef` parameter. | Include `?buyerRef={BuyerRef}` parameter when querying order collections. |
| **`E-RATE-03`** | 429 | Request quota exceeded. | Polling too frequently within a short window. | Exponential backoff and conservative polling interval (30s) in `DeliveryTrackingScheduler`. |
| **`E-SYS-50`** | 503 | Processing error. | Server-side internal malfunction. | Retry with backoff up to 3 attempts, then retain as `PENDING`. |
| **`E-SYS-99`** | 503 | Service unavailable. Try later. | Outage simulation by instructor or scheduled downtime. | Order kept as `PENDING` in database; `PendingOrdersRetryScheduler` will deliver once restored. |

---

## 4. Quantity (`Qty`) vs. Unit of Measure (`Uom`)

### In Our Own Words:
- **`Qty` (Quantity):** The count of **wholesale packaging units** being ordered, **not** individual consumer items. LegacySupply only ships items in bulk packaging (cases or cartons). `Qty` must always be an integer from 1 to 99.
- **`Uom` (Unit of Measure):** The standard packaging unit used by the supplier for that specific item (e.g., `CS` for Case, `PK` for Pack, `BX` for Box).

### Worked Example:
Suppose a customer places an order that leaves our warehouse with **2 units** of `P100` (Wireless Mouse).
1. Since the low-stock threshold is 5 units, `LowStockEvent` is triggered with `currentStock = 2`.
2. The auto-reorder rule calculates that nominal target stock is 20 units:
   $$\text{Units Needed} = 20 - 2 = 18 \text{ units}$$
3. The Anti-Corruption Layer consults `SupplierTranslator` for `P100`:
   - Supplier Sku: `LEZ-1290`
   - Pack Size: `24` units per case
   - UOM: `CS`
4. The ACL calculates the wholesale cases required, rounding up to prevent under-stocking:
   $$\text{Cases} = \left\lceil \frac{18}{24} \right\rceil = \left\lceil 0.75 \right\rceil = 1 \text{ case}$$
5. The ACL dispatches the purchase order to LegacySupply:
   ```xml
   <PurchaseOrder>
     <SupplierSku>LEZ-1290</SupplierSku>
     <Qty>1</Qty>
     <BuyerRef>RO-1</BuyerRef>
   </PurchaseOrder>
   ```
6. LegacySupply responds with `PurchaseOrderAck`:
   - `PoNumber`: `PO-100231`
   - `Qty`: `2`
   - `Uom`: `CS`
   - `StatusCode`: `10` (Accepted)
7. Total retail units received upon delivery:
   $$\text{Total Units} = 2 \text{ cases} \times 12 \text{ units/case} = 24 \text{ units}$$
8. When LegacySupply reaches `40` (Delivered), `SupplierOrderDeliveredEvent` is published. The Inventory module listens and adds **24 units** to `P100` stock. Zero supplier terms (`CS`, `ABC-1234`, `PackSize`) ever touch the Inventory module.

---

## 5. Unexpected Status Handling Strategy

If LegacySupply returns a status code outside the documented set (`10`, `20`, `30`, `40`):
1. **System Decision:** The system logs an `UNEXPECTED_STATUS_CODE` warning with the raw code and PO number.
2. **State Retention:** The internal status remains at its current recognized state (e.g., `SHIPPED` or `PENDING`) to avoid illegal state transitions or premature inventory restocking.
3. **Escalation:** The order is highlighted on the administrative dashboard for operator inspection. Under no circumstances will unexpected codes trigger an erroneous inventory restock.
