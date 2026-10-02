package edu.cit.rabanal.channel;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Package-private Repository for ChannelOrder entities.
 */
@Repository
interface ChannelOrderRepository extends JpaRepository<ChannelOrder, Long> {
    Optional<ChannelOrder> findByTianggeOrderId(String tianggeOrderId);

    List<ChannelOrder> findByDecisionAndResolvedFalseAndCancelledFalseOrderByCreatedAtAsc(String decision);

    List<ChannelOrder> findAllByOrderByCreatedAtDesc();

    long countByDecision(String decision);

    long countByCancelledTrue();
}
