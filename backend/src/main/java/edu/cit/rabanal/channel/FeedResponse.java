package edu.cit.rabanal.channel;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

/**
 * Package-private DTO representing the response from GET /feed.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
record FeedResponse(
        List<FeedEventDto> events,
        Long nextCursor
) {}
