package edu.cit.rabanal.supplier;

import java.time.Instant;

/**
 * Public summary DTO representing a supplier reorder record.
 */
public record SupplierOrderSummary(
        Long id,
        String productId,
        String buyerRef,
        String requestId,
        String poNumber,
        int cases,
        int units,
        SupplierOrderStatus status,
        Instant createdAt,
        Instant updatedAt
) {
}
