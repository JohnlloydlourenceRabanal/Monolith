package edu.cit.rabanal.notification;

import edu.cit.rabanal.inventory.event.LowStockEvent;
import edu.cit.rabanal.shop.event.OrderCancelledEvent;
import edu.cit.rabanal.shop.event.OrderPlacedEvent;
import edu.cit.rabanal.shop.event.OrderRejectedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.time.Instant;

/**
 * Domain Event Listener in Notification module.
 * Architectural Boundary: Depends exclusively on event DTOs.
 * Never imports or invokes OrderService, InventoryService, or repositories of other modules.
 */
@Component
public class NotificationEventListener {

    private static final Logger log = LoggerFactory.getLogger(NotificationEventListener.class);

    private final NotificationRepository notificationRepository;

    public NotificationEventListener(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
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
        String msg = String.format("LOW-STOCK ALERT: Product %s (%s) dropped to %d units (threshold: %d). Reorder needed!",
                event.getProductId(), event.getProductName(), event.getCurrentStock(), event.getThreshold());
        log.warn("[Notification Event] Low-Stock Alert: {}", msg);
        notificationRepository.save(new Notification(msg, Instant.now()));
    }
}
