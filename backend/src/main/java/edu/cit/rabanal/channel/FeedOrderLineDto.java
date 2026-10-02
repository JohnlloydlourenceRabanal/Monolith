package edu.cit.rabanal.channel;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * Package-private DTO representing an order line item in a Tiangge feed event.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
record FeedOrderLineDto(
        String sellerSku,
        int qty
) {}
