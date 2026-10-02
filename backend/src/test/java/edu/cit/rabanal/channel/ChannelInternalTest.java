package edu.cit.rabanal.channel;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
class ChannelInternalTest {

    @Autowired
    private ChannelFeedCursorRepository cursorRepository;

    @Autowired
    private ChannelOrderRepository orderRepository;

    @Autowired
    private ChannelOutboxRepository outboxRepository;

    @Autowired
    private ChannelTranslator translator;

    @Autowired
    private ChannelGatewayImpl channelGateway;

    @Test
    @DisplayName("Feed cursor is persisted durably and updated")
    void cursorPersistedDurably() {
        String feedName = "tiangge_order_feed";
        ChannelFeedCursor cursor = cursorRepository.findById(feedName)
                .orElseGet(() -> new ChannelFeedCursor(feedName, 0L, Instant.now()));

        cursor.setLastCursor(105L);
        cursor.setUpdatedAt(Instant.now());
        cursorRepository.save(cursor);

        Optional<ChannelFeedCursor> retrieved = cursorRepository.findById(feedName);
        assertThat(retrieved).isPresent();
        assertThat(retrieved.get().getLastCursor()).isEqualTo(105L);
    }

    @Test
    @DisplayName("ChannelOrder enforces unique constraint on tiangge_order_id")
    void uniqueConstraintOnTianggeOrderId() {
        String tianggeOrderId = "TG-TEST-" + System.currentTimeMillis();

        ChannelOrder order1 = new ChannelOrder(tianggeOrderId, 100L, "ACCEPTED", null, Instant.now());
        orderRepository.saveAndFlush(order1);

        Optional<ChannelOrder> found = orderRepository.findByTianggeOrderId(tianggeOrderId);
        assertThat(found).isPresent();
        assertThat(found.get().getShopOrderId()).isEqualTo(100L);
        assertThat(found.get().getDecision()).isEqualTo("ACCEPTED");

        // Attempting to save a second order with the same tiangge_order_id must violate unique constraint
        ChannelOrder order2 = new ChannelOrder(tianggeOrderId, 101L, "REJECTED", "Duplicate", Instant.now());
        assertThatThrownBy(() -> orderRepository.saveAndFlush(order2))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @DisplayName("ChannelTranslator correctly maps catalog supplierSkUs")
    void translatorMapsCatalogSkus() {
        ChannelTranslator.ProductMapping p100 = translator.getMapping("P100");
        assertThat(p100).isNotNull();
        assertThat(p100.supplierSku()).isEqualTo("LEZ-1290");

        ChannelTranslator.ProductMapping p200 = translator.getMapping("P200");
        assertThat(p200).isNotNull();
        assertThat(p200.supplierSku()).isEqualTo("LEZ-6626");

        ChannelTranslator.ProductMapping p300 = translator.getMapping("P300");
        assertThat(p300).isNotNull();
        assertThat(p300.supplierSku()).isEqualTo("LEZ-9515");
    }

    @Test
    @DisplayName("ChannelOutboxTask stores pending requests and queries by attempt time")
    void outboxTaskPersistenceAndQuery() {
        ChannelOutboxTask task = new ChannelOutboxTask(
                "DECISION",
                "TG-OUTBOX-1",
                "{\"decision\":\"ACCEPTED\"}",
                Instant.now()
        );
        outboxRepository.saveAndFlush(task);

        List<ChannelOutboxTask> pending = outboxRepository
                .findByCompletedFalseAndNextAttemptAtLessThanEqualOrderByCreatedAtAsc(Instant.now().plusSeconds(1));
        assertThat(pending).isNotEmpty();
        assertThat(pending.stream().anyMatch(t -> "TG-OUTBOX-1".equals(t.getTargetId()))).isTrue();

        task.setCompleted(true);
        outboxRepository.saveAndFlush(task);
    }

    @Test
    @DisplayName("Backorder lifecycle: query waiting backorders and update to resolved")
    void backorderLifecycleTracking() {
        String orderId = "TG-BO-" + System.currentTimeMillis();
        ChannelOrder boOrder = new ChannelOrder(
                orderId,
                201L,
                "BACKORDERED",
                "Waiting for LegacySupply restock",
                "P100:2",
                Instant.now()
        );
        orderRepository.saveAndFlush(boOrder);

        List<ChannelOrder> pendingBackorders = orderRepository
                .findByDecisionAndResolvedFalseAndCancelledFalseOrderByCreatedAtAsc("BACKORDERED");
        assertThat(pendingBackorders.stream().anyMatch(o -> orderId.equals(o.getTianggeOrderId()))).isTrue();

        // Simulate resolution
        boOrder.setResolved(true);
        boOrder.setResolutionStatus("ACCEPTED");
        orderRepository.saveAndFlush(boOrder);

        List<ChannelOrder> afterResolution = orderRepository
                .findByDecisionAndResolvedFalseAndCancelledFalseOrderByCreatedAtAsc("BACKORDERED");
        assertThat(afterResolution.stream().anyMatch(o -> orderId.equals(o.getTianggeOrderId()))).isFalse();
    }

    @Test
    @DisplayName("ChannelGateway getStatus provides valid telemetry and order DTOs")
    void channelStatusTelemetry() {
        ChannelStatusDto status = channelGateway.getStatus();
        assertThat(status).isNotNull();
        assertThat(status.instanceId()).isNotBlank();
        assertThat(status.recentOrders()).isNotNull();
    }
}
