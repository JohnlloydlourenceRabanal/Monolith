package edu.cit.rabanal.shop;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping
    public ResponseEntity<OrderResponse> createOrder(@Valid @RequestBody OrderRequest request) {
        OrderResponse response = orderService.placeOrder(request);
        HttpStatus status = "CONFIRMED".equals(response.getStatus()) ? HttpStatus.OK : HttpStatus.CONFLICT;
        return ResponseEntity.status(status).body(response);
    }

    @GetMapping
    public ResponseEntity<List<Order>> getOrders() {
        return ResponseEntity.ok(orderService.getAllOrders());
    }
}
