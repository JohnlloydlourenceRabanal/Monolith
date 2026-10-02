package edu.cit.rabanal.channel;

import com.fasterxml.jackson.databind.ObjectMapper;
import edu.cit.rabanal.inventory.InventoryItem;
import edu.cit.rabanal.inventory.InventoryService;
import edu.cit.rabanal.shop.OrderItemRequest;
import edu.cit.rabanal.shop.OrderRequest;
import edu.cit.rabanal.shop.OrderResponse;
import edu.cit.rabanal.shop.OrderService;
import edu.cit.rabanal.supplier.SupplierGateway;
import edu.cit.rabanal.supplier.SupplierOrderStatus;
import edu.cit.rabanal.supplier.SupplierOrderSummary;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Package-private implementation of ChannelGateway.
 * Coordinates Tiangge marketplace communication, order feed polling,
 * decisions (ACCEPTED, REJECTED, BACKORDERED), backorder resolution (ACCEPTED, CANCELLED),
 * customer cancellations, durable outbox resilience, and UI channel status.
 */
@Service
class ChannelGatewayImpl implements ChannelGateway {

    private static final Logger log = LoggerFactory.getLogger(ChannelGatewayImpl.class);
    private static final String CURSOR_FEED_NAME = "tiangge_order_feed";

    private final TianggeClient tianggeClient;
    private final ChannelTranslator channelTranslator;
    private final InventoryService inventoryService;
    private final ClientInstanceInterceptor instanceInterceptor;
    private final OrderService orderService;
    private final SupplierGateway supplierGateway;
    private final ChannelOrderRepository channelOrderRepository;
    private final ChannelFeedCursorRepository channelFeedCursorRepository;
    private final ChannelOutboxRepository outboxRepository;
    private final String appName;
    private final Instant startedAt;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Object feedPollLock = new Object();
    private final Object backorderLock = new Object();

    private volatile Instant lastHeartbeatTime = null;
    private volatile Instant lastProcessedTime = null;
    private volatile String channelState = "running";

    private static final ThreadLocal<Boolean> CHANNEL_PROCESSING = ThreadLocal.withInitial(() -> false);

    static boolean isChannelProcessing() {
        return Boolean.TRUE.equals(CHANNEL_PROCESSING.get());
    }

    public ChannelGatewayImpl(
            TianggeClient tianggeClient,
            ChannelTranslator channelTranslator,
            InventoryService inventoryService,
            ClientInstanceInterceptor instanceInterceptor,
            OrderService orderService,
            SupplierGateway supplierGateway,
            ChannelOrderRepository channelOrderRepository,
            ChannelFeedCursorRepository channelFeedCursorRepository,
            ChannelOutboxRepository outboxRepository,
            @Value("${spring.application.name:monolith-shop-inventory}") String appName
    ) {
        this.tianggeClient = tianggeClient;
        this.channelTranslator = channelTranslator;
        this.inventoryService = inventoryService;
        this.instanceInterceptor = instanceInterceptor;
        this.orderService = orderService;
        this.supplierGateway = supplierGateway;
        this.channelOrderRepository = channelOrderRepository;
        this.channelFeedCursorRepository = channelFeedCursorRepository;
        this.outboxRepository = outboxRepository;
        this.appName = appName;
        this.startedAt = Instant.now();
    }

    @Override
    public void sendHeartbeat() {
        String instanceId = getInstanceId();
        try {
            long uptime = Duration.between(startedAt, Instant.now()).getSeconds();
            HeartbeatRequest request = new HeartbeatRequest(appName, startedAt.toString(), uptime);
            HeartbeatResponse response = tianggeClient.sendHeartbeat(request);
            this.lastHeartbeatTime = Instant.now();
            this.channelState = "running";
            log.info("[Channel] [Instance {}] Heartbeat accepted: serverTime={}, nextHeartbeatSeconds={}",
                    instanceId, response.serverTime(), response.nextHeartbeatSeconds());
        } catch (Exception e) {
            this.channelState = "backoff";
            log.error("[Channel] [Instance {}] Failed to send heartbeat to Tiangge: {}", instanceId, e.getMessage());
        }
    }

    @Override
    public void publishListings() {
        String instanceId = getInstanceId();
        try {
            List<ListingDto> listings = channelTranslator.toListingDtos();
            tianggeClient.publishListings(listings);
            log.info("[Channel] [Instance {}] Published {} product listings to Tiangge marketplace.",
                    instanceId, listings.size());
        } catch (Exception e) {
            log.error("[Channel] [Instance {}] Failed to publish listings to Tiangge: {}", instanceId, e.getMessage());
        }
    }

