package edu.cit.rabanal.inventory.event;

import java.time.Instant;

public class LowStockEvent {

    private final String productId;
    private final String productName;
    private final int currentStock;
    private final int threshold;
    private final Instant timestamp;

    public LowStockEvent(String productId, String productName, int currentStock, int threshold) {
        this.productId = productId;
        this.productName = productName;
        this.currentStock = currentStock;
        this.threshold = threshold;
        this.timestamp = Instant.now();
    }

    public String getProductId() {
        return productId;
    }

    public String getProductName() {
        return productName;
    }

    public int getCurrentStock() {
        return currentStock;
    }

    public int getThreshold() {
        return threshold;
    }

    public Instant getTimestamp() {
        return timestamp;
    }
}
