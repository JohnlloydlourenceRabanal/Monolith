package edu.cit.rabanal.channel;

import edu.cit.rabanal.inventory.InventoryItem;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Package-private Translator.
 * Maps internal inventory products to Tiangge marketplace listings and stock items,
 * associating each product with its corresponding LegacySupply catalog supplierSku.
 */
@Component
class ChannelTranslator {

    record ProductMapping(String sellerSku, String title, String supplierSku) {}

    private final Map<String, ProductMapping> mappings = new ConcurrentHashMap<>();

    public ChannelTranslator() {
        // Discovered catalog mapping for student 21-0328-885
        mappings.put("P100", new ProductMapping("P100", "Wireless Mouse", "LEZ-1290"));
        mappings.put("P200", new ProductMapping("P200", "Mechanical Keyboard", "LEZ-6626"));
        mappings.put("P300", new ProductMapping("P300", "USB-C Hub", "LEZ-9515"));
    }

    public List<ListingDto> toListingDtos() {
        List<ListingDto> dtos = new ArrayList<>();
        for (ProductMapping pm : mappings.values()) {
            dtos.add(new ListingDto(pm.sellerSku(), pm.title(), pm.supplierSku()));
        }
        return dtos;
    }

    public List<StockItemDto> toStockDtos(List<InventoryItem> items) {
        List<StockItemDto> stockDtos = new ArrayList<>();
        if (items == null) return stockDtos;

        for (InventoryItem item : items) {
            if (mappings.containsKey(item.getProductId())) {
                stockDtos.add(new StockItemDto(item.getProductId(), Math.max(0, item.getStock())));
            }
        }
        return stockDtos;
    }

    public ProductMapping getMapping(String sellerSku) {
        return mappings.get(sellerSku);
    }
}
