package edu.cit.rabanal.channel;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.time.Duration;
import java.util.List;

/**
 * Package-private HTTP Client communicating with the Tiangge Marketplace Seller API.
 * Connects to /tiangge/v1 endpoints with authentication headers and automatic retry.
 */
@Component
class TianggeClient {

    private static final Logger log = LoggerFactory.getLogger(TianggeClient.class);

    private final String baseUrl;
    private final String clientId;
    private final String configuredApiKey;
    private final int maxRetries;
    private final RestClient restClient;

    public TianggeClient(
            @Value("${tiangge.base-url:https://legacysupply.onrender.com/tiangge/v1}") String baseUrl,
            @Value("${tiangge.client-id:21-0328-885}") String clientId,
            @Value("${tiangge.api-key:}") String apiKey,
            @Value("${tiangge.timeout-seconds:5}") int timeoutSeconds,
            @Value("${tiangge.max-retries:3}") int maxRetries,
            RestClient.Builder restClientBuilder
    ) {
        this.baseUrl = baseUrl;
        this.clientId = clientId;
        this.configuredApiKey = apiKey;
        this.maxRetries = maxRetries;

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout((int) Duration.ofSeconds(timeoutSeconds).toMillis());
        factory.setReadTimeout((int) Duration.ofSeconds(timeoutSeconds).toMillis());

        this.restClient = restClientBuilder
                .baseUrl(baseUrl)
                .requestFactory(factory)
                .build();
    }

    private String resolveApiKey() {
        String envKey = System.getenv("LEGACY_API_KEY");
        if (envKey != null && !envKey.isBlank()) {
            return envKey.trim();
        }
        envKey = System.getenv("LS_API_KEY");
        if (envKey != null && !envKey.isBlank()) {
            return envKey.trim();
        }
        if (configuredApiKey != null && !configuredApiKey.isBlank()) {
            return configuredApiKey.trim();
        }
        return "";
    }

    private RestClient.RequestBodySpec withAuth(RestClient.RequestBodySpec spec) {
        String key = resolveApiKey();
        RestClient.RequestBodySpec authenticated = spec
                .header("X-Client-Id", clientId)
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON);

