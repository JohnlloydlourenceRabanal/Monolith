package edu.cit.rabanal.channel;

/**
 * Package-private DTO representing a backorder resolution sent to POST /orders/{orderId}/resolution.
 * Status is either "ACCEPTED" or "CANCELLED".
 */
record OrderResolutionRequest(
        String status
) {}
