package com.example.monolith.order.internal.dto;

import com.example.monolith.order.internal.domain.OrderStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record OrderResponseDto(
        Long id,
        String customerEmail,
        OrderStatus status,
        BigDecimal totalAmount,
        List<OrderItemDto> items,
        Instant createdAt,
        Instant updatedAt,
        String integrationStyleSummary
) {}
