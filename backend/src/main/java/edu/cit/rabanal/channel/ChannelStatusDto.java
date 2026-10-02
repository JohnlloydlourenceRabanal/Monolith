package edu.cit.rabanal.channel;

import java.util.List;

/**
 * Package-private DTO representing Channel Status information for the React UI.
 */
record ChannelStatusDto(
        String instanceId,
        boolean online,
        String channelState,
        String lastHeartbeatTime,
        Long lastCursor,
        String lastProcessedTime,
        long totalOrdersReceived,
        long totalAccepted,
        long totalRejected,
        long totalBackordered,
        long totalCancelled,
        long totalSupplierOrders,
        long totalDeliveries,
        List<ChannelOrderItemDto> recentOrders
) {}
