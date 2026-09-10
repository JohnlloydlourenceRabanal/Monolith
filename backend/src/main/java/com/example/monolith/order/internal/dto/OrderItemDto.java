package com.example.monolith.order.internal.dto;

import java.math.BigDecimal;

public record OrderItemDto(
        Long id,
        String sku,
        int quantity,
        BigDecimal unitPrice,
        BigDecimal subtotal
) {}