    @Override
    public void publishStock() {
        String instanceId = getInstanceId();
        try {
            List<InventoryItem> items = inventoryService.getAllItems();
            List<StockItemDto> stock = channelTranslator.toStockDtos(items);
            tianggeClient.publishStock(stock);
            log.info("[Channel] [Instance {}] Stock figures published for {} items: {}",
                    instanceId, stock.size(), stock);
        } catch (Exception e) {
            log.error("[Channel] [Instance {}] Failed to publish stock to Tiangge: {}", instanceId, e.getMessage());
        }
    }

    @Override
    public void pollOrderFeed() {
        String instanceId = getInstanceId();
        synchronized (feedPollLock) {
            if (!tianggeClient.hasApiKey() || lastHeartbeatTime == null) {
                return;
            }

            try {
                Long cursor = getSavedCursor();
                log.debug("[Channel] [Instance {}] Polling Tiangge order feed after cursor: {}", instanceId, cursor);

                int pages = 0;
                while (pages < 5) {
                    pages++;
                    FeedResponse response = tianggeClient.fetchOrderFeed(cursor, 20);
                    if (response == null || response.events() == null || response.events().isEmpty()) {
                        if (response != null && response.nextCursor() != null) {
                            advanceCursor(response.nextCursor());
                        }
                        break;
                    }

                    log.info("[Channel] [Instance {}] Received {} events from Tiangge order feed",
                            instanceId, response.events().size());

                    for (FeedEventDto event : response.events()) {
                        processEvent(event);
                        if (event.seq() != null) {
                            advanceCursor(event.seq());
                            cursor = event.seq();
                        }
                    }

                    if (response.nextCursor() != null) {
                        advanceCursor(response.nextCursor());
                        cursor = response.nextCursor();
                    }

                    if (response.events().size() < 20) {
                        break;
                    }
                }
            } catch (Exception e) {
                log.error("[Channel] [Instance {}] Error polling order feed: {}", instanceId, e.getMessage(), e);
            }
        }
    }

    private void processEvent(FeedEventDto event) {
        String instanceId = getInstanceId();
        if (event == null || event.type() == null) return;

        this.lastProcessedTime = Instant.now();
        switch (event.type()) {
            case "ORDER_PLACED" -> handleOrderPlaced(event);
            case "ORDER_CANCELLED" -> handleOrderCancelled(event);
            default -> log.warn("[Channel] [Instance {}] Unrecognized feed event type: {}", instanceId, event.type());
        }
    }

    private void handleOrderPlaced(FeedEventDto event) {
        String instanceId = getInstanceId();
        String orderId = event.orderId();
        log.info("[Channel] [Instance {}] Order received: Tiangge ID {}", instanceId, orderId);

        // 1. Idempotency & Duplicate Check
        var existingOpt = channelOrderRepository.findByTianggeOrderId(orderId);
        if (existingOpt.isPresent()) {
            ChannelOrder existing = existingOpt.get();
            log.info("[Channel] [Instance {}] Duplicate order detected: Tiangge ID {} (Decision={})",
                    instanceId, orderId, existing.getDecision());
            queueOrSendDecision(orderId, existing.getShopOrderId(), existing.getDecision(), existing.getReason());
            return;
        }

        CHANNEL_PROCESSING.set(true);
        try {
            // 2. Validate line items
            if (event.lines() == null || event.lines().isEmpty()) {
                log.warn("[Channel] [Instance {}] Order {} has no lines. Rejecting.", instanceId, orderId);
                OrderResponse rejection = orderService.placeOrder(new OrderRequest(Collections.emptyList()));
                saveAndReportDecision(orderId, rejection.getOrderId(), "REJECTED", "No line items in order", "");
                return;
            }

            String linesSummary = event.lines().stream()
                    .map(l -> l.sellerSku() + ":" + l.qty())
                    .collect(Collectors.joining(","));

            List<OrderItemRequest> itemRequests = event.lines().stream()
                    .map(line -> new OrderItemRequest(line.sellerSku(), line.qty()))
                    .toList();

            // 3. All-or-nothing order creation and stock reservation via OrderService
            OrderResponse orderResponse = orderService.placeOrder(new OrderRequest(itemRequests));

            if ("CONFIRMED".equalsIgnoreCase(orderResponse.getStatus())) {
                log.info("[Channel] [Instance {}] Order {} fully reserved -> Decision: ACCEPTED (Shop Order #{})",
                        instanceId, orderId, orderResponse.getOrderId());
                // Step A: Send ACCEPTED decision to Tiangge FIRST
                saveAndReportDecision(orderId, orderResponse.getOrderId(), "ACCEPTED", null, linesSummary);
                // Step B: Publish decremented stock to Tiangge SECOND (avoids "ignored accepted order")
                publishStock();
                return;
            }

            // 4. Insufficient stock -> Check for BACKORDERED vs REJECTED
            boolean allShortItemsCoveredByPo = true;
            for (FeedOrderLineDto line : event.lines()) {
                InventoryItem item = inventoryService.getItem(line.sellerSku());
                int currentStock = item != null ? item.getStock() : 0;
                if (currentStock < line.qty()) {
                    boolean hasOpenPo = hasOpenLegacySupplyPo(line.sellerSku());
                    if (!hasOpenPo) {
                        allShortItemsCoveredByPo = false;
                        log.info("[Channel] [Instance {}] Missing stock for {} with NO open supplier PO",
                                instanceId, line.sellerSku());
                        break;
                    }
                }
            }

            if (allShortItemsCoveredByPo) {
                String reason = "Stock replenishment order already in progress with supplier";
                log.info("[Channel] [Instance {}] Order {} short of stock with open supplier PO -> Decision: BACKORDERED (Shop Order #{})",
                        instanceId, orderId, orderResponse.getOrderId());
                saveAndReportDecision(orderId, orderResponse.getOrderId(), "BACKORDERED", reason, linesSummary);
            } else {
                String reason = orderResponse.getReason() != null ? orderResponse.getReason() : "Insufficient stock and no restock coming";
                if (reason.length() > 200) {
                    reason = reason.substring(0, 200);
                }
                log.info("[Channel] [Instance {}] Order {} short of stock with no supplier PO -> Decision: REJECTED (Shop Order #{})",
                        instanceId, orderId, orderResponse.getOrderId());
                saveAndReportDecision(orderId, orderResponse.getOrderId(), "REJECTED", reason, linesSummary);
            }
        } finally {
            CHANNEL_PROCESSING.set(false);
        }
    }

