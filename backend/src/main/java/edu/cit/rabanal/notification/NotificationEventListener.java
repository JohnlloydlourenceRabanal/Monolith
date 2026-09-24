package edu.cit.rabanal.notification;

import edu.cit.rabanal.inventory.event.LowStockEvent;
import edu.cit.rabanal.shop.event.OrderCancelledEvent;
import edu.cit.rabanal.shop.event.OrderPlacedEvent;
import edu.cit.rabanal.shop.event.OrderRejectedEvent;
import edu.cit.rabanal.supplier.SupplierGateway;
import edu.cit.rabanal.supplier.SupplierReorderResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.Instant;

/**
 * Domain Event Listener in Notification module.
 * Architectural Boundary: Depends exclusively on event DTOs and SupplierGateway interface.
 * Never imports or invokes OrderService, InventoryService, or LegacySupply internals.
 */
@Component
public class NotificationEventListener {

    private static final Logger log = LoggerFactory.getLogger(NotificationEventListener.class);

    private final NotificationRepository notificationRepository;
    private final SupplierGateway supplierGateway;

    public NotificationEventListener(NotificationRepository notificationRepository, SupplierGateway supplierGateway) {
        this.notificationRepository = notificationRepository;
        this.supplierGateway = supplierGateway;
    }

    @EventListener
    public void onOrderPlaced(OrderPlacedEvent event) {
        String msg = String.format("Order #%d confirmed: %s", event.getOrderId(), event.getSummary());
        log.info("[Notification Event] Recording: {}", msg);
        notificationRepository.save(new Notification(msg, Instant.now()));
    }

    @EventListener
    public void onOrderRejected(OrderRejectedEvent event) {
        String orderPrefix = event.getOrderId() != null ? "Order #" + event.getOrderId() : "Order";
        String msg = String.format("%s rejected: %s", orderPrefix, event.getReason());
        log.info("[Notification Event] Recording: {}", msg);
        notificationRepository.save(new Notification(msg, Instant.now()));
    }

    @EventListener
    public void onOrderCancelled(OrderCancelledEvent event) {
        String msg = String.format("Order #%d cancelled: %s returned to inventory", event.getOrderId(), event.getSummary());
        log.info("[Notification Event] Recording: {}", msg);
        notificationRepository.save(new Notification(msg, Instant.now()));
    }

    @EventListener
    public void onLowStock(LowStockEvent event) {
        log.warn("[Notification Event] Low-Stock Alert: Product {} ({}) dropped to {} units (threshold: {}). Placing replenishment order with supplier...",
                event.getProductId(), event.getProductName(), event.getCurrentStock(), event.getThreshold());

        // Part C requirement: The auto-reorder rule calls SupplierGateway instead of logging
        int unitsNeeded = Math.max(10, 20 - event.getCurrentStock());
        SupplierReorderResult reorderResult = supplierGateway.orderReplenishment(event.getProductId(), unitsNeeded);

        String msg = String.format("LOW-STOCK ALERT: Product %s (%s) dropped to %d units (threshold: %d). Auto-Reorder %s: %d cases (%d units). BuyerRef: %s, PO: %s",
                event.getProductId(),
                event.getProductName(),
                event.getCurrentStock(),
                event.getThreshold(),
                reorderResult.status(),
                reorderResult.casesOrdered(),
                reorderResult.unitsOrdered(),
                reorderResult.buyerRef(),
                reorderResult.poNumber() != null ? reorderResult.poNumber() : "PENDING");

        log.info("[Notification Event] Auto-Reorder recorded: {}", msg);
        notificationRepository.save(new Notification(msg, Instant.now()));
    }
}
