package edu.cit.rabanal.channel;

/**
 * Package-private DTO representing a cancellation confirmation sent to POST /orders/{orderId}/cancellation.
 */
record OrderCancellationConfirmation(
        boolean restocked
) {}
