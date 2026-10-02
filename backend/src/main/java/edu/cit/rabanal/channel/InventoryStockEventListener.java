package edu.cit.rabanal.channel;

import edu.cit.rabanal.inventory.event.StockChangedEvent;
import edu.cit.rabanal.shop.event.OrderCancelledEvent;
import edu.cit.rabanal.shop.event.OrderPlacedEvent;
import edu.cit.rabanal.supplier.SupplierOrderDeliveredEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Package-private Event Listener.
 * Listens to domain events representing any change to stock levels:
 * - Orders placed (UI or Tiangge)
 * - Orders cancelled
 * - Supplier deliveries restocked
 * - Direct inventory modifications
 * Immediately publishes the new stock levels to Tiangge (event-driven only, no polling timers).
 */
@Component
class InventoryStockEventListener {

    private static final Logger log = LoggerFactory.getLogger(InventoryStockEventListener.class);

    private final ChannelGateway channelGateway;

    public InventoryStockEventListener(ChannelGateway channelGateway) {
        this.channelGateway = channelGateway;
    }

    @EventListener
    public void onStockChanged(StockChangedEvent event) {
        if (ChannelGatewayImpl.isChannelProcessing()) {
            return; // Skip intermediate line updates; ChannelGatewayImpl publishes stock atomically after decision/confirm
        }
        log.info("[Channel Event Hook] Inventory StockChangedEvent received for product {}: new stock = {}. Syncing stock to Tiangge...",
                event.productId(), event.newStock());
        channelGateway.publishStock();
    }

    @EventListener
    public void onOrderPlaced(OrderPlacedEvent event) {
        if (ChannelGatewayImpl.isChannelProcessing()) {
            return;
        }
        log.info("[Channel Event Hook] OrderPlacedEvent received (#{}). Syncing updated stock to Tiangge...",
                event.getOrderId());
        channelGateway.publishStock();
    }

    @EventListener
    public void onOrderCancelled(OrderCancelledEvent event) {
        if (ChannelGatewayImpl.isChannelProcessing()) {
            return;
        }
        log.info("[Channel Event Hook] OrderCancelledEvent received (#{}). Syncing restocked items to Tiangge...",
                event.getOrderId());
        channelGateway.publishStock();
    }

    @EventListener
    public void onSupplierOrderDelivered(SupplierOrderDeliveredEvent event) {
        // Handled by ChannelDeliveryEventListener and resolveBackorders
    }
}
