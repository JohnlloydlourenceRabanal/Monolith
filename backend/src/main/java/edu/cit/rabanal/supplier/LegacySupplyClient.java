package edu.cit.rabanal.supplier;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.time.Duration;

/**
 * Package-private HTTP Client for LegacySupply.
 * Features:
 * - 3-second HTTP call timeout (Part D requirement)
 * - Up to 3 retry attempts with exponential backoff (Part D requirement)
 * - Preserves idempotent X-Request-Id across retries (Part D requirement)
 * - Automatic session recovery on 401/expired session (Part C requirement)
 */
@Component
class LegacySupplyClient {

    private static final Logger log = LoggerFactory.getLogger(LegacySupplyClient.class);

    private final String baseUrl;
    private final SessionManager sessionManager;
    private final RestClient restClient;
    private final int maxRetries;

    public LegacySupplyClient(
            @Value("${supplier.base-url:https://legacysupply.onrender.com/api/v1}") String baseUrl,
            @Value("${supplier.max-retries:3}") int maxRetries,
            SessionManager sessionManager,
            RestClient.Builder restClientBuilder
    ) {
        this.baseUrl = baseUrl;
        this.maxRetries = maxRetries;
        this.sessionManager = sessionManager;

        // Enforce 3-second connection and read timeout (Part D requirement)
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout((int) Duration.ofSeconds(3).toMillis());
        factory.setReadTimeout((int) Duration.ofSeconds(3).toMillis());

        this.restClient = restClientBuilder
                .baseUrl(baseUrl)
                .requestFactory(factory)
                .build();
    }

    private final com.fasterxml.jackson.dataformat.xml.XmlMapper xmlMapper = new com.fasterxml.jackson.dataformat.xml.XmlMapper();

    public PurchaseOrderAckXml placePurchaseOrder(PurchaseOrderXml orderXml, String requestId) {
        if (!sessionManager.hasApiKey()) {
            throw new IllegalStateException("LS_API_KEY is not configured yet. Reorder held as PENDING until API key is set.");
        }

        Exception lastException = null;

        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                String token = sessionManager.getSessionToken();
                log.info("[LegacySupplyClient] Attempt {}/{}: Placing order (BuyerRef: {}, RequestId: {})",
                        attempt, maxRetries, orderXml.getBuyerRef(), requestId);

                String bodyXml = restClient.post()
                        .uri("/purchase-orders")
                        .header("X-LS-Session", token)
                        .header("X-Request-Id", requestId)
                        .contentType(MediaType.APPLICATION_XML)
                        .accept(MediaType.APPLICATION_XML, MediaType.TEXT_XML, MediaType.ALL)
                        .body(orderXml)
                        .retrieve()
                        .onStatus(HttpStatusCode::is4xxClientError, (req, res) -> {
                            if (res.getStatusCode().value() == 401) {
                                log.warn("[LegacySupplyClient] Received 401 Unauthorized - invalidating session.");
                                sessionManager.invalidateSession();
                            }
                            throw new RestClientResponseException(
                                    "Client error from LegacySupply: " + res.getStatusText(),
                                    res.getStatusCode().value(),
                                    res.getStatusText(),
                                    res.getHeaders(),
                                    res.getBody().readAllBytes(),
                                    null
                            );
                        })
                        .body(String.class);

                return xmlMapper.readValue(bodyXml, PurchaseOrderAckXml.class);

            } catch (RestClientResponseException e) {
                lastException = e;
                if (e.getStatusCode().value() == 401 && attempt < maxRetries) {
                    log.info("[LegacySupplyClient] Retrying after session invalidation...");
                    backoff(attempt);
                    continue;
                }
                log.error("[LegacySupplyClient] HTTP {} error: {}", e.getStatusCode().value(), e.getResponseBodyAsString());
                if (attempt < maxRetries && isRetryable(e.getStatusCode().value())) {
                    backoff(attempt);
                } else {
                    break;
                }
            } catch (Exception e) {
                lastException = e;
                log.warn("[LegacySupplyClient] Attempt {} failed with error: {}", attempt, e.getMessage());
                if (attempt < maxRetries) {
                    backoff(attempt);
                }
            }
        }

        throw new RuntimeException("Failed to place purchase order after " + maxRetries + " attempts: " +
                (lastException != null ? lastException.getMessage() : "unknown error"), lastException);
    }

    public PurchaseOrderStatusXml fetchOrderStatus(String poNumber) {
        if (!sessionManager.hasApiKey()) {
            return null;
        }

        for (int attempt = 1; attempt <= 2; attempt++) {
            try {
                String bodyXml = restClient.get()
                        .uri("/purchase-orders/{poNumber}", poNumber)
                        .header("X-LS-Session", token)
                        .accept(MediaType.APPLICATION_XML, MediaType.TEXT_XML, MediaType.ALL)
                        .retrieve()
                        .onStatus(HttpStatusCode::is4xxClientError, (req, res) -> {
                            if (res.getStatusCode().value() == 401) {
                                sessionManager.invalidateSession();
                            }
                            throw new RestClientResponseException(
                                    "Error fetching status: " + res.getStatusText(),
                                    res.getStatusCode().value(),
                                    res.getStatusText(),
                                    res.getHeaders(),
                                    res.getBody().readAllBytes(),
                                    null
                            );
                        })
                        .body(String.class);

                return xmlMapper.readValue(bodyXml, PurchaseOrderStatusXml.class);
            } catch (RestClientResponseException e) {
                if (e.getStatusCode().value() == 401 && attempt < 2) {
                    backoff(1);
                    continue;
                }
                log.warn("[LegacySupplyClient] Failed fetching status for PO {}: {}", poNumber, e.getMessage());
                return null;
            } catch (Exception e) {
                log.warn("[LegacySupplyClient] Exception fetching status for PO {}: {}", poNumber, e.getMessage());
                return null;
            }
        }
        return null;
    }

    public CatalogXml fetchCatalog() {
        if (!sessionManager.hasApiKey()) {
            return null;
        }

        try {
            String token = sessionManager.getSessionToken();
            String bodyXml = restClient.get()
                    .uri("/catalog")
                    .header("X-LS-Session", token)
                    .accept(MediaType.APPLICATION_XML, MediaType.TEXT_XML, MediaType.ALL)
                    .retrieve()
                    .body(String.class);

            return xmlMapper.readValue(bodyXml, CatalogXml.class);
        } catch (Exception e) {
            log.warn("[LegacySupplyClient] Failed fetching catalog: {}", e.getMessage());
            return null;
        }
    }

    private boolean isRetryable(int statusCode) {
        return statusCode == 408 || statusCode == 429 || statusCode >= 500;
    }

    private void backoff(int attempt) {
        try {
            long sleepMs = (long) Math.pow(2, attempt) * 300L;
            log.info("[LegacySupplyClient] Backing off for {} ms before next attempt...", sleepMs);
            Thread.sleep(sleepMs);
        } catch (InterruptedException ignored) {
            Thread.currentThread().interrupt();
        }
    }
}
