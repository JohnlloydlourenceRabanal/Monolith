package edu.cit.rabanal.supplier;

import java.time.Instant;

/**
 * Domain Event emitted when LegacySupply delivers a replenishment order.
 * Consumed by the Inventory module to restock available units.
 */
public class SupplierOrderDeliveredEvent {

    private final String productId;
    private final int units;
    private final String poNumber;
    private final String buyerRef;
    private final Instant deliveredAt;

    public SupplierOrderDeliveredEvent(String productId, int units, String poNumber, String buyerRef) {
        this.productId = productId;
        this.units = units;
        this.poNumber = poNumber;
        this.buyerRef = buyerRef;
        this.deliveredAt = Instant.now();
    }

    public String getProductId() {
        return productId;
    }

    public int getUnits() {
        return units;
    }

    public String getPoNumber() {
        return poNumber;
    }

    public String getBuyerRef() {
        return buyerRef;
    }

    public Instant getDeliveredAt() {
        return deliveredAt;
    }
}