    private void handleOrderCancelled(FeedEventDto event) {
        String instanceId = getInstanceId();
        String orderId = event.orderId();
        log.info("[Channel] [Instance {}] Cancellation received: Tiangge ID {}", instanceId, orderId);

        CHANNEL_PROCESSING.set(true);
        try {
            // Step A: Confirm cancellation to Tiangge FIRST (by confirmDeadline within 60s)
            try {
                tianggeClient.confirmCancellation(orderId);
                log.info("[Channel] [Instance {}] Cancellation confirmed to Tiangge: {}", instanceId, orderId);
            } catch (Exception e) {
                log.warn("[Channel] [Instance {}] Cancellation confirm failed for {}. Queued in outbox: {}",
                        instanceId, orderId, e.getMessage());
                outboxRepository.save(new ChannelOutboxTask("CANCELLATION", orderId, null, Instant.now()));
            }

            // Step B: Return items to stock in internal shop/inventory
            var existingOpt = channelOrderRepository.findByTianggeOrderId(orderId);
            if (existingOpt.isPresent()) {
                ChannelOrder order = existingOpt.get();
                if (!order.isCancelled()) {
                    if ("ACCEPTED".equalsIgnoreCase(order.getDecision())) {
                        try {
                            log.info("[Channel] [Instance {}] Restocking and cancelling shop order #{} for Tiangge ID {}",
                                    instanceId, order.getShopOrderId(), orderId);
                            orderService.cancelOrder(order.getShopOrderId());
                        } catch (Exception e) {
                            log.warn("[Channel] [Instance {}] Error cancelling shop order #{}: {}",
                                    instanceId, order.getShopOrderId(), e.getMessage());
                        }
                    }
                    order.setCancelled(true);
                    channelOrderRepository.save(order);
                }
            }

            // Step C: Publish stock to Tiangge SECOND (as required by manual: "Confirm ..., and then publish your stock.")
            publishStock();
        } finally {
            CHANNEL_PROCESSING.set(false);
        }
    }

