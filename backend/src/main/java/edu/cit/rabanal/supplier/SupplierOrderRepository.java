package edu.cit.rabanal.supplier;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
interface SupplierOrderRepository extends JpaRepository<SupplierOrder, Long> {

    Optional<SupplierOrder> findByBuyerRef(String buyerRef);

    Optional<SupplierOrder> findByRequestId(String requestId);

    Optional<SupplierOrder> findByPoNumber(String poNumber);

    List<SupplierOrder> findByStatus(SupplierOrderStatus status);

    List<SupplierOrder> findByStatusIn(List<SupplierOrderStatus> statuses);

    List<SupplierOrder> findAllByOrderByCreatedAtDesc();
}
