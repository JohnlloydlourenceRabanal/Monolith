package edu.cit.rabanal.supplier;

/**
 * Domain-specific order status enum for the Modular Monolith.
 * Anti-Corruption Layer requirement: Does NOT expose or leak LegacySupply status codes (10, 20, 30, 40).
 */
public enum SupplierOrderStatus {
    PENDING,
    SUBMITTED,
    PICKING,
    SHIPPED,
    DELIVERED,
    CANCELLED,
    FAILED
}
