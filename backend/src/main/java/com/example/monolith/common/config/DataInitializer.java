package com.example.monolith.common.config;

import com.example.monolith.inventory.internal.domain.InventoryStock;
import com.example.monolith.inventory.internal.domain.Product;
import com.example.monolith.inventory.internal.repository.InventoryStockRepository;
import com.example.monolith.inventory.internal.repository.ProductRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final ProductRepository productRepository;
    private final InventoryStockRepository stockRepository;

    public DataInitializer(ProductRepository productRepository, InventoryStockRepository stockRepository) {
        this.productRepository = productRepository;
        this.stockRepository = stockRepository;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (productRepository.count() == 0) {
            log.info("[Data Seeding] Seeding initial products and inventory stocks...");

            seedItem("MBP-16", "MacBook Pro 16\"", "M3 Pro chip, 36GB Unified Memory, 1TB SSD", new BigDecimal("2499.00"), 15);
            seedItem("KB-MECH", "Mechanical Keyboard", "Hot-swappable RGB mechanical keyboard with brown switches", new BigDecimal("149.99"), 25);
            seedItem("HP-WH1000", "Wireless ANC Headphones", "Flagship active noise-canceling wireless over-ear headphones", new BigDecimal("299.99"), 20);
            seedItem("MON-4K", "Ultra-wide 4K Monitor", "34-inch curved IPS panel, 144Hz, USB-C 90W PD", new BigDecimal("799.00"), 8);
            seedItem("CHR-ERGO", "Ergonomic Office Chair", "High back mesh office chair with lumbar support", new BigDecimal("450.00"), 10);
            seedItem("SW-LTD", "Limited Edition Smartwatch", "Titanium casing, sapphire glass, cellular GPS", new BigDecimal("399.00"), 3);

            log.info("[Data Seeding] Successfully seeded 6 catalog products with initial inventory.");
        } else {
            log.info("[Data Seeding] Existing products found (count: {}). Skipping seeding.", productRepository.count());
        }
    }

    private void seedItem(String sku, String name, String description, BigDecimal price, int initialStock) {
        productRepository.save(new Product(sku, name, description, price));
        stockRepository.save(new InventoryStock(sku, initialStock, 0));
    }
}
