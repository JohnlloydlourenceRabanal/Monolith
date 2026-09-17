package edu.cit.rabanal.shop;

import edu.cit.rabanal.inventory.InventoryItem;

import java.util.ArrayList;
import java.util.List;

public class OrderResponse {

    private Long orderId;
    private String status; // "CONFIRMED" or "REJECTED" or "CANCELLED"
    private String reason;
    private List<OrderItemOutcome> items = new ArrayList<>();
    private List<InventoryItem> inventory = new ArrayList<>();

    public OrderResponse() {}

    public OrderResponse(Long orderId, String status, String reason, List<OrderItemOutcome> items, List<InventoryItem> inventory) {
        this.orderId = orderId;
        this.status = status;
        this.reason = reason;
        this.items = items != null ? items : new ArrayList<>();
        this.inventory = inventory != null ? inventory : new ArrayList<>();
    }

    public Long getOrderId() {
        return orderId;
    }

    public void setOrderId(Long orderId) {
        this.orderId = orderId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public List<OrderItemOutcome> getItems() {
        return items;
    }

    public void setItems(List<OrderItemOutcome> items) {
        this.items = items;
    }

    public List<InventoryItem> getInventory() {
        return inventory;
    }

    public void setInventory(List<InventoryItem> inventory) {
        this.inventory = inventory;
    }
}
