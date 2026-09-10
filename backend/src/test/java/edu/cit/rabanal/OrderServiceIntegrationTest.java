package edu.cit.rabanal;

import edu.cit.rabanal.inventory.InventoryItem;
import edu.cit.rabanal.inventory.InventoryService;
import edu.cit.rabanal.shop.Order;
import edu.cit.rabanal.shop.OrderRepository;
import edu.cit.rabanal.shop.OrderRequest;
import edu.cit.rabanal.shop.OrderResponse;
import edu.cit.rabanal.shop.OrderService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
public class OrderServiceIntegrationTest {

    @Autowired
    private OrderService orderService;

    @Autowired
    private InventoryService inventoryService;

    @Autowired
    private OrderRepository orderRepository;

    @Test
    @DisplayName("Confirmed Path: Stock available -> status CONFIRMED, inventory decremented, order saved")
    void shouldConfirmOrderWhenStockIsSufficient() {
        // P100 initially has 25 units
        InventoryItem itemBefore = inventoryService.getItem("P100");
        assertThat(itemBefore).isNotNull();
        int initialStock = itemBefore.getStock();

        // Place order for 2 units
        OrderRequest request = new OrderRequest("P100", 2);
        OrderResponse response = orderService.placeOrder(request);

        // Verify response
        assertThat(response.getStatus()).isEqualTo("CONFIRMED");
        assertThat(response.getReason()).isNull();
        assertThat(response.getInventory()).isNotNull();
        assertThat(response.getInventory().getStock()).isEqualTo(initialStock - 2);

        // Verify database state in orders table
        List<Order> orders = orderRepository.findAll();
        Order savedOrder = orders.stream()
                .filter(o -> "P100".equals(o.getProductId()) && o.getQuantity() == 2)
                .findFirst()
                .orElse(null);
        assertThat(savedOrder).isNotNull();
        assertThat(savedOrder.getStatus()).isEqualTo("CONFIRMED");
        assertThat(savedOrder.getReason()).isNull();
    }

    @Test
    @DisplayName("Rejected Path: Zero stock (P300) -> status REJECTED, stock untouched, order saved with reason")
    void shouldRejectOrderWhenItemOutOfStock() {
        // P300 initially has 0 units
        InventoryItem itemBefore = inventoryService.getItem("P300");
        assertThat(itemBefore).isNotNull();
        assertThat(itemBefore.getStock()).isEqualTo(0);

        // Place order for 1 unit
        OrderRequest request = new OrderRequest("P300", 1);
        OrderResponse response = orderService.placeOrder(request);

        // Verify response
        assertThat(response.getStatus()).isEqualTo("REJECTED");
        assertThat(response.getReason()).contains("Insufficient stock");
        assertThat(response.getInventory().getStock()).isEqualTo(0);

        // Verify database state in orders table
        List<Order> orders = orderRepository.findAll();
        Order savedOrder = orders.stream()
                .filter(o -> "P300".equals(o.getProductId()) && "REJECTED".equals(o.getStatus()))
                .findFirst()
                .orElse(null);
        assertThat(savedOrder).isNotNull();
        assertThat(savedOrder.getStatus()).isEqualTo("REJECTED");
        assertThat(savedOrder.getReason()).contains("Insufficient stock");
    }

    @Test
    @DisplayName("Rejected Path: Requested quantity > stock (P200) -> status REJECTED, stock untouched")
    void shouldRejectOrderWhenRequestedQuantityExceedsStock() {
        InventoryItem itemBefore = inventoryService.getItem("P200");
        assertThat(itemBefore).isNotNull();
        int availableStock = itemBefore.getStock();

        // Request availableStock + 5
        OrderRequest request = new OrderRequest("P200", availableStock + 5);
        OrderResponse response = orderService.placeOrder(request);

        assertThat(response.getStatus()).isEqualTo("REJECTED");
        assertThat(response.getReason()).contains("Insufficient stock");

        // Stock must remain unchanged
        InventoryItem itemAfter = inventoryService.getItem("P200");
        assertThat(itemAfter.getStock()).isEqualTo(availableStock);
    }
}
