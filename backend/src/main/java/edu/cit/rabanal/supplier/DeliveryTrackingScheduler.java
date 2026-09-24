package edu.cit.rabanal.supplier;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Package-private background scheduler.
 * Periodically polls open purchase orders and dispatches pending orders.
 * Stays well within LegacySupply's request quota.
 */
@Component
class DeliveryTrackingScheduler {

    private static final Logger log = LoggerFactory.getLogger(DeliveryTrackingScheduler.class);

    private final SupplierGateway supplierGateway;

    public DeliveryTrackingScheduler(SupplierGateway supplierGateway) {
        this.supplierGateway = supplierGateway;
    }

    /**
     * Poll every 30 seconds (with an initial delay of 10 seconds).
     */
    @Scheduled(fixedDelay = 30000, initialDelay = 10000)
    public void trackDeliveries() {
        log.debug("[DeliveryTrackingScheduler] Running scheduled status check...");
        supplierGateway.pollOpenOrders();
    }
}
