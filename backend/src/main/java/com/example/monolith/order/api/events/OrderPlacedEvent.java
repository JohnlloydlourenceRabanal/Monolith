package com.example.monolith.order.api.events;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record OrderPlacedEvent(
        Long orderId,
        String customerEmail,
        BigDecimal totalAmount,
        List<OrderItemDetail> items,
        Instant placedAt
) {
    public record OrderItemDetail(
            String sku,
            int quantity,
            BigDecimal unitPrice
    ) {}
}
