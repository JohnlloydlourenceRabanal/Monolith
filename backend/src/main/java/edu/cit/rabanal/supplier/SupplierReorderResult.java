package edu.cit.rabanal.supplier;

/**
 * Domain-specific result DTO returned by SupplierGateway.
 * Protects caller from any LegacySupply XML or internal representations.
 */
public record SupplierReorderResult(
        boolean success,
        String buyerRef,
        String poNumber,
        SupplierOrderStatus status,
        int casesOrdered,
        int unitsOrdered,
        String message
) {
    public static SupplierReorderResult pending(String buyerRef, int cases, int units, String msg) {
        return new SupplierReorderResult(true, buyerRef, null, SupplierOrderStatus.PENDING, cases, units, msg);
    }

    public static SupplierReorderResult submitted(String buyerRef, String poNumber, int cases, int units) {
        return new SupplierReorderResult(true, buyerRef, poNumber, SupplierOrderStatus.SUBMITTED, cases, units, "Order submitted successfully to supplier");
    }

    public static SupplierReorderResult failure(String buyerRef, String msg) {
        return new SupplierReorderResult(false, buyerRef, null, SupplierOrderStatus.FAILED, 0, 0, msg);
    }
}
