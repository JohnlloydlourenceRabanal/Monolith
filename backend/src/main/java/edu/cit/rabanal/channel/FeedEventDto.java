package edu.cit.rabanal.channel;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

/**
 * Package-private DTO representing a single event in the Tiangge order feed.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
record FeedEventDto(
        Long seq,
        String eventId,
        String type, // "ORDER_PLACED" or "ORDER_CANCELLED"
        String orderId,
        String placedAt,
        String decisionDeadline,
        List<FeedOrderLineDto> lines,
        FeedBuyerDto buyer,
        String cancelledAt,
        String confirmDeadline
) {}
