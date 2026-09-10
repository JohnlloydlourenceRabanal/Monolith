package com.example.monolith.common.exception;

public class InsufficientStockException extends RuntimeException {
    private final String sku;
    private final int requested;
    private final int available;

    public InsufficientStockException(String sku, int requested, int available) {
        super(String.format("Insufficient stock for SKU '%s': requested %d, available %d", sku, requested, available));
        this.sku = sku;
        this.requested = requested;
        this.available = available;
    }

    public String getSku() {
        return sku;
    }

    public int getRequested() {
        return requested;
    }

    public int getAvailable() {
        return available;
    }
}
