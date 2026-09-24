package edu.cit.rabanal.supplier;

import java.util.List;

/**
 * Public Gateway Boundary for the Supplier Module.
 * External modules (like notification/inventory/order) only interact through this interface
 * using domain types.
 */
public interface SupplierGateway {

    /**
     * Orders replenishment for a given product and required units.
     * Internally calculates required cases, rounds up to whole pack sizes,
     * persists order as RO-<id>, handles sessions, retries, and contacts LegacySupply.
     *
     * @param productId internal product identifier (e.g. "P100")
     * @param unitsNeeded number of units needed
     * @return domain result indicating outcome
     */
    SupplierReorderResult orderReplenishment(String productId, int unitsNeeded);

    /**
     * Retrieves all supplier orders for auditing, dashboard, and testing.
     */
    List<SupplierOrderSummary> getAllOrders();

    /**
     * Manually triggers a status poll against LegacySupply for all open orders.
     */
    void pollOpenOrders();

    /**
     * Checks if LegacySupply API credentials are configured.
     */
    boolean hasApiKey();

    /**
     * Configures the LegacySupply API key dynamically and triggers pending order dispatch.
     */
    void setApiKey(String apiKey);

    /**
     * Reads partner catalog from LegacySupply.
     */
    void syncCatalog();
}
