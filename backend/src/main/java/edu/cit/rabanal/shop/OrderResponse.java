package edu.cit.rabanal.shop;

import edu.cit.rabanal.inventory.InventoryItem;

public class OrderResponse {

    private String status; // "CONFIRMED" or "REJECTED"
    private String reason;
    private InventoryItem inventory;

    public OrderResponse() {}

    public OrderResponse(String status, String reason, InventoryItem inventory) {
        this.status = status;
        this.reason = reason;
        this.inventory = inventory;
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

    public InventoryItem getInventory() {
        return inventory;
    }

    public void setInventory(InventoryItem inventory) {
        this.inventory = inventory;
    }
}
