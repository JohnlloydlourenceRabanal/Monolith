package edu.cit.rabanal.inventory.event;

/**
 * Domain Event emitted whenever an inventory item's stock level changes.
 * Consumed within the monolith without leaking any external concepts.
 */
public record StockChangedEvent(String productId, int newStock) {}
