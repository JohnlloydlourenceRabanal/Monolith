package com.example.monolith.inventory.api.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record ReserveStockItemRequest(
        @NotBlank(message = "SKU is required")
        String sku,

        @Min(value = 1, message = "Quantity must be at least 1")
        int quantity
) {}
