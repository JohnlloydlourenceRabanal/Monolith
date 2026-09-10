package com.example.monolith.inventory.api.dto;

import java.util.List;

public record StockReservationResult(
        boolean successful,
        String message,
        List<ReservedItemDetail> reservedItems
) {
    public record ReservedItemDetail(
            String sku,
            int quantityReserved,
            int remainingAvailable
    ) {}

    public static StockReservationResult success(List<ReservedItemDetail> reservedItems) {
        return new StockReservationResult(true, "All requested items reserved successfully in-process", reservedItems);
    }

    public static StockReservationResult failure(String message) {
        return new StockReservationResult(false, message, List.of());
    }
}
