package com.example.monolith.inventory.api;

import com.example.monolith.inventory.api.dto.ProductDto;
import com.example.monolith.inventory.api.dto.ReserveStockItemRequest;
import com.example.monolith.inventory.api.dto.StockReservationResult;

import java.util.List;
import java.util.Optional;

/**
 * Public In-Process Module Boundary API for the Inventory Module.
 * Other modules (such as Order) must interact with Inventory EXCLUSIVELY
 * through this interface, never accessing internal repositories, services, or entities.
 */
public interface InventoryModuleApi {

    /**
     * Checks availability and atomically reserves stock for requested items.
     * Throws InsufficientStockException if any requested item does not have adequate stock.
     */
    StockReservationResult checkAndReserveStock(List<ReserveStockItemRequest> items);

    /**
     * Releases previously reserved or purchased stock back to available inventory.
     */
    void releaseStock(List<ReserveStockItemRequest> items);

    /**
     * Returns all products with current stock counts.
     */
    List<ProductDto> getAllProducts();

    /**
     * Fetches product details by SKU.
     */
    Optional<ProductDto> getProductBySku(String sku);
}
