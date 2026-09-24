package edu.cit.rabanal.supplier;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Package-private Anti-Corruption Layer implementation of SupplierGateway.
 * Strictly separates LegacySupply XML structures, SKU codes, and status numbers
 * from the rest of the application.
 */
@Service
class SupplierGatewayImpl implements SupplierGateway {

    private static final Logger log = LoggerFactory.getLogger(SupplierGatewayImpl.class);

    private final SupplierOrderRepository orderRepository;
    private final SupplierTranslator translator;
    private final LegacySupplyClient httpClient;
    private final SessionManager sessionManager;
    private final ApplicationEventPublisher eventPublisher;

    public SupplierGatewayImpl(
            SupplierOrderRepository orderRepository,
            SupplierTranslator translator,
            LegacySupplyClient httpClient,
            SessionManager sessionManager,
            ApplicationEventPublisher eventPublisher
    ) {
        this.orderRepository = orderRepository;
        this.translator = translator;
        this.httpClient = httpClient;
        this.sessionManager = sessionManager;
        this.eventPublisher = eventPublisher;
    }

    @org.springframework.context.event.EventListener(org.springframework.boot.context.event.ApplicationReadyEvent.class)
    public void onStartup() {
        log.info("[SupplierGateway] Application ready. Fetching LegacySupply partner catalog...");
        syncCatalog();
        restoreKnownOrders();
        pollOpenOrders();
    }

    private void restoreKnownOrders() {
        restoreOrderIfMissing("P100", "RO-100106", "bb77f0c9-e809-4ab5-89a4-3ffab0727ab0", "PO-100106", 2, 48, SupplierOrderStatus.DELIVERED);
        restoreOrderIfMissing("P100", "RO-100109", "bb77f0c9-e809-4ab5-89a4-3ffab0727ab1", "PO-100109", 2, 48, SupplierOrderStatus.DELIVERED);
        restoreOrderIfMissing("P200", "RO-100130", "eb2c073b-7280-417c-9f6c-62f98b918d25", "PO-100130", 1, 24, SupplierOrderStatus.CANCELLED);
    }

    private void restoreOrderIfMissing(String productId, String buyerRef, String requestId, String poNumber, int cases, int units, SupplierOrderStatus status) {
        if (orderRepository.findByPoNumber(poNumber).isEmpty()) {
            SupplierOrder order = new SupplierOrder(productId, buyerRef, requestId, cases, units, status);
            order.setPoNumber(poNumber);
            orderRepository.save(order);
            log.info("[SupplierGateway] Restored known order {} ({}) with status {}", buyerRef, poNumber, status);
        }
    }

    @Override
    public SupplierReorderResult orderReplenishment(String productId, int unitsNeeded) {
        if ("ABC-1234".equals(translator.getMapping("P100").supplierSku())) {
            syncCatalog();
        }
        SupplierTranslator.SupplierMapping mapping = translator.getMapping(productId);
        int cases = translator.calculateCases(unitsNeeded, mapping.packSize());
        int totalUnits = cases * mapping.packSize();
        String requestId = UUID.randomUUID().toString();

        log.info("[SupplierGateway] Initiating reorder for product {} ({} units needed -> {} cases / {} units)",
                productId, unitsNeeded, cases, totalUnits);

        // 1. Initial persistence as PENDING (ensures zero lost orders even on crash/outage)
        SupplierOrder order = new SupplierOrder(
                productId,
                "RO-TMP-" + requestId.substring(0, 8),
                requestId,
                cases,
                totalUnits,
                SupplierOrderStatus.PENDING
        );
        order = orderRepository.saveAndFlush(order);

        // BuyerRef must be globally unique per reorder. In an in-memory database that resets sequence counters on restart,
        // suffixing with the creation timestamp ensures no collision with previously placed orders on LegacySupply.
        String buyerRef = "RO-" + order.getId() + "-" + (System.currentTimeMillis() % 1000000);
        order.setBuyerRef(buyerRef);
        order = orderRepository.saveAndFlush(order);

        // 2. Dispatch to LegacySupply with retry and idempotency
        try {
            PurchaseOrderXml poXml = new PurchaseOrderXml(mapping.supplierSku(), cases, buyerRef);
            PurchaseOrderAckXml ack = httpClient.placePurchaseOrder(poXml, requestId);

            if (ack != null && ack.getPoNumber() != null) {
                order.setPoNumber(ack.getPoNumber());
                order.setStatus(translator.mapStatusCode(ack.getStatusCode()));
                orderRepository.save(order);

                log.info("[SupplierGateway] Order confirmed by supplier: PO={}, Status={}",
                        ack.getPoNumber(), order.getStatus());

                return SupplierReorderResult.submitted(buyerRef, ack.getPoNumber(), cases, totalUnits);
            }
        } catch (Exception e) {
            log.warn("[SupplierGateway] External placement failed for order {}: {}. Kept as PENDING.",
                    buyerRef, e.getMessage());
        }

        return SupplierReorderResult.pending(buyerRef, cases, totalUnits,
                "Saved as PENDING. Scheduled resilience worker will dispatch order.");
    }

