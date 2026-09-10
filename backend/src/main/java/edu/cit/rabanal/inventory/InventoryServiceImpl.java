package edu.cit.rabanal.inventory;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * PACKAGE-PRIVATE implementation of InventoryService.
 * Enforces architectural boundary: cannot be imported or accessed directly
 * by classes outside of the edu.cit.rabanal.inventory package.
 */
@Service
@Transactional
class InventoryServiceImpl implements InventoryService {

    private static final Logger log = LoggerFactory.getLogger(InventoryServiceImpl.class);

    private final InventoryRepository inventoryRepository;

    InventoryServiceImpl(InventoryRepository inventoryRepository) {
        this.inventoryRepository = inventoryRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public InventoryItem getItem(String productId) {
        log.info("[In-Process Call] InventoryService.getItem('{}')", productId);
        return inventoryRepository.findById(productId).orElse(null);
    }

    @Override
    @Transactional
    public boolean reserve(String productId, int quantity) {
        log.info("[In-Process Call] InventoryService.reserve('{}', quantity: {})", productId, quantity);

        if (quantity <= 0) {
            log.warn("[Reservation Rejected] Quantity must be positive: {}", quantity);
            return false;
        }

        Optional<InventoryItem> itemOpt = inventoryRepository.findById(productId);
        if (itemOpt.isEmpty()) {
            log.warn("[Reservation Rejected] Product '{}' does not exist in inventory", productId);
            return false;
        }

        InventoryItem item = itemOpt.get();
        if (item.getStock() < quantity) {
            log.warn("[Reservation Rejected] Insufficient stock for product '{}'. Requested: {}, Available: {}",
                    productId, quantity, item.getStock());
            return false;
        }

        // Deduct stock and persist
        item.setStock(item.getStock() - quantity);
        inventoryRepository.save(item);

        log.info("[Reservation Confirmed] Reserved {} units of '{}'. Remaining stock: {}",
                quantity, productId, item.getStock());
        return true;
    }

    @Override
    @Transactional(readOnly = true)
    public List<InventoryItem> getAllItems() {
        return inventoryRepository.findAll();
    }
}
