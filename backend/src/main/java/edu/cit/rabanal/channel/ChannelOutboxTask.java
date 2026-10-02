package edu.cit.rabanal.channel;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * Package-private JPA Entity for pending outbox tasks.
 * Ensures anything not yet confirmed to Tiangge (decisions, stock updates,
 * cancellations, resolutions) is durably queued and retried until confirmed.
 */
@Entity
@Table(name = "channel_outbox")
class ChannelOutboxTask {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "task_type", nullable = false, length = 32)
    private String taskType; // "DECISION", "RESOLUTION", "CANCELLATION", "STOCK"

    @Column(name = "target_id", length = 64)
    private String targetId; // orderId or empty

    @Column(name = "payload", length = 1024)
    private String payload;

    @Column(name = "attempts", nullable = false)
    private int attempts = 0;

    @Column(name = "next_attempt_at", nullable = false)
    private Instant nextAttemptAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "completed", nullable = false)
    private boolean completed = false;

    public ChannelOutboxTask() {}

    public ChannelOutboxTask(String taskType, String targetId, String payload, Instant nextAttemptAt) {
        this.taskType = taskType;
        this.targetId = targetId;
        this.payload = payload;
        this.nextAttemptAt = nextAttemptAt;
        this.createdAt = Instant.now();
        this.attempts = 0;
        this.completed = false;
    }

    public Long getId() {
        return id;
    }

    public String getTaskType() {
        return taskType;
    }

    public void setTaskType(String taskType) {
        this.taskType = taskType;
    }

    public String getTargetId() {
        return targetId;
    }

    public void setTargetId(String targetId) {
        this.targetId = targetId;
    }

    public String getPayload() {
        return payload;
    }

    public void setPayload(String payload) {
        this.payload = payload;
    }

    public int getAttempts() {
        return attempts;
    }

    public void setAttempts(int attempts) {
        this.attempts = attempts;
    }

    public Instant getNextAttemptAt() {
        return nextAttemptAt;
    }

    public void setNextAttemptAt(Instant nextAttemptAt) {
        this.nextAttemptAt = nextAttemptAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public boolean isCompleted() {
        return completed;
    }

    public void setCompleted(boolean completed) {
        this.completed = completed;
    }
}
