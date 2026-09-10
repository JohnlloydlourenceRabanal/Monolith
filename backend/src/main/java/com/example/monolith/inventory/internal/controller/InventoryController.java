package com.example.monolith.inventory.internal.controller;

import com.example.monolith.common.dto.ApiResponse;
import com.example.monolith.common.exception.ResourceNotFoundException;
import com.example.monolith.inventory.api.dto.ProductDto;
import com.example.monolith.inventory.api.dto.RestockRequest;
import com.example.monolith.inventory.internal.service.InventoryServiceImpl;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/inventory")
@Tag(name = "Inventory", description = "Inventory and stock management endpoints")
public class InventoryController {

    private final InventoryServiceImpl inventoryService;

    public InventoryController(InventoryServiceImpl inventoryService) {
        this.inventoryService = inventoryService;
    }

    @GetMapping
    @Operation(summary = "List all inventory items and products")
    public ResponseEntity<ApiResponse<List<ProductDto>>> getAllInventory() {
        List<ProductDto> products = inventoryService.getAllProducts();
        return ResponseEntity.ok(ApiResponse.success(products, "Inventory fetched successfully"));
    }

    @GetMapping("/{sku}")
    @Operation(summary = "Get product stock by SKU")
    public ResponseEntity<ApiResponse<ProductDto>> getProductBySku(@PathVariable String sku) {
        ProductDto product = inventoryService.getProductBySku(sku)
                .orElseThrow(() -> new ResourceNotFoundException("Product with SKU '" + sku + "' not found"));
        return ResponseEntity.ok(ApiResponse.success(product));
    }

    @PostMapping("/restock")
    @Operation(summary = "Restock inventory for a given SKU")
    public ResponseEntity<ApiResponse<ProductDto>> restock(@Valid @RequestBody RestockRequest request) {
        ProductDto updated = inventoryService.restock(request.sku(), request.amount());
        return ResponseEntity.ok(ApiResponse.success(updated, "Successfully restocked " + request.amount() + " units for SKU " + request.sku()));
    }
}
