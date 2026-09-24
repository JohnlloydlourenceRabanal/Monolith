package edu.cit.rabanal.supplier;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Package-private Session Manager for LegacySupply authentication.
 * Handles automatic token acquisition and seamless re-authentication when expired.
 */
@Component
class SessionManager {

    private static final Logger log = LoggerFactory.getLogger(SessionManager.class);

    private final String baseUrl;
    private final String clientId;
    private final RestClient restClient;

    private final AtomicReference<String> apiKeyRef = new AtomicReference<>(null);
    private final AtomicReference<String> currentSessionToken = new AtomicReference<>(null);

    public SessionManager(
            @Value("${supplier.base-url:https://legacysupply.onrender.com/api/v1}") String baseUrl,
            @Value("${supplier.client-id:21-0328-885}") String clientId,
            @Value("${supplier.api-key:}") String apiKey,
            RestClient.Builder restClientBuilder
    ) {
        this.baseUrl = baseUrl;
        this.clientId = clientId;

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout((int) Duration.ofSeconds(3).toMillis());
        factory.setReadTimeout((int) Duration.ofSeconds(3).toMillis());

        this.restClient = restClientBuilder
                .baseUrl(baseUrl)
                .requestFactory(factory)
                .build();

        // Priority: Injected property > Environment Variable
        String initialKey = (apiKey != null && !apiKey.isBlank()) ? apiKey : System.getenv("LS_API_KEY");
        if (initialKey != null && !initialKey.isBlank()) {
            this.apiKeyRef.set(initialKey.trim());
        }
    }

    public boolean hasApiKey() {
        String key = apiKeyRef.get();
        return key != null && !key.isBlank();
    }

    public void setApiKey(String key) {
        if (key != null && !key.isBlank()) {
            this.apiKeyRef.set(key.trim());
            invalidateSession();
            log.info("[SessionManager] Updated API key dynamically. Invalidated previous session.");
        }
    }

    public synchronized String getSessionToken() {
        String token = currentSessionToken.get();
        if (token != null && !token.isBlank()) {
            return token;
        }
        return authenticate();
    }

    public synchronized void invalidateSession() {
        log.info("[SessionManager] Invalidating expired or rejected session token.");
        currentSessionToken.set(null);
    }

    public synchronized String authenticate() {
        String key = apiKeyRef.get();
        if (key == null || key.isBlank()) {
            log.warn("[SessionManager] No LS_API_KEY configured. Please provide your API key.");
            throw new IllegalStateException("LegacySupply API key is not configured. Please set LS_API_KEY or configure it.");
        }

        try {
            log.info("[SessionManager] Authenticating with LegacySupply for client: {}", clientId);
            AuthRequestXml request = new AuthRequestXml(clientId, key);

            String responseXml = restClient.post()
                    .uri("/auth/token")
                    .contentType(MediaType.APPLICATION_XML)
                    .accept(MediaType.APPLICATION_XML, MediaType.TEXT_XML, MediaType.ALL)
                    .body(request)
                    .retrieve()
                    .body(String.class);

            if (responseXml != null && !responseXml.isBlank()) {
                com.fasterxml.jackson.dataformat.xml.XmlMapper xmlMapper = new com.fasterxml.jackson.dataformat.xml.XmlMapper();
                AuthResponseXml response = xmlMapper.readValue(responseXml, AuthResponseXml.class);
                if (response != null && response.getSessionToken() != null) {
                    String token = response.getSessionToken();
                    currentSessionToken.set(token);
                    log.info("[SessionManager] Successfully obtained session token: {} (issued: {})",
                            token.substring(0, Math.min(8, token.length())) + "...", response.getIssuedAt());
                    return token;
                }
            }
            throw new IllegalStateException("Empty auth response from LegacySupply");
        } catch (Exception e) {
            log.error("[SessionManager] Authentication failed against {}: {}", baseUrl, e.getMessage());
            throw new RuntimeException("LegacySupply authentication failed: " + e.getMessage(), e);
        }
    }
}
