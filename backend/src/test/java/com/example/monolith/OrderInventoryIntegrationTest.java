package com.example.monolith;

import com.example.monolith.common.exception.InsufficientStockException;
import com.example.monolith.inventory.api.InventoryModuleApi;
import com.example.monolith.inventory.api.dto.ProductDto;
import com.example.monolith.order.internal.domain.OrderStatus;
import com.example.monolith.order.internal.dto.CreateOrderRequest;
import com.example.monolith.order.internal.dto.OrderItemRequest;
import com.example.monolith.order.internal.dto.OrderResponseDto;
import com.example.monolith.order.internal.service.OrderService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("dev")
public class OrderInventoryIntegrationTest {

    @Autowired
    private OrderService orderService;

    @Autowired
    private InventoryModuleApi inventoryModuleApi;

    @Test
    @DisplayName("Should successfully place an order and deduct stock in-process within the same transaction")
    void shouldSuccessfullyPlaceOrderAndDeductStockInProcess() {
        // Given product "KB-MECH" seeded with stock
        ProductDto initialProduct = inventoryModuleApi.getProductBySku("KB-MECH")
                .orElseThrow();
        int initialStock = initialProduct.availableQuantity();
        assertThat(initialStock).isGreaterThanOrEqualTo(2);

        CreateOrderRequest request = new CreateOrderRequest(
                "customer@example.com",
                List.of(new OrderItemRequest("KB-MECH", 2))
        );

        // When
        OrderResponseDto response = orderService.createOrder(request);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.id()).isNotNull();
        assertThat(response.status()).isEqualTo(OrderStatus.CONFIRMED);
        assertThat(response.customerEmail()).isEqualTo("customer@example.com");
        assertThat(response.items()).hasSize(1);
        assertThat(response.items().get(0).quantity()).isEqualTo(2);
        assertThat(response.totalAmount()).isEqualTo(initialProduct.price().multiply(BigDecimal.valueOf(2)));

        // Verify Inventory stock was decremented in-memory
        ProductDto updatedProduct = inventoryModuleApi.getProductBySku("KB-MECH")
                .orElseThrow();
        assertThat(updatedProduct.availableQuantity()).isEqualTo(initialStock - 2);
    }

    @Test
    @DisplayName("Should reject order and rollback transaction when requested stock exceeds availability")
    void shouldRejectOrderWhenStockInsufficient() {
        // "SW-LTD" has 3 units initially
        ProductDto smartwatch = inventoryModuleApi.getProductBySku("SW-LTD")
                .orElseThrow();
        int available = smartwatch.availableQuantity();

        // Attempt to order more than available
        CreateOrderRequest request = new CreateOrderRequest(
                "greedy@example.com",
                List.of(new OrderItemRequest("SW-LTD", available + 10))
        );

        assertThatThrownBy(() -> orderService.createOrder(request))
                .isInstanceOf(InsufficientStockException.class)
                .hasMessageContaining("Insufficient stock for SKU 'SW-LTD'");

        // Verify stock remains untouched
        ProductDto unchanged = inventoryModuleApi.getProductBySku("SW-LTD").orElseThrow();
        assertThat(unchanged.availableQuantity()).isEqualTo(available);
    }
}
