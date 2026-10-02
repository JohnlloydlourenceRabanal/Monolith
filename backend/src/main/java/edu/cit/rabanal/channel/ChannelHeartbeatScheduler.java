package edu.cit.rabanal.channel;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Package-private Scheduler.
 * Sends a heartbeat to Tiangge marketplace every 30 seconds.
 */
@Component
class ChannelHeartbeatScheduler {

    private static final Logger log = LoggerFactory.getLogger(ChannelHeartbeatScheduler.class);

    private final ChannelGateway channelGateway;

    public ChannelHeartbeatScheduler(ChannelGateway channelGateway) {
        this.channelGateway = channelGateway;
    }

    @Scheduled(fixedRate = 30000, initialDelay = 30000)
    public void scheduleHeartbeat() {
        log.debug("[ChannelHeartbeatScheduler] Triggering periodic 30-second heartbeat...");
        channelGateway.sendHeartbeat();
    }
}
