package edu.cit.rabanal.shop;

import jakarta.validation.Valid;
import java.util.ArrayList;
import java.util.List;

public class OrderRequest {

    @Valid
    private List<OrderItemRequest> items = new ArrayList<>();

    // Backward compatibility fields for single-item order requests
    private String productId;
    private Integer quantity;

    public OrderRequest() {}

    public OrderRequest(List<OrderItemRequest> items) {
        this.items = items;
    }

    public OrderRequest(String productId, int quantity) {
        this.productId = productId;
        this.quantity = quantity;
        if (this.items == null) {
            this.items = new ArrayList<>();
        }
        this.items.add(new OrderItemRequest(productId, quantity));
    }

    public List<OrderItemRequest> getItems() {
        // If items list is empty but single product/quantity were provided, adapt them
        if ((items == null || items.isEmpty()) && productId != null && quantity != null && quantity > 0) {
            items = new ArrayList<>();
            items.add(new OrderItemRequest(productId, quantity));
        }
        return items;
    }

    public void setItems(List<OrderItemRequest> items) {
        this.items = items;
    }

    public String getProductId() {
        return productId;
    }

    public void setProductId(String productId) {
        this.productId = productId;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }
}
