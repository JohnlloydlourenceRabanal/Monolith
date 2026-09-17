package edu.cit.rabanal.shop;

public class OrderItemOutcome {

    private String productId;
    private int quantity;
    private String outcome; // "CONFIRMED", "INSUFFICIENT_STOCK", "PRODUCT_NOT_FOUND", etc.

    public OrderItemOutcome() {}

    public OrderItemOutcome(String productId, int quantity, String outcome) {
        this.productId = productId;
        this.quantity = quantity;
        this.outcome = outcome;
    }

    public String getProductId() {
        return productId;
    }

    public void setProductId(String productId) {
        this.productId = productId;
    }

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }

    public String getOutcome() {
        return outcome;
    }

    public void setOutcome(String outcome) {
        this.outcome = outcome;
    }
}
