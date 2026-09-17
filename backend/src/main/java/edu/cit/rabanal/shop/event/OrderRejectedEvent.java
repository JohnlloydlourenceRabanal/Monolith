package edu.cit.rabanal.shop.event;

import java.time.Instant;

public class OrderRejectedEvent {

    private final Long orderId;
    private final String reason;
    private final Instant timestamp;

    public OrderRejectedEvent(Long orderId, String reason) {
        this.orderId = orderId;
        this.reason = reason;
        this.timestamp = Instant.now();
    }

    public Long getOrderId() {
        return orderId;
    }

    public String getReason() {
        return reason;
    }

    public Instant getTimestamp() {
        return timestamp;
    }
}
