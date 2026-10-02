package edu.cit.rabanal.channel;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Package-private REST controller providing read-only channel status
 * for the React UI.
 * Does not expose any trigger buttons or actions calling Tiangge directly.
 */
@RestController
@RequestMapping("/api/channel")
class ChannelController {

    private final ChannelGatewayImpl channelGateway;

    ChannelController(ChannelGatewayImpl channelGateway) {
        this.channelGateway = channelGateway;
    }

    @GetMapping("/status")
    public ResponseEntity<ChannelStatusDto> getStatus() {
        return ResponseEntity.ok(channelGateway.getStatus());
    }
}
