package com.example.monolith.order.internal.controller;

import com.example.monolith.common.dto.ApiResponse;
import com.example.monolith.order.internal.dto.CreateOrderRequest;
import com.example.monolith.order.internal.dto.OrderResponseDto;
import com.example.monolith.order.internal.service.OrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
@Tag(name = "Orders", description = "Order management and checkout endpoints")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping
    @Operation(summary = "Create and process a new order")
    public ResponseEntity<ApiResponse<OrderResponseDto>> createOrder(@Valid @RequestBody CreateOrderRequest request) {
        OrderResponseDto order = orderService.createOrder(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(order, "Order placed and confirmed successfully via in-process integration"));
    }

    @GetMapping
    @Operation(summary = "List all orders")
    public ResponseEntity<ApiResponse<List<OrderResponseDto>>> getAllOrders() {
        List<OrderResponseDto> orders = orderService.getAllOrders();
        return ResponseEntity.ok(ApiResponse.success(orders, "Orders retrieved successfully"));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get order details by ID")
    public ResponseEntity<ApiResponse<OrderResponseDto>> getOrderById(@PathVariable Long id) {
        OrderResponseDto order = orderService.getOrderById(id);
        return ResponseEntity.ok(ApiResponse.success(order));
    }
}
