package edu.cit.rabanal.shop;

import edu.cit.rabanal.inventory.InventoryItem;
import edu.cit.rabanal.inventory.InventoryService;
import edu.cit.rabanal.shop.event.OrderCancelledEvent;
import edu.cit.rabanal.shop.event.OrderPlacedEvent;
import edu.cit.rabanal.shop.event.OrderRejectedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class OrderService {

    private static final Logger log = LoggerFactory.getLogger(OrderService.class);

    // Constructor injection of the InventoryService interface ONLY
    // InventoryServiceImpl is package-private in edu.cit.rabanal.inventory,
    // so this class cannot reference or import InventoryServiceImpl directly.
    private final InventoryService inventoryService;
    private final OrderRepository orderRepository;
    private final ApplicationEventPublisher eventPublisher;

    public OrderService(InventoryService inventoryService,
                        OrderRepository orderRepository,
                        ApplicationEventPublisher eventPublisher) {
        this.inventoryService = inventoryService;
        this.orderRepository = orderRepository;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public OrderResponse placeOrder(OrderRequest request) {
        List<OrderItemRequest> requestedItems = request.getItems();

        if (requestedItems == null || requestedItems.isEmpty()) {
            String reason = "Order must contain at least one line item";
            Order order = new Order("REJECTED", reason, Instant.now());
            orderRepository.save(order);
            eventPublisher.publishEvent(new OrderRejectedEvent(order.getOrderId(), reason));
            return new OrderResponse(order.getOrderId(), "REJECTED", reason, Collections.emptyList(), inventoryService.getAllItems());
        }

        log.info("[Order Processing] Processing multi-item order with {} items", requestedItems.size());

        // Step 1: Aggregate requested quantities by productId to validate cumulative demand
        Map<String, Integer> productTotals = new LinkedHashMap<>();
        for (OrderItemRequest item : requestedItems) {
            productTotals.merge(item.getProductId(), item.getQuantity(), Integer::sum);
        }

        // Step 2: Validate EVERY line item against available stock BEFORE reserving anything
        boolean allValid = true;
        List<OrderItemOutcome> outcomes = new ArrayList<>();
        List<String> rejectionReasons = new ArrayList<>();

        for (OrderItemRequest item : requestedItems) {
            String productId = item.getProductId();
            int qty = item.getQuantity();
            int totalNeeded = productTotals.get(productId);

            InventoryItem inventoryItem = inventoryService.getItem(productId);

            if (inventoryItem == null) {
                allValid = false;
                outcomes.add(new OrderItemOutcome(productId, qty, "PRODUCT_NOT_FOUND"));
                rejectionReasons.add("Product '" + productId + "' not found");
            } else if (inventoryItem.getStock() < totalNeeded) {
                allValid = false;
                outcomes.add(new OrderItemOutcome(productId, qty, "INSUFFICIENT_STOCK"));
                rejectionReasons.add("Insufficient stock for " + productId + " (requested: " + totalNeeded + ", available: " + inventoryItem.getStock() + ")");
            } else {
                outcomes.add(new OrderItemOutcome(productId, qty, "VALIDATED"));
            }
        }

        // Step 3: All-or-nothing check. If ANY item fails, reject the entire order with ZERO stock reserved
        if (!allValid) {
            String reason = String.join("; ", rejectionReasons);
            log.warn("[Order REJECTED - All-or-Nothing Rollback] {}", reason);

            Order order = new Order("REJECTED", reason, Instant.now());
            for (OrderItemRequest item : requestedItems) {
                order.addItem(item.getProductId(), item.getQuantity());
            }
            orderRepository.save(order);

            // Publish in-monolith domain event
            eventPublisher.publishEvent(new OrderRejectedEvent(order.getOrderId(), reason));

            return new OrderResponse(order.getOrderId(), "REJECTED", reason, outcomes, inventoryService.getAllItems());
        }

        // Step 4: All items passed validation -> Reserve stock for each item via in-process boundary
        for (OrderItemRequest item : requestedItems) {
            boolean reserved = inventoryService.reserve(item.getProductId(), item.getQuantity());
            if (!reserved) {
                throw new IllegalStateException("Unexpected reservation failure during atomic order execution for product: " + item.getProductId());
            }
        }

        // Step 5: Persist CONFIRMED order and order_items
        Order order = new Order("CONFIRMED", null, Instant.now());
        for (OrderItemRequest item : requestedItems) {
            order.addItem(item.getProductId(), item.getQuantity());
        }
        orderRepository.save(order);

        // Update outcome descriptions to CONFIRMED
        for (OrderItemOutcome outcome : outcomes) {
            outcome.setOutcome("CONFIRMED");
        }

        String summary = requestedItems.stream()
                .map(i -> i.getQuantity() + "x " + i.getProductId())
                .collect(Collectors.joining(", "));

        log.info("[Order CONFIRMED] Order #{} confirmed with items: {}", order.getOrderId(), summary);

        // Publish in-monolith domain event
        eventPublisher.publishEvent(new OrderPlacedEvent(order.getOrderId(), summary));

        return new OrderResponse(order.getOrderId(), "CONFIRMED", null, outcomes, inventoryService.getAllItems());
    }

    @Transactional
    public OrderResponse cancelOrder(Long orderId) {
        log.info("[Order Cancellation] Request to cancel order #{}", orderId);

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new OrderNotFoundException("Order #" + orderId + " not found"));

        if ("CANCELLED".equalsIgnoreCase(order.getStatus())) {
            throw new OrderConflictException("Order #" + orderId + " is already CANCELLED");
        }

        if ("REJECTED".equalsIgnoreCase(order.getStatus())) {
            throw new OrderConflictException("Cannot cancel order #" + orderId + " because it was REJECTED and no items were reserved");
        }

        // Return all reserved line items to stock
        for (OrderItem item : order.getItems()) {
            inventoryService.restock(item.getProductId(), item.getQuantity());
        }

        order.setStatus("CANCELLED");
        order.setReason("Order cancelled by user. Items returned to inventory.");
        orderRepository.save(order);

        String summary = order.getItems().stream()
                .map(i -> i.getQuantity() + "x " + i.getProductId())
                .collect(Collectors.joining(", "));

        log.info("[Order CANCELLED] Order #{} cancelled. Restocked: {}", orderId, summary);

        // Publish domain event
        eventPublisher.publishEvent(new OrderCancelledEvent(order.getOrderId(), summary));

        List<OrderItemOutcome> outcomes = order.getItems().stream()
                .map(i -> new OrderItemOutcome(i.getProductId(), i.getQuantity(), "RESTOCKED"))
                .collect(Collectors.toList());

        return new OrderResponse(order.getOrderId(), "CANCELLED", order.getReason(), outcomes, inventoryService.getAllItems());
    }

    public List<Order> getAllOrders() {
        return orderRepository.findAllByOrderByCreatedAtDesc();
    }
}
