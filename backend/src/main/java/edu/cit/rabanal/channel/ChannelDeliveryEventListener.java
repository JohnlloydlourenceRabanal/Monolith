package edu.cit.rabanal.channel;

import edu.cit.rabanal.supplier.SupplierOrderDeliveredEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Package-private Event Listener.
 * Listens to SupplierOrderDeliveredEvent to trigger resolution of waiting backorders
 * when supplier deliveries restock products.
 * Configured with LOWEST_PRECEDENCE so the Inventory module restocks items first.
 */
@Component
class ChannelDeliveryEventListener {

    private static final Logger log = LoggerFactory.getLogger(ChannelDeliveryEventListener.class);

    private final ChannelGateway channelGateway;

    public ChannelDeliveryEventListener(ChannelGateway channelGateway) {
        this.channelGateway = channelGateway;
    }

    @EventListener
    @Order(Ordered.LOWEST_PRECEDENCE)
    public void onSupplierOrderDelivered(SupplierOrderDeliveredEvent event) {
        log.info("[Channel] [Instance {}] SupplierOrderDeliveredEvent received for product {} (PO {}). Triggering backorder resolution...",
                channelGateway.getInstanceId(), event.getProductId(), event.getPoNumber());
        channelGateway.resolveBackorders();
    }
}
