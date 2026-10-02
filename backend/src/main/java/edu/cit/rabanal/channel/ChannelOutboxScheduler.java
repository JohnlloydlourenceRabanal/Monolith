package edu.cit.rabanal.channel;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;

/**
 * Package-private Scheduler.
 * Periodically processes pending outbox tasks that have not yet been confirmed by Tiangge,
 * providing resilient retry across restarts and transient network outages.
 */
@Component
class ChannelOutboxScheduler {

    private static final Logger log = LoggerFactory.getLogger(ChannelOutboxScheduler.class);

    private final ChannelOutboxRepository outboxRepository;
    private final TianggeClient tianggeClient;
    private final ClientInstanceInterceptor instanceInterceptor;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ChannelOutboxScheduler(
            ChannelOutboxRepository outboxRepository,
            TianggeClient tianggeClient,
            ClientInstanceInterceptor instanceInterceptor
    ) {
        this.outboxRepository = outboxRepository;
        this.tianggeClient = tianggeClient;
        this.instanceInterceptor = instanceInterceptor;
    }

    @Scheduled(fixedDelay = 5000, initialDelay = 10000)
    public void processPendingOutbox() {
        if (!tianggeClient.hasApiKey()) {
            return;
        }

        List<ChannelOutboxTask> tasks;
        try {
            tasks = outboxRepository.findByCompletedFalseAndNextAttemptAtLessThanEqualOrderByCreatedAtAsc(Instant.now());
        } catch (Exception e) {
            log.error("[ChannelOutbox] [{}] Error querying pending outbox tasks: {}",
                    instanceInterceptor.getInstanceId(), e.getMessage());
            return;
        }

        if (tasks.isEmpty()) {
            return;
        }

        log.info("[ChannelOutbox] [{}] Processing {} pending outbox tasks...",
                instanceInterceptor.getInstanceId(), tasks.size());

        for (ChannelOutboxTask task : tasks) {
            try {
                executeTask(task);
                task.setCompleted(true);
                outboxRepository.saveAndFlush(task);
                log.info("[ChannelOutbox] [{}] Outbox task #{} ({}) completed successfully for target {}",
                        instanceInterceptor.getInstanceId(), task.getId(), task.getTaskType(), task.getTargetId());
            } catch (Exception e) {
                int nextAttempts = task.getAttempts() + 1;
                task.setAttempts(nextAttempts);
                long delaySeconds = (long) Math.min(60, Math.pow(2, nextAttempts));
                task.setNextAttemptAt(Instant.now().plusSeconds(delaySeconds));
                outboxRepository.saveAndFlush(task);

                log.warn("[ChannelOutbox] [{}] Outbox task #{} ({}) failed (attempt {}): {}. Next attempt in {}s",
                        instanceInterceptor.getInstanceId(), task.getId(), task.getTaskType(), nextAttempts, e.getMessage(), delaySeconds);
            }
        }
    }

    private void executeTask(ChannelOutboxTask task) throws Exception {
        switch (task.getTaskType()) {
            case "DECISION" -> {
                OrderDecisionRequest decision = objectMapper.readValue(task.getPayload(), OrderDecisionRequest.class);
                tianggeClient.sendOrderDecision(task.getTargetId(), decision);
            }
            case "RESOLUTION" -> {
                tianggeClient.resolveBackorder(task.getTargetId(), task.getPayload());
            }
            case "CANCELLATION" -> {
                tianggeClient.confirmCancellation(task.getTargetId());
            }
            default -> log.warn("[ChannelOutbox] [{}] Unknown task type: {}",
                    instanceInterceptor.getInstanceId(), task.getTaskType());
        }
    }
}