    @Override
    public void resolveBackorders() {
        String instanceId = getInstanceId();
        synchronized (backorderLock) {
            List<ChannelOrder> backorders = channelOrderRepository
                    .findByDecisionAndResolvedFalseAndCancelledFalseOrderByCreatedAtAsc("BACKORDERED");

            if (backorders.isEmpty()) {
                return;
            }

            CHANNEL_PROCESSING.set(true);
            try {
                log.info("[Channel] [Instance {}] Evaluating {} waiting backorders for replenishment resolution...",
                        instanceId, backorders.size());

                boolean stockChanged = false;

                for (ChannelOrder backorder : backorders) {
                    Map<String, Integer> lineItems = parseLineSummary(backorder.getLinesSummary());
                    if (lineItems.isEmpty()) {
                        continue;
                    }

                    // Check if ALL lines can now be filled from stock
                    boolean canFillAll = true;
                    for (Map.Entry<String, Integer> entry : lineItems.entrySet()) {
                        InventoryItem item = inventoryService.getItem(entry.getKey());
                        int stock = item != null ? item.getStock() : 0;
                        if (stock < entry.getValue()) {
                            canFillAll = false;
                            break;
                        }
                    }

                    if (canFillAll) {
                        // Reserve stock for all lines
                        for (Map.Entry<String, Integer> entry : lineItems.entrySet()) {
                            inventoryService.reserve(entry.getKey(), entry.getValue());
                        }
                        stockChanged = true;

                        // Resolve to ACCEPTED
                        backorder.setResolved(true);
                        backorder.setResolutionStatus("ACCEPTED");
                        channelOrderRepository.save(backorder);

                        log.info("[Channel] [Instance {}] Backorder resolution: Tiangge ID {} resolved to ACCEPTED",
                                instanceId, backorder.getTianggeOrderId());

                        // Send resolution FIRST
                        queueOrSendResolution(backorder.getTianggeOrderId(), "ACCEPTED");
                    } else {
                        // Check if an open supplier PO still remains for missing items
                        boolean hasSupplierPoRemaining = false;
                        for (Map.Entry<String, Integer> entry : lineItems.entrySet()) {
                            InventoryItem item = inventoryService.getItem(entry.getKey());
                            int stock = item != null ? item.getStock() : 0;
                            if (stock < entry.getValue()) {
                                if (hasOpenLegacySupplyPo(entry.getKey())) {
                                    hasSupplierPoRemaining = true;
                                    break;
                                }
                            }
                        }

                        // If NO supplier PO is left on the way and stock is insufficient, cancel it
                        if (!hasSupplierPoRemaining) {
                            backorder.setResolved(true);
                            backorder.setResolutionStatus("CANCELLED");
                            channelOrderRepository.save(backorder);

                            log.info("[Channel] [Instance {}] Backorder resolution: Tiangge ID {} resolved to CANCELLED (cannot fill)",
                                    instanceId, backorder.getTianggeOrderId());

                            queueOrSendResolution(backorder.getTianggeOrderId(), "CANCELLED");
                        }
                    }
                }

                // Publish stock SECOND after all backorder resolutions have been dispatched
                if (stockChanged) {
                    publishStock();
                }
            } finally {
                CHANNEL_PROCESSING.set(false);
            }
        }
    }

    private Map<String, Integer> parseLineSummary(String summary) {
        Map<String, Integer> map = new LinkedHashMap<>();
        if (summary == null || summary.isBlank()) return map;

        String[] parts = summary.split(",");
        for (String part : parts) {
            String[] kv = part.trim().split(":");
            if (kv.length == 2) {
                try {
                    map.put(kv[0].trim(), Integer.parseInt(kv[1].trim()));
                } catch (NumberFormatException ignored) {}
            }
        }
        return map;
    }

    private void queueOrSendResolution(String tianggeOrderId, String status) {
        String instanceId = getInstanceId();
        try {
            tianggeClient.resolveBackorder(tianggeOrderId, status);
        } catch (Exception e) {
            log.warn("[Channel] [Instance {}] Backorder resolution failed for {}. Queued in outbox: {}",
                    instanceId, tianggeOrderId, e.getMessage());
            outboxRepository.save(new ChannelOutboxTask("RESOLUTION", tianggeOrderId, status, Instant.now()));
        }
    }

    private void queueOrSendDecision(String tianggeOrderId, Long shopOrderId, String decision, String reason) {
        String instanceId = getInstanceId();
        OrderDecisionRequest request = new OrderDecisionRequest(decision, "SO-" + shopOrderId, reason);
        try {
            tianggeClient.sendOrderDecision(tianggeOrderId, request);
        } catch (Exception e) {
            log.warn("[Channel] [Instance {}] Decision reporting failed for {}. Queued in outbox: {}",
                    instanceId, tianggeOrderId, e.getMessage());
            try {
                String payload = objectMapper.writeValueAsString(request);
                outboxRepository.save(new ChannelOutboxTask("DECISION", tianggeOrderId, payload, Instant.now()));
            } catch (Exception serializationError) {
                log.error("[Channel] [Instance {}] Serialization error: {}", instanceId, serializationError.getMessage());
            }
        }
    }

