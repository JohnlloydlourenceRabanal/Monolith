package edu.cit.rabanal.channel;

/**
 * Package-private DTO representing a Tiangge instance heartbeat response.
 */
record HeartbeatResponse(String serverTime, Integer nextHeartbeatSeconds) {}
