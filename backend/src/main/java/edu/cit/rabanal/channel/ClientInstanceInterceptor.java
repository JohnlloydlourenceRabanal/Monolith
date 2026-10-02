package edu.cit.rabanal.channel;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.web.client.RestClientCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpRequest;
import org.springframework.http.client.ClientHttpRequestExecution;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.UUID;

/**
 * Shared Request Interceptor.
 * Generates a single UUID instance ID on startup, logs it clearly,
 * and attaches the 'X-Client-Instance' header to EVERY outgoing HTTP call
 * to Tiangge and LegacySupply.
 */
@Component
class ClientInstanceInterceptor implements ClientHttpRequestInterceptor {

    private static final Logger log = LoggerFactory.getLogger(ClientInstanceInterceptor.class);

    private final String instanceId;

    public ClientInstanceInterceptor() {
        this.instanceId = UUID.randomUUID().toString();
        log.info("================================================================================");
        log.info("[Tiangge & LegacySupply] Generated Unique Client Instance ID: {}", this.instanceId);
        log.info("================================================================================");
    }

    public String getInstanceId() {
        return instanceId;
    }

    @Override
    public ClientHttpResponse intercept(HttpRequest request, byte[] body, ClientHttpRequestExecution execution) throws IOException {
        request.getHeaders().set("X-Client-Instance", instanceId);
        return execution.execute(request, body);
    }

    @Configuration(proxyBeanMethods = false)
    static class RestClientConfig {
        @Bean
        RestClientCustomizer clientInstanceCustomizer(ClientInstanceInterceptor interceptor) {
            return restClientBuilder -> restClientBuilder.requestInterceptor(interceptor);
        }
    }
}
