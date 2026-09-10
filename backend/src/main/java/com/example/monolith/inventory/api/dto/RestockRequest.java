package com.example.monolith.inventory.api.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record RestockRequest(
        @NotBlank(message = "SKU is required")
        String sku,

        @Min(value = 1, message = "Restock amount must be at least 1")
        int amount
) {}
