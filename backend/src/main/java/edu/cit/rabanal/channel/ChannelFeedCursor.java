package edu.cit.rabanal.channel;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

/**
 * Package-private JPA Entity for persisting the Tiangge feed cursor.
 * Ensures the order feed reader never restarts from 0 and resumes where it left off.
 */
@Entity
@Table(name = "channel_feed_cursor")
class ChannelFeedCursor {

    @Id
    @Column(name = "feed_name", length = 32)
    private String feedName;

    @Column(name = "last_cursor", nullable = false)
    private Long lastCursor;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public ChannelFeedCursor() {}

    public ChannelFeedCursor(String feedName, Long lastCursor, Instant updatedAt) {
        this.feedName = feedName;
        this.lastCursor = lastCursor;
        this.updatedAt = updatedAt;
    }

    public String getFeedName() {
        return feedName;
    }

    public void setFeedName(String feedName) {
        this.feedName = feedName;
    }

    public Long getLastCursor() {
        return lastCursor;
    }

    public void setLastCursor(Long lastCursor) {
        this.lastCursor = lastCursor;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
