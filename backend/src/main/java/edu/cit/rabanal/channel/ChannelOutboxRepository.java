package edu.cit.rabanal.channel;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

/**
 * Package-private Repository for ChannelOutboxTask entities.
 */
@Repository
interface ChannelOutboxRepository extends JpaRepository<ChannelOutboxTask, Long> {
    List<ChannelOutboxTask> findByCompletedFalseAndNextAttemptAtLessThanEqualOrderByCreatedAtAsc(Instant now);
}
