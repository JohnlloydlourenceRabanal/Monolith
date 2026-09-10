package com.example.monolith.common.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI monolithOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Modular Monolith API - Order & Inventory")
                        .description("Demonstrates three integration styles: in-process module boundaries, Supabase PostgreSQL, and REST client.")
                        .version("1.0.0")
                        .contact(new Contact().name("Monolith Architecture Demo")));
    }
}
