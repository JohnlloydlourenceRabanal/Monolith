package edu.cit.rabanal.channel;

/**
 * Package-private DTO representing a recent Tiangge order for the Channel Status UI.
 */
record ChannelOrderItemDto(
        String tianggeOrderId,
        Long shopOrderId,
        String status,
        String time
) {}
