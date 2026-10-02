package edu.cit.rabanal.channel;

/**
 * Public Gateway Boundary for the Marketplace Channel Module.
 * External modules interact through this interface using domain concepts.
 */
public interface ChannelGateway {

    /**
     * Sends an instance heartbeat to Tiangge.
     */
    void sendHeartbeat();

    /**
     * Publishes shop product listings to Tiangge (idempotent).
     */
    void publishListings();

    /**
     * Publishes current available stock levels to Tiangge (idempotent).
     */
    void publishStock();

    /**
     * Polls the Tiangge order feed, decides orders (ACCEPTED, REJECTED, BACKORDERED),
     * handles cancellations, and advances the persistent cursor.
     */
    void pollOrderFeed();

    /**
     * Resolves pending backorders when stock is replenished by supplier deliveries.
     */
    void resolveBackorders();

    /**
     * Returns the active running UUID instance ID.
     */
    String getInstanceId();
}
