package edu.cit.rabanal;

import edu.cit.rabanal.channel.ChannelGateway;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

@SpringBootTest
class ChannelIntegrationTest {

    @Autowired
    private ChannelGateway channelGateway;

    @Test
    @DisplayName("ChannelGateway is registered and provides valid UUID instance ID")
    void channelGatewayProvidesValidUuidInstanceId() {
        assertThat(channelGateway).isNotNull();
        String instanceId = channelGateway.getInstanceId();
        assertThat(instanceId).isNotBlank();

        // Must be a valid UUID format
        assertThatCode(() -> UUID.fromString(instanceId))
                .as("Instance ID must parse as a valid UUID")
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("Channel operations execute gracefully without throwing exceptions")
    void channelOperationsExecuteGracefully() {
        assertThatCode(() -> {
            channelGateway.sendHeartbeat();
            channelGateway.publishListings();
            channelGateway.publishStock();
            channelGateway.pollOrderFeed();
        }).doesNotThrowAnyException();
    }
}
