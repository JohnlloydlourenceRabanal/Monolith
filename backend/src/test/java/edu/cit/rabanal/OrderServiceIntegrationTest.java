package edu.cit.rabanal;

import edu.cit.rabanal.inventory.InventoryItem;
import edu.cit.rabanal.inventory.InventoryService;
import edu.cit.rabanal.notification.Notification;
import edu.cit.rabanal.notification.NotificationRepository;
import edu.cit.rabanal.shop.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
public class OrderServiceIntegrationTest {

    @Autowired
    private OrderService orderService;

    @Autowired
    private InventoryService inventoryService;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @BeforeEach
    void setUp() {
        inventoryService.restockAll(); // P100=25, P200=10, P300=0
    }

    @Test
    @DisplayName("Multi-item Confirmed Path: All items sufficient -> status CONFIRMED, stocks decremented, notification written")
    void shouldConfirmMultiItemOrderWhenAllItemsAvailable() {
        int initialP100 = inventoryService.getItem("P100").getStock();
        int initialP200 = inventoryService.getItem("P200").getStock();

        OrderRequest request = new OrderRequest(List.of(
                new OrderItemRequest("P100", 2),
                new OrderItemRequest("P200", 3)
        ));

        OrderResponse response = orderService.placeOrder(request);

        assertThat(response.getStatus()).isEqualTo("CONFIRMED");
        assertThat(response.getReason()).isNull();
        assertThat(response.getItems()).hasSize(2);
        assertThat(response.getItems()).allMatch(item -> "CONFIRMED".equals(item.getOutcome()));

        // Verify stock decrements
        assertThat(inventoryService.getItem("P100").getStock()).isEqualTo(initialP100 - 2);
        assertThat(inventoryService.getItem("P200").getStock()).isEqualTo(initialP200 - 3);

        // Verify database state in orders & order_items
        Order savedOrder = orderRepository.findById(response.getOrderId()).orElse(null);
        assertThat(savedOrder).isNotNull();
        assertThat(savedOrder.getStatus()).isEqualTo("CONFIRMED");
        assertThat(savedOrder.getItems()).hasSize(2);

        // Verify notification entry
        List<Notification> notifications = notificationRepository.findAll();
        assertThat(notifications).anyMatch(n -> n.getMessage().contains("Order #" + savedOrder.getOrderId() + " confirmed"));
    }

    @Test
    @DisplayName("Multi-item All-or-Nothing Rollback: One item fails -> whole order REJECTED, ZERO stock reserved")
    void shouldRejectMultiItemOrderWithZeroPartialReservationWhenOneItemFails() {
        int initialP100 = inventoryService.getItem("P100").getStock();
        int initialP300 = inventoryService.getItem("P300").getStock(); // 0 units

        // P100 is available (2 units), but P300 is out of stock (1 unit requested, 0 available)
        OrderRequest request = new OrderRequest(List.of(
                new OrderItemRequest("P100", 2),
                new OrderItemRequest("P300", 1)
        ));

        OrderResponse response = orderService.placeOrder(request);

        assertThat(response.getStatus()).isEqualTo("REJECTED");
        assertThat(response.getReason()).contains("Insufficient stock for P300");

        // CRITICAL CHECK: P100 must NOT be reserved! Stock must remain completely untouched
        assertThat(inventoryService.getItem("P100").getStock()).isEqualTo(initialP100);
        assertThat(inventoryService.getItem("P300").getStock()).isEqualTo(0);

        // Verify notification recorded rejection
        List<Notification> notifications = notificationRepository.findAll();
        assertThat(notifications).anyMatch(n -> n.getMessage().contains("rejected") && n.getMessage().contains("P300"));
    }

    @Test
    @DisplayName("Order Cancellation & Restock: Cancelling CONFIRMED order returns all items to stock")
    void shouldCancelConfirmedOrderAndReturnStock() {
        int initialP100 = inventoryService.getItem("P100").getStock();

        // 1. Place confirmed order
        OrderRequest request = new OrderRequest("P100", 3);
        OrderResponse response = orderService.placeOrder(request);
        assertThat(response.getStatus()).isEqualTo("CONFIRMED");
        assertThat(inventoryService.getItem("P100").getStock()).isEqualTo(initialP100 - 3);

        // 2. Cancel order
        OrderResponse cancelResponse = orderService.cancelOrder(response.getOrderId());
        assertThat(cancelResponse.getStatus()).isEqualTo("CANCELLED");

        // 3. Verify stock is completely restored
        assertThat(inventoryService.getItem("P100").getStock()).isEqualTo(initialP100);

        // 4. Verify order entity status in database
        Order cancelledOrder = orderRepository.findById(response.getOrderId()).orElseThrow();
        assertThat(cancelledOrder.getStatus()).isEqualTo("CANCELLED");

        // 5. Verify cancellation notification
        List<Notification> notifications = notificationRepository.findAll();
        assertThat(notifications).anyMatch(n -> n.getMessage().contains("Order #" + response.getOrderId() + " cancelled"));
    }

    @Test
    @DisplayName("Order Cancellation Rejection: Cannot cancel already cancelled or rejected orders")
    void shouldRejectCancellationOfAlreadyCancelledOrRejectedOrders() {
        // Cancel already cancelled order
        OrderRequest request = new OrderRequest("P100", 1);
        OrderResponse response = orderService.placeOrder(request);
        orderService.cancelOrder(response.getOrderId());

        assertThatThrownBy(() -> orderService.cancelOrder(response.getOrderId()))
                .isInstanceOf(OrderConflictException.class)
                .hasMessageContaining("already CANCELLED");

        // Cannot cancel rejected order
        OrderRequest rejectedRequest = new OrderRequest("P300", 5);
        OrderResponse rejectedResponse = orderService.placeOrder(rejectedRequest);

        assertThatThrownBy(() -> orderService.cancelOrder(rejectedResponse.getOrderId()))
                .isInstanceOf(OrderConflictException.class)
                .hasMessageContaining("REJECTED");
    }

    @Test
    @DisplayName("Low-Stock Auto-Reorder Rule: Stock dropping below threshold (5) publishes LowStockEvent")
    void shouldTriggerLowStockAlertWhenStockDropsBelowThreshold() {
        // P200 starts at 10. Order 6 units -> leaves 4 units (< threshold of 5)
        OrderRequest request = new OrderRequest("P200", 6);
        OrderResponse response = orderService.placeOrder(request);
        assertThat(response.getStatus()).isEqualTo("CONFIRMED");

        InventoryItem p200 = inventoryService.getItem("P200");
        assertThat(p200.getStock()).isEqualTo(4);

        // Verify that notification contains low-stock alert
        List<Notification> notifications = notificationRepository.findAll();
        assertThat(notifications).anyMatch(n ->
                n.getMessage().contains("LOW-STOCK ALERT") &&
                n.getMessage().contains("P200") &&
                n.getMessage().contains("4 units")
        );
    }
}
