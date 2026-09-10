package com.example.monolith.order.internal.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record OrderItemRequest(
        @NotBlank(message = "SKU is required")
        String sku,

        @Min(value = 1, message = "Quantity must be at least 1")
        int quantity
) {}