    private void saveAndReportDecision(String tianggeOrderId, Long shopOrderId, String decision, String reason, String linesSummary) {
        try {
            ChannelOrder channelOrder = new ChannelOrder(
                    tianggeOrderId,
                    shopOrderId,
                    decision,
                    reason,
                    linesSummary,
                    Instant.now()
            );
            channelOrderRepository.save(channelOrder);
        } catch (Exception e) {
            log.warn("[Channel] [Instance {}] Could not save ChannelOrder record: {}", getInstanceId(), e.getMessage());
        }

        queueOrSendDecision(tianggeOrderId, shopOrderId, decision, reason);
    }

    private boolean hasOpenLegacySupplyPo(String productId) {
        if (productId == null || supplierGateway == null) {
            return false;
        }
        List<SupplierOrderSummary> orders = supplierGateway.getAllOrders();
        if (orders == null) return false;

        return orders.stream().anyMatch(o ->
                productId.equalsIgnoreCase(o.productId()) &&
                        (o.status() == SupplierOrderStatus.SUBMITTED
                                || o.status() == SupplierOrderStatus.PICKING
                                || o.status() == SupplierOrderStatus.SHIPPED
                                || (o.status() == SupplierOrderStatus.PENDING && o.poNumber() != null))
        );
    }

    private Long getSavedCursor() {
        return channelFeedCursorRepository.findById(CURSOR_FEED_NAME)
                .map(ChannelFeedCursor::getLastCursor)
                .orElse(null);
    }

    private void advanceCursor(Long seq) {
        if (seq == null) return;

        var existingOpt = channelFeedCursorRepository.findById(CURSOR_FEED_NAME);
        if (existingOpt.isEmpty()) {
            ChannelFeedCursor cursor = new ChannelFeedCursor(CURSOR_FEED_NAME, seq, Instant.now());
            channelFeedCursorRepository.saveAndFlush(cursor);
            log.info("[Channel] [Instance {}] Durable cursor initialized to sequence {}", getInstanceId(), seq);
        } else {
            ChannelFeedCursor cursor = existingOpt.get();
            if (cursor.getLastCursor() == null || seq > cursor.getLastCursor()) {
                cursor.setLastCursor(seq);
                cursor.setUpdatedAt(Instant.now());
                channelFeedCursorRepository.saveAndFlush(cursor);
                log.info("[Channel] [Instance {}] Durable cursor advanced to sequence {}", getInstanceId(), seq);
            }
        }
    }

    public ChannelStatusDto getStatus() {
        String instanceId = getInstanceId();
        boolean online = lastHeartbeatTime != null &&
                Duration.between(lastHeartbeatTime, Instant.now()).getSeconds() < 90;

        String currentState = online ? channelState : "paused";

        long totalOrders = channelOrderRepository.count();
        long totalAccepted = channelOrderRepository.countByDecision("ACCEPTED");
        long totalRejected = channelOrderRepository.countByDecision("REJECTED");
        long totalBackordered = channelOrderRepository.countByDecision("BACKORDERED");
        long totalCancelled = channelOrderRepository.countByCancelledTrue();

        long totalSupplierOrders = 0;
        long totalDeliveries = 0;
        if (supplierGateway != null) {
            try {
                var sOrders = supplierGateway.getAllOrders();
                if (sOrders != null) {
                    totalSupplierOrders = sOrders.size();
                    totalDeliveries = sOrders.stream()
                            .filter(o -> o.status() == SupplierOrderStatus.DELIVERED)
                            .count();
                }
            } catch (Exception ignored) {}
        }

        List<ChannelOrderItemDto> recent = channelOrderRepository.findAllByOrderByCreatedAtDesc().stream()
                .limit(20)
                .map(o -> {
                    String status = o.getDecision();
                    if (o.isCancelled()) {
                        status = "CANCELLED";
                    } else if (o.isResolved() && o.getResolutionStatus() != null) {
                        status = o.getResolutionStatus();
                    }
                    return new ChannelOrderItemDto(o.getTianggeOrderId(), o.getShopOrderId(), status, o.getCreatedAt().toString());
                })
                .toList();

        return new ChannelStatusDto(
                instanceId,
                online,
                currentState,
                lastHeartbeatTime != null ? lastHeartbeatTime.toString() : null,
                getSavedCursor(),
                lastProcessedTime != null ? lastProcessedTime.toString() : null,
                totalOrders,
                totalAccepted,
                totalRejected,
                totalBackordered,
                totalCancelled,
                totalSupplierOrders,
                totalDeliveries,
                recent
        );
    }

    @Override
    public String getInstanceId() {
        return instanceInterceptor.getInstanceId();
    }
}
