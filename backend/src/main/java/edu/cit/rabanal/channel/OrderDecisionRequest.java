package edu.cit.rabanal.channel;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Package-private DTO representing a decision reported to POST /orders/{orderId}/decision.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
record OrderDecisionRequest(
        String decision,
        String shopOrderId,
        String reason
) {}
