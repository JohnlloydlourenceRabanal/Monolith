package edu.cit.rabanal.channel;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Package-private Scheduler.
 * Polls the Tiangge marketplace order feed periodically every few seconds
 * and evaluates waiting backorders for resolution.
 */
@Component
class ChannelFeedPollerScheduler {

    private static final Logger log = LoggerFactory.getLogger(ChannelFeedPollerScheduler.class);

    private final ChannelGateway channelGateway;

    public ChannelFeedPollerScheduler(ChannelGateway channelGateway) {
        this.channelGateway = channelGateway;
    }

    @Scheduled(fixedDelayString = "${tiangge.feed.poll-delay-ms:3000}", initialDelay = 5000)
    public void scheduleFeedPoll() {
        log.debug("[ChannelFeedPollerScheduler] Triggering periodic order feed poll...");
        channelGateway.pollOrderFeed();
        channelGateway.resolveBackorders();
    }
}