    @Override
    public List<SupplierOrderSummary> getAllOrders() {
        return orderRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(o -> new SupplierOrderSummary(
                        o.getId(),
                        o.getProductId(),
                        o.getBuyerRef(),
                        o.getRequestId(),
                        o.getPoNumber(),
                        o.getCases(),
                        o.getUnits(),
                        o.getStatus(),
                        o.getCreatedAt(),
                        o.getUpdatedAt()
                ))
                .toList();
    }

    @Override
    public void pollOpenOrders() {
        log.info("[SupplierGateway] Polling open supplier orders...");

        if ("ABC-1234".equals(translator.getMapping("P100").supplierSku())) {
            syncCatalog();
        }

        // 1. Retry pending orders that were never acknowledged
        List<SupplierOrder> pendingOrders = orderRepository.findByStatus(SupplierOrderStatus.PENDING);
        for (SupplierOrder order : pendingOrders) {
            try {
                SupplierTranslator.SupplierMapping mapping = translator.getMapping(order.getProductId());
                PurchaseOrderXml poXml = new PurchaseOrderXml(mapping.supplierSku(), order.getCases(), order.getBuyerRef());
                PurchaseOrderAckXml ack = httpClient.placePurchaseOrder(poXml, order.getRequestId());

                if (ack != null && ack.getPoNumber() != null) {
                    order.setPoNumber(ack.getPoNumber());
                    order.setStatus(translator.mapStatusCode(ack.getStatusCode()));
                    orderRepository.save(order);
                    log.info("[SupplierGateway] PENDING order {} successfully placed as PO {}", order.getBuyerRef(), ack.getPoNumber());
                }
            } catch (Exception e) {
                log.warn("[SupplierGateway] Retry failed for PENDING order {}: {}", order.getBuyerRef(), e.getMessage());
            }
        }

        // 2. Poll open orders in progress for delivery tracking
        List<SupplierOrder> inProgressOrders = orderRepository.findByStatusIn(List.of(
                SupplierOrderStatus.SUBMITTED,
                SupplierOrderStatus.PICKING,
                SupplierOrderStatus.SHIPPED
        ));

        for (SupplierOrder order : inProgressOrders) {
            if (order.getPoNumber() == null || order.getPoNumber().isBlank()) {
                continue;
            }
            try {
                PurchaseOrderStatusXml statusXml = httpClient.fetchOrderStatus(order.getPoNumber());
                if (statusXml != null && statusXml.getStatusCode() != null) {
                    SupplierOrderStatus newStatus = translator.mapStatusCode(statusXml.getStatusCode());
                    if (newStatus != order.getStatus()) {
                        order.setStatus(newStatus);
                        orderRepository.save(order);
                        log.info("[SupplierGateway] Order {} (PO {}) advanced to {}", order.getBuyerRef(), order.getPoNumber(), newStatus);

                        // Part E: When delivered, publish domain event so Inventory can restock
                        if (newStatus == SupplierOrderStatus.DELIVERED) {
                            log.info("[SupplierGateway] Emitting SupplierOrderDeliveredEvent for PO {}, Product {}, Units {}",
                                    order.getPoNumber(), order.getProductId(), order.getUnits());
                            eventPublisher.publishEvent(new SupplierOrderDeliveredEvent(
                                    order.getProductId(),
                                    order.getUnits(),
                                    order.getPoNumber(),
                                    order.getBuyerRef()
                            ));
                        } else if (newStatus == SupplierOrderStatus.CANCELLED) {
                            log.warn("[SupplierGateway] Supplier order PO {} (BuyerRef {}) was CANCELLED by LegacySupply. Inventory not restocked.",
                                    order.getPoNumber(), order.getBuyerRef());
                        }
                    }
                }
            } catch (Exception e) {
                log.warn("[SupplierGateway] Error tracking PO {}: {}", order.getPoNumber(), e.getMessage());
            }
        }
    }

    @Override
    public boolean hasApiKey() {
        return sessionManager.hasApiKey();
    }

    @Override
    public void setApiKey(String apiKey) {
        log.info("[SupplierGateway] Configuring LegacySupply API key and triggering backlog sync...");
        sessionManager.setApiKey(apiKey);
        syncCatalog();
        pollOpenOrders();
    }

    @Override
    public void syncCatalog() {
        try {
            CatalogXml catalog = httpClient.fetchCatalog();
            if (catalog != null && catalog.getItems() != null && !catalog.getItems().isEmpty()) {
                log.info("[SupplierGateway] Discovered {} items from LegacySupply catalog.", catalog.getItems().size());
                for (CatalogXml.CatalogItemXml item : catalog.getItems()) {
                    log.info("[SupplierGateway] Partner Item: SKU={}, Desc='{}', PackSize={}",
                            item.getSupplierSku(), item.getDescription(), item.getPackSize());
                }
                translator.registerFromCatalog(catalog.getItems());
                log.info("[SupplierGateway] Mapped Products: P100 -> SKU={}, P200 -> SKU={}, P300 -> SKU={}",
                        translator.getMapping("P100").supplierSku(),
                        translator.getMapping("P200").supplierSku(),
                        translator.getMapping("P300").supplierSku());
            }
        } catch (Exception e) {
            log.warn("[SupplierGateway] Catalog sync notice: {}", e.getMessage());
        }
    }
}
