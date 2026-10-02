package edu.cit.rabanal.channel;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * Package-private DTO representing buyer information in a Tiangge feed event.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
record FeedBuyerDto(
        String name,
        String city
) {}
