package edu.cit.rabanal.channel;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Package-private Repository for ChannelFeedCursor entities.
 */
@Repository
interface ChannelFeedCursorRepository extends JpaRepository<ChannelFeedCursor, String> {
}
