package edu.cit.rabanal.supplier;

import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Package-private Translator.
 * Converts internal domain terms (Product IDs, units needed) to LegacySupply partner concepts
 * (SupplierSku, PackSize, whole cases/cartons) with round-up arithmetic.
 */
@Component
class SupplierTranslator {

    record SupplierMapping(String supplierSku, String description, int packSize) {}

    private final Map<String, SupplierMapping> catalogMap = new ConcurrentHashMap<>();

    public SupplierTranslator() {
        // Default mapping for student 21-0328-885 discovered catalog
        catalogMap.put("P100", new SupplierMapping("LEZ-1290", "WIRELESS MOUSE 2.4GHZ", 24));
        catalogMap.put("P200", new SupplierMapping("LEZ-6626", "KEYBOARD MECH TKL", 24));
        catalogMap.put("P300", new SupplierMapping("LEZ-9515", "USB HUB 4-PORT", 20));
    }

    public void registerSupplierItem(String productId, String supplierSku, String description, int packSize) {
        catalogMap.put(productId, new SupplierMapping(supplierSku, description, packSize));
    }

    public void registerFromCatalog(java.util.List<CatalogXml.CatalogItemXml> items) {
        if (items == null || items.isEmpty()) return;

        for (CatalogXml.CatalogItemXml item : items) {
            if (item.getDescription() == null || item.getSupplierSku() == null) continue;
            String desc = item.getDescription().toUpperCase();
            if (desc.contains("WIRELESS MOUSE") || (desc.contains("MOUSE") && !desc.contains("PAD"))) {
                registerSupplierItem("P100", item.getSupplierSku(), item.getDescription(), item.getPackSize());
            } else if (desc.contains("KEYBOARD")) {
                registerSupplierItem("P200", item.getSupplierSku(), item.getDescription(), item.getPackSize());
            } else if (desc.contains("HUB")) {
                registerSupplierItem("P300", item.getSupplierSku(), item.getDescription(), item.getPackSize());
            }
        }

        // Fallback: If any product is still on placeholder SKU, map by available item index
        if ("ABC-1234".equals(getMapping("P100").supplierSku()) && items.size() > 0) {
            registerSupplierItem("P100", items.get(0).getSupplierSku(), items.get(0).getDescription(), items.get(0).getPackSize());
        }
        if ("DEF-5678".equals(getMapping("P200").supplierSku()) && items.size() > 1) {
            registerSupplierItem("P200", items.get(1).getSupplierSku(), items.get(1).getDescription(), items.get(1).getPackSize());
        }
        if ("GHI-9012".equals(getMapping("P300").supplierSku()) && items.size() > 2) {
            registerSupplierItem("P300", items.get(2).getSupplierSku(), items.get(2).getDescription(), items.get(2).getPackSize());
        }
    }

    public SupplierMapping getMapping(String productId) {
        SupplierMapping mapping = catalogMap.get(productId);
        if (mapping == null) {
            // Fallback default mapping for unrecognized internal product
            return new SupplierMapping("SKU-" + productId, "PRODUCT " + productId, 10);
        }
        return mapping;
    }

    public String findProductIdBySku(String supplierSku) {
        for (Map.Entry<String, SupplierMapping> entry : catalogMap.entrySet()) {
            if (entry.getValue().supplierSku().equalsIgnoreCase(supplierSku)) {
                return entry.getKey();
            }
        }
        return null;
    }

    /**
     * Converts raw units required to LegacySupply order quantity (cases), rounding up.
     * Example: 15 units needed with PackSize 12 -> ceil(15/12) = 2 cases (24 units).
     */
    public int calculateCases(int unitsNeeded, int packSize) {
        if (unitsNeeded <= 0 || packSize <= 0) {
            return 1;
        }
        return (int) Math.ceil((double) unitsNeeded / packSize);
    }

    /**
     * Translates LegacySupply numerical status code to internal domain SupplierOrderStatus.
     * 10 -> ACCEPTED / SUBMITTED
     * 20 -> PICKING
     * 30 -> SHIPPED
     * 40 -> DELIVERED
     */
    public SupplierOrderStatus mapStatusCode(String statusCode) {
        if (statusCode == null) return SupplierOrderStatus.PENDING;
        return switch (statusCode.trim().toUpperCase()) {
            case "10" -> SupplierOrderStatus.SUBMITTED;
            case "20" -> SupplierOrderStatus.PICKING;
            case "30" -> SupplierOrderStatus.SHIPPED;
            case "40" -> SupplierOrderStatus.DELIVERED;
            case "90", "99", "CANCELLED", "CANCELED" -> SupplierOrderStatus.CANCELLED;
            default -> SupplierOrderStatus.PENDING;
        };
    }
}
