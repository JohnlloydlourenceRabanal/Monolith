package edu.cit.rabanal.channel;

/**
 * Package-private DTO representing a Tiangge instance heartbeat request.
 */
record HeartbeatRequest(String appName, String startedAt, long uptimeSeconds) {}
