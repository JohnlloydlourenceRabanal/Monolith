package com.example.monolith.order.internal.service;

import com.example.monolith.common.exception.InvalidOrderException;
import com.example.monolith.common.exception.ResourceNotFoundException;
import com.example.monolith.inventory.api.InventoryModuleApi;
import com.example.monolith.inventory.api.dto.ProductDto;
import com.example.monolith.inventory.api.dto.ReserveStockItemRequest;
import com.example.monolith.inventory.api.dto.StockReservationResult;
import com.example.monolith.order.api.events.OrderPlacedEvent;
import com.example.monolith.order.internal.domain.Order;
import com.example.monolith.order.internal.domain.OrderItem;
import com.example.monolith.order.internal.domain.OrderStatus;
import com.example.monolith.order.internal.dto.CreateOrderRequest;
import com.example.monolith.order.internal.dto.OrderItemDto;
import com.example.monolith.order.internal.dto.OrderItemRequest;
import com.example.monolith.order.internal.dto.OrderResponseDto;
import com.example.monolith.order.internal.repository.OrderRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Service
@Transactional
public class OrderService {

    private static final Logger log = LoggerFactory.getLogger(OrderService.class);

    // In-Process Module-to-Module boundary: OrderService depends ONLY on the public InventoryModuleApi interface!
    private final InventoryModuleApi inventoryModuleApi;
    private final OrderRepository orderRepository;
    private final ApplicationEventPublisher eventPublisher;

    public OrderService(InventoryModuleApi inventoryModuleApi,
                        OrderRepository orderRepository,
                        ApplicationEventPublisher eventPublisher) {
        this.inventoryModuleApi = inventoryModuleApi;
        this.orderRepository = orderRepository;
        this.eventPublisher = eventPublisher;
    }

    public OrderResponseDto createOrder(CreateOrderRequest request) {
        long startTime = System.nanoTime();
        log.info("[Order Processing Started] Creating order for customer '{}' with {} items",
                request.customerEmail(), request.items().size());

        if (request.items() == null || request.items().isEmpty()) {
            throw new InvalidOrderException("Order must contain at least one item");
        }

        // Step 1: Map items to Inventory Boundary Request DTOs
        List<ReserveStockItemRequest> reservationRequests = request.items().stream()
                .map(item -> new ReserveStockItemRequest(item.sku(), item.quantity()))
                .toList();

        // Step 2: In-Process Module-to-Module Call
        // This is executed directly in-memory within the same database transaction.
        // No HTTP, no gRPC, no network hops!
        long inProcessStart = System.nanoTime();
        StockReservationResult reservationResult = inventoryModuleApi.checkAndReserveStock(reservationRequests);
        long inProcessDurationMicros = (System.nanoTime() - inProcessStart) / 1_000;

        log.info("[In-Process Boundary Call Completed] Stock successfully reserved in {} µs (0 network latency)",
                inProcessDurationMicros);

        // Step 3: Create Order Aggregate
        Order order = new Order(request.customerEmail());

        List<OrderPlacedEvent.OrderItemDetail> eventItemDetails = new ArrayList<>();

        for (OrderItemRequest itemReq : request.items()) {
            ProductDto product = inventoryModuleApi.getProductBySku(itemReq.sku())
                    .orElseThrow(() -> new ResourceNotFoundException("Product not found for SKU: " + itemReq.sku()));

            OrderItem orderItem = new OrderItem(product.sku(), itemReq.quantity(), product.price());
            order.addItem(orderItem);

            eventItemDetails.add(new OrderPlacedEvent.OrderItemDetail(
                    product.sku(), itemReq.quantity(), product.price()
            ));
        }

        order.setStatus(OrderStatus.CONFIRMED);
        Order savedOrder = orderRepository.save(order);

        // Step 4: Publish Domain Event (in-process domain event)
        eventPublisher.publishEvent(new OrderPlacedEvent(
                savedOrder.getId(),
                savedOrder.getCustomerEmail(),
                savedOrder.getTotalAmount(),
                eventItemDetails,
                Instant.now()
        ));

        long totalDurationMs = (System.nanoTime() - startTime) / 1_000_000;
        String summary = String.format("In-process call: %d µs | Total order txn: %d ms | Status: %s",
                inProcessDurationMicros, totalDurationMs, savedOrder.getStatus());

        log.info("[Order Completed] Order #{} created successfully. Total: ${}. Summary: {}",
                savedOrder.getId(), savedOrder.getTotalAmount(), summary);

        return mapToDto(savedOrder, summary);
    }

    @Transactional(readOnly = true)
    public List<OrderResponseDto> getAllOrders() {
        return orderRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(o -> mapToDto(o, "Retrieved from shared database"))
                .toList();
    }

    @Transactional(readOnly = true)
    public OrderResponseDto getOrderById(Long id) {
        Order order = orderRepository.findWithItemsById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order with id " + id + " not found"));
        return mapToDto(order, "Retrieved from shared database");
    }

    private OrderResponseDto mapToDto(Order order, String summary) {
        List<OrderItemDto> itemDtos = order.getItems().stream()
                .map(i -> new OrderItemDto(
                        i.getId(),
                        i.getSku(),
                        i.getQuantity(),
                        i.getUnitPrice(),
                        i.getSubtotal()
                ))
                .toList();

        return new OrderResponseDto(
                order.getId(),
                order.getCustomerEmail(),
                order.getStatus(),
                order.getTotalAmount(),
                itemDtos,
                order.getCreatedAt(),
                order.getUpdatedAt(),
                summary
        );
    }
}
