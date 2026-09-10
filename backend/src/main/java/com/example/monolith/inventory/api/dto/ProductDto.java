package com.example.monolith.inventory.api.dto;

import java.math.BigDecimal;

public record ProductDto(
        Long id,
        String sku,
        String name,
        String description,
        BigDecimal price,
        int availableQuantity,
        int reservedQuantity
) {}