        if (key != null && !key.isBlank()) {
            authenticated.header("Authorization", "Bearer " + key);
        }
        return authenticated;
    }

    private RestClient.RequestHeadersSpec<?> withHeaders(RestClient.RequestHeadersSpec<?> spec) {
        String key = resolveApiKey();
        spec.header("X-Client-Id", clientId)
                .accept(MediaType.APPLICATION_JSON);

        if (key != null && !key.isBlank()) {
            spec.header("Authorization", "Bearer " + key);
        }
        return spec;
    }

    public boolean hasApiKey() {
        String key = resolveApiKey();
        return key != null && !key.isBlank();
    }

    public HeartbeatResponse sendHeartbeat(HeartbeatRequest request) {
        if (!hasApiKey()) {
            log.info("[TianggeClient] No API key configured. Skipping heartbeat.");
            return new HeartbeatResponse(java.time.Instant.now().toString(), 30);
        }
        log.info("[TianggeClient] Sending heartbeat: appName={}, uptime={}s", request.appName(), request.uptimeSeconds());

        return executeWithRetry("heartbeat", () ->
                withAuth(restClient.post().uri("/instances/heartbeat"))
                        .body(request)
                        .retrieve()
                        .body(HeartbeatResponse.class)
        );
    }

    public void publishListings(List<ListingDto> listings) {
        if (!hasApiKey()) {
            log.info("[TianggeClient] No API key configured. Skipping publishListings.");
            return;
        }
        log.info("[TianggeClient] Publishing {} listings to Tiangge...", listings.size());

        executeWithRetry("publishListings", () -> {
            withAuth(restClient.put().uri("/listings"))
                    .body(listings)
                    .retrieve()
                    .toBodilessEntity();
            return null;
        });

        log.info("[TianggeClient] Successfully published {} listings.", listings.size());
    }

    public void publishStock(List<StockItemDto> stock) {
        if (!hasApiKey()) {
            log.info("[TianggeClient] No API key configured. Skipping publishStock.");
            return;
        }
        log.info("[TianggeClient] Publishing stock figures for {} items to Tiangge...", stock.size());

        executeWithRetry("publishStock", () -> {
            withAuth(restClient.put().uri("/stock"))
                    .body(stock)
                    .retrieve()
                    .toBodilessEntity();
            return null;
        });

        log.info("[TianggeClient] Successfully published stock figures: {}", stock);
    }

    public FeedResponse fetchOrderFeed(Long after, int limit) {
        if (!hasApiKey()) {
            return new FeedResponse(java.util.Collections.emptyList(), after);
        }

        return executeWithRetry("fetchOrderFeed", () -> {
            RestClient.RequestHeadersSpec<?> spec = restClient.get().uri(uriBuilder -> {
                uriBuilder.path("/feed");
                if (after != null && after > 0) {
                    uriBuilder.queryParam("after", after);
                }
                uriBuilder.queryParam("limit", limit > 0 ? limit : 20);
                return uriBuilder.build();
            });

            return withHeaders(spec)
                    .retrieve()
                    .body(FeedResponse.class);
        });
    }

    public void sendOrderDecision(String tianggeOrderId, OrderDecisionRequest decision) {
        if (!hasApiKey()) {
            log.info("[TianggeClient] No API key configured. Skipping order decision for {}", tianggeOrderId);
            return;
        }
        log.info("[TianggeClient] Reporting decision for order {}: {} (shopOrderId: {})",
                tianggeOrderId, decision.decision(), decision.shopOrderId());

        try {
            executeWithRetry("sendOrderDecision", () -> {
                withAuth(restClient.post().uri("/orders/{orderId}/decision", tianggeOrderId))
                        .body(decision)
                        .retrieve()
                        .toBodilessEntity();
                return null;
            });
        } catch (RestClientResponseException e) {
            log.warn("[TianggeClient] Order decision for {} returned HTTP {}: {}",
                    tianggeOrderId, e.getStatusCode().value(), e.getResponseBodyAsString());
            if (e.getStatusCode().value() == 409) {
                log.info("[TianggeClient] Order {} was already decided. Accepting existing decision.", tianggeOrderId);
                return;
            }
            throw e;
        }
    }

    public void confirmCancellation(String tianggeOrderId) {
        if (!hasApiKey()) {
            log.info("[TianggeClient] No API key configured. Skipping cancellation confirmation for {}", tianggeOrderId);
            return;
        }
        log.info("[TianggeClient] Confirming cancellation for order {}...", tianggeOrderId);

        try {
            executeWithRetry("confirmCancellation", () -> {
                withAuth(restClient.post().uri("/orders/{orderId}/cancellation", tianggeOrderId))
                        .body(new OrderCancellationConfirmation(true))
                        .retrieve()
                        .toBodilessEntity();
                return null;
            });
        } catch (RestClientResponseException e) {
            log.warn("[TianggeClient] Cancellation confirmation for {} returned HTTP {}: {}",
                    tianggeOrderId, e.getStatusCode().value(), e.getResponseBodyAsString());
            if (e.getStatusCode().value() == 400 || e.getStatusCode().value() == 409) {
                return;
            }
            throw e;
        }
    }

    public void resolveBackorder(String tianggeOrderId, String status) {
        if (!hasApiKey()) {
            log.info("[TianggeClient] No API key configured. Skipping backorder resolution for {}", tianggeOrderId);
            return;
        }
        log.info("[TianggeClient] Resolving backorder {} to status: {}", tianggeOrderId, status);

        try {
            executeWithRetry("resolveBackorder", () -> {
                withAuth(restClient.post().uri("/orders/{orderId}/resolution", tianggeOrderId))
                        .body(new OrderResolutionRequest(status))
                        .retrieve()
                        .toBodilessEntity();
                return null;
            });
        } catch (RestClientResponseException e) {
            log.warn("[TianggeClient] Backorder resolution for {} returned HTTP {}: {}",
                    tianggeOrderId, e.getStatusCode().value(), e.getResponseBodyAsString());
            if (e.getStatusCode().value() == 400 || e.getStatusCode().value() == 409) {
                return;
            }
            throw e;
        }
    }

    private <T> T executeWithRetry(String operationName, java.util.function.Supplier<T> operation) {
        Exception lastException = null;

        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return operation.get();
            } catch (RestClientResponseException e) {
                lastException = e;
                int status = e.getStatusCode().value();
                log.warn("[TianggeClient] Attempt {}/{} for {} failed with HTTP {}: {}",
                        attempt, maxRetries, operationName, status, e.getResponseBodyAsString());

                long customDelayMs = 0;
                String retryAfter = e.getResponseHeaders() != null ? e.getResponseHeaders().getFirst("Retry-After") : null;
                if (retryAfter != null) {
                    try {
                        customDelayMs = Long.parseLong(retryAfter.trim()) * 1000L;
                        log.info("[TianggeClient] Respecting Retry-After header: {} ms", customDelayMs);
                    } catch (NumberFormatException ignored) {}
                }

                // Retry on 5xx server errors or 429 rate limit
                if ((status >= 500 || status == 429) && attempt < maxRetries) {
                    backoff(attempt, customDelayMs);
                    continue;
                }
                throw e;
            } catch (Exception e) {
                lastException = e;
                log.warn("[TianggeClient] Attempt {}/{} for {} failed with exception: {}",
                        attempt, maxRetries, operationName, e.getMessage());

                if (attempt < maxRetries) {
                    backoff(attempt, 0);
                    continue;
                }
                throw new RuntimeException("Tiangge operation '" + operationName + "' failed after " + maxRetries + " attempts", e);
            }
        }

        throw new RuntimeException("Tiangge operation '" + operationName + "' failed", lastException);
    }

    private void backoff(int attempt, long customDelayMs) {
        try {
            long delayMs = customDelayMs > 0 ? customDelayMs : (long) Math.pow(2, attempt - 1) * 500L;
            Thread.sleep(delayMs);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
