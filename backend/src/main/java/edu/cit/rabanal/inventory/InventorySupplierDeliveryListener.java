package edu.cit.rabanal.inventory;

import edu.cit.rabanal.supplier.SupplierOrderDeliveredEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Domain Event Listener in Inventory Module.
 * Part E requirement: Inventory listens to SupplierOrderDeliveredEvent and restocks the correct number of units.
 * Never imports anything describing LegacySupply, and never calls the supplier module directly.
 */
@Component
public class InventorySupplierDeliveryListener {

    private static final Logger log = LoggerFactory.getLogger(InventorySupplierDeliveryListener.class);

    private final InventoryService inventoryService;

    public InventorySupplierDeliveryListener(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    @EventListener
    public void onSupplierOrderDelivered(SupplierOrderDeliveredEvent event) {
        log.info("[Inventory Restock] Supplier order delivered: PO {} (BuyerRef {}). Restocking {} units of product {}...",
                event.getPoNumber(), event.getBuyerRef(), event.getUnits(), event.getProductId());

        try {
            inventoryService.restock(event.getProductId(), event.getUnits());
            log.info("[Inventory Restock] Restocked {} units of {} successfully.", event.getUnits(), event.getProductId());
        } catch (Exception e) {
            log.error("[Inventory Restock] Failed to restock product {}: {}", event.getProductId(), e.getMessage());
        }
    }
}
