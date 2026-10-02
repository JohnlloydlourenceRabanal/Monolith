package edu.cit.rabanal.channel;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * Package-private JPA Entity mapping Tiangge marketplace orders to internal shop orders.
 * Contains a unique constraint on tiangge_order_id to enforce exact-once order processing.
 */
@Entity
@Table(name = "channel_orders", uniqueConstraints = {
        @UniqueConstraint(name = "uk_channel_orders_tiangge_order_id", columnNames = {"tiangge_order_id"})
})
class ChannelOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "tiangge_order_id", nullable = false, length = 64)
    private String tianggeOrderId;

    @Column(name = "shop_order_id", nullable = false)
    private Long shopOrderId;

    @Column(name = "decision", nullable = false, length = 32)
    private String decision; // ACCEPTED, REJECTED, BACKORDERED

    @Column(name = "reason", length = 255)
    private String reason;

    @Column(name = "lines_summary", length = 512)
    private String linesSummary; // e.g. "P100:2,P200:1"

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "cancelled", nullable = false)
    private boolean cancelled = false;

    @Column(name = "resolved", nullable = false)
    private boolean resolved = false;

    @Column(name = "resolution_status", length = 32)
    private String resolutionStatus; // ACCEPTED or CANCELLED

    public ChannelOrder() {}

    public ChannelOrder(String tianggeOrderId, Long shopOrderId, String decision, String reason, Instant createdAt) {
        this(tianggeOrderId, shopOrderId, decision, reason, null, createdAt);
    }

    public ChannelOrder(String tianggeOrderId, Long shopOrderId, String decision, String reason, String linesSummary, Instant createdAt) {
        this.tianggeOrderId = tianggeOrderId;
        this.shopOrderId = shopOrderId;
        this.decision = decision;
        this.reason = reason;
        this.linesSummary = linesSummary;
        this.createdAt = createdAt;
        this.cancelled = false;
        this.resolved = false;
    }

    public Long getId() {
        return id;
    }

    public String getTianggeOrderId() {
        return tianggeOrderId;
    }

    public void setTianggeOrderId(String tianggeOrderId) {
        this.tianggeOrderId = tianggeOrderId;
    }

    public Long getShopOrderId() {
        return shopOrderId;
    }

    public void setShopOrderId(Long shopOrderId) {
        this.shopOrderId = shopOrderId;
    }

    public String getDecision() {
        return decision;
    }

    public void setDecision(String decision) {
        this.decision = decision;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public String getLinesSummary() {
        return linesSummary;
    }

    public void setLinesSummary(String linesSummary) {
        this.linesSummary = linesSummary;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public boolean isCancelled() {
        return cancelled;
    }

    public void setCancelled(boolean cancelled) {
        this.cancelled = cancelled;
    }

    public boolean isResolved() {
        return resolved;
    }

    public void setResolved(boolean resolved) {
        this.resolved = resolved;
    }

    public String getResolutionStatus() {
        return resolutionStatus;
    }

    public void setResolutionStatus(String resolutionStatus) {
        this.resolutionStatus = resolutionStatus;
    }
}
