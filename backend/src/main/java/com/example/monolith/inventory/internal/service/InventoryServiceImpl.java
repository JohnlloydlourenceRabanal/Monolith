package com.example.monolith.inventory.internal.service;

import com.example.monolith.common.exception.InsufficientStockException;
import com.example.monolith.common.exception.ResourceNotFoundException;
import com.example.monolith.inventory.api.InventoryModuleApi;
import com.example.monolith.inventory.api.dto.ProductDto;
import com.example.monolith.inventory.api.dto.ReserveStockItemRequest;
import com.example.monolith.inventory.api.dto.StockReservationResult;
import com.example.monolith.inventory.internal.domain.InventoryStock;
import com.example.monolith.inventory.internal.domain.Product;
import com.example.monolith.inventory.internal.repository.InventoryStockRepository;
import com.example.monolith.inventory.internal.repository.ProductRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional
public class InventoryServiceImpl implements InventoryModuleApi {

    private static final Logger log = LoggerFactory.getLogger(InventoryServiceImpl.class);

    private final ProductRepository productRepository;
    private final InventoryStockRepository stockRepository;

    public InventoryServiceImpl(ProductRepository productRepository, InventoryStockRepository stockRepository) {
        this.productRepository = productRepository;
        this.stockRepository = stockRepository;
    }

    @Override
    public StockReservationResult checkAndReserveStock(List<ReserveStockItemRequest> items) {
        log.info("[In-Process Boundary Call] InventoryModuleApi.checkAndReserveStock invoked with {} items", items.size());

        if (items == null || items.isEmpty()) {
            return StockReservationResult.failure("No items to reserve");
        }

        // Sort items by SKU to prevent database deadlocks when acquiring pessimistic locks
        List<ReserveStockItemRequest> sortedItems = items.stream()
                .sorted(Comparator.comparing(ReserveStockItemRequest::sku))
                .toList();

        List<StockReservationResult.ReservedItemDetail> reservedDetails = new ArrayList<>();

        for (ReserveStockItemRequest item : sortedItems) {
            InventoryStock stock = stockRepository.findBySkuWithLock(item.sku())
                    .orElseThrow(() -> new ResourceNotFoundException("Product with SKU '" + item.sku() + "' not found in inventory"));

            if (stock.getAvailableQuantity() < item.quantity()) {
                log.warn("[Stock Shortage] SKU '{}' has {} available, but {} was requested",
                        item.sku(), stock.getAvailableQuantity(), item.quantity());
                throw new InsufficientStockException(item.sku(), item.quantity(), stock.getAvailableQuantity());
            }

            // Deduct available stock
            stock.setAvailableQuantity(stock.getAvailableQuantity() - item.quantity());
            stock.setReservedQuantity(stock.getReservedQuantity() + item.quantity());
            stockRepository.save(stock);

            reservedDetails.add(new StockReservationResult.ReservedItemDetail(
                    item.sku(),
                    item.quantity(),
                    stock.getAvailableQuantity()
            ));

            log.info("[In-Process Stock Reserved] SKU '{}' reserved {} units. Remaining available: {}",
                    item.sku(), item.quantity(), stock.getAvailableQuantity());
        }

        return StockReservationResult.success(reservedDetails);
    }

    @Override
    public void releaseStock(List<ReserveStockItemRequest> items) {
        log.info("[In-Process Boundary Call] Releasing stock for {} items", items.size());
        for (ReserveStockItemRequest item : items) {
            stockRepository.findBySku(item.sku()).ifPresent(stock -> {
                stock.setAvailableQuantity(stock.getAvailableQuantity() + item.quantity());
                stock.setReservedQuantity(Math.max(0, stock.getReservedQuantity() - item.quantity()));
                stockRepository.save(stock);
                log.info("[Stock Released] Restored {} units to SKU '{}'", item.quantity(), item.sku());
            });
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProductDto> getAllProducts() {
        List<Product> products = productRepository.findAll();
        Map<String, InventoryStock> stockMap = stockRepository.findAll().stream()
                .collect(Collectors.toMap(InventoryStock::getSku, s -> s));

        return products.stream().map(p -> {
            InventoryStock stock = stockMap.get(p.getSku());
            int available = stock != null ? stock.getAvailableQuantity() : 0;
            int reserved = stock != null ? stock.getReservedQuantity() : 0;
            return new ProductDto(p.getId(), p.getSku(), p.getName(), p.getDescription(), p.getPrice(), available, reserved);
        }).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<ProductDto> getProductBySku(String sku) {
        return productRepository.findBySku(sku).map(p -> {
            InventoryStock stock = stockRepository.findBySku(sku).orElse(null);
            int available = stock != null ? stock.getAvailableQuantity() : 0;
            int reserved = stock != null ? stock.getReservedQuantity() : 0;
            return new ProductDto(p.getId(), p.getSku(), p.getName(), p.getDescription(), p.getPrice(), available, reserved);
        });
    }

    public ProductDto restock(String sku, int amount) {
        log.info("[Restock] Restocking SKU '{}' with {} units", sku, amount);
        Product product = productRepository.findBySku(sku)
                .orElseThrow(() -> new ResourceNotFoundException("Product with SKU '" + sku + "' not found"));

        InventoryStock stock = stockRepository.findBySkuWithLock(sku)
                .orElseGet(() -> new InventoryStock(sku, 0, 0));

        stock.setAvailableQuantity(stock.getAvailableQuantity() + amount);
        stockRepository.save(stock);

        log.info("[Restock Completed] New available stock for SKU '{}' is {}", sku, stock.getAvailableQuantity());
        return new ProductDto(
                product.getId(),
                product.getSku(),
                product.getName(),
                product.getDescription(),
                product.getPrice(),
                stock.getAvailableQuantity(),
                stock.getReservedQuantity()
        );
    }
}
