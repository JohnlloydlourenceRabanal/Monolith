package edu.cit.rabanal.shop.event;

import java.time.Instant;

public class OrderPlacedEvent {

    private final Long orderId;
    private final String summary;
    private final Instant timestamp;

    public OrderPlacedEvent(Long orderId, String summary) {
        this.orderId = orderId;
        this.summary = summary;
        this.timestamp = Instant.now();
    }

    public Long getOrderId() {
        return orderId;
    }

    public String getSummary() {
        return summary;
    }

    public Instant getTimestamp() {
        return timestamp;
    }
}
