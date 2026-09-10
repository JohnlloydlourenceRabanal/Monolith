package edu.cit.rabanal.shop;

import edu.cit.rabanal.inventory.InventoryItem;
import edu.cit.rabanal.inventory.InventoryService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
public class OrderService {

    private static final Logger log = LoggerFactory.getLogger(OrderService.class);

    // Constructor injection of the InventoryService interface ONLY
    // InventoryServiceImpl is package-private in edu.cit.rabanal.inventory,
    // so this class cannot reference or import InventoryServiceImpl directly.
    private final InventoryService inventoryService;
    private final OrderRepository orderRepository;

    public OrderService(InventoryService inventoryService, OrderRepository orderRepository) {
        this.inventoryService = inventoryService;
        this.orderRepository = orderRepository;
    }

    @Transactional
    public OrderResponse placeOrder(OrderRequest request) {
        String productId = request.getProductId();
        int quantity = request.getQuantity();

        log.info("[Order Processing] Received order request: productId='{}', quantity={}", productId, quantity);

        // Step 1: Check existing inventory item in-process
        InventoryItem existingItem = inventoryService.getItem(productId);

        if (existingItem == null) {
            String reason = "Product '" + productId + "' not found in inventory";
            Order order = new Order(productId, quantity, "REJECTED", reason, Instant.now());
            orderRepository.save(order);
            log.warn("[Order REJECTED] {}", reason);
            return new OrderResponse("REJECTED", reason, null);
        }

        // Step 2: Attempt in-process stock reservation via InventoryService interface
        boolean reserved = inventoryService.reserve(productId, quantity);
        InventoryItem currentItem = inventoryService.getItem(productId);

        if (reserved) {
            // Write CONFIRMED order to orders table
            Order order = new Order(productId, quantity, "CONFIRMED", null, Instant.now());
            orderRepository.save(order);
            log.info("[Order CONFIRMED] Order placed for {} x '{}'. New stock: {}",
                    quantity, productId, currentItem.getStock());
            return new OrderResponse("CONFIRMED", null, currentItem);
        } else {
            // Write REJECTED order to orders table with failure reason
            String reason = "Insufficient stock: requested " + quantity + ", available " + currentItem.getStock();
            Order order = new Order(productId, quantity, "REJECTED", reason, Instant.now());
            orderRepository.save(order);
            log.warn("[Order REJECTED] {}", reason);
            return new OrderResponse("REJECTED", reason, currentItem);
        }
    }

    public List<Order> getAllOrders() {
        return orderRepository.findAllByOrderByCreatedAtDesc();
    }
}
