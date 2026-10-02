package edu.cit.rabanal.channel;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Package-private Startup Runner.
 * Executes on application boot to:
 * 1. Log the unique UUID client instance ID.
 * 2. Send the initial heartbeat to Tiangge marketplace.
 * 3. Publish initial listings (idempotent).
 * 4. Publish current available stock levels (idempotent).
 */
@Component
@Order(100)
class ChannelStartupRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(ChannelStartupRunner.class);

    private final ChannelGateway channelGateway;

    public ChannelStartupRunner(ChannelGateway channelGateway) {
        this.channelGateway = channelGateway;
    }

    @Override
    public void run(ApplicationArguments args) {
        log.info("********************************************************************************");
        log.info("[ChannelStartupRunner] Activating Tiangge Marketplace Channel Integration");
        log.info("[ChannelStartupRunner] Active Client Instance ID: {}", channelGateway.getInstanceId());
        log.info("********************************************************************************");

        // 1. Send initial heartbeat
        channelGateway.sendHeartbeat();

        // 2. Publish initial product listings with LegacySupply supplierSku mappings
        channelGateway.publishListings();

        // 3. Publish initial available stock
        channelGateway.publishStock();
    }
}
