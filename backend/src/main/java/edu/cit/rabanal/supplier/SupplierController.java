package edu.cit.rabanal.supplier;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/supplier")
public class SupplierController {

    private final SupplierGateway supplierGateway;

    public SupplierController(SupplierGateway supplierGateway) {
        this.supplierGateway = supplierGateway;
    }

    @GetMapping("/orders")
    public ResponseEntity<List<SupplierOrderSummary>> getSupplierOrders() {
        return ResponseEntity.ok(supplierGateway.getAllOrders());
    }

    @PostMapping("/poll")
    public ResponseEntity<Void> pollOrders() {
        supplierGateway.pollOpenOrders();
        return ResponseEntity.ok().build();
    }

    @GetMapping("/config")
    public ResponseEntity<java.util.Map<String, Object>> getConfig() {
        return ResponseEntity.ok(java.util.Map.of(
                "clientId", "21-0328-885",
                "hasApiKey", supplierGateway.hasApiKey()
        ));
    }

    @PostMapping("/config")
    public ResponseEntity<java.util.Map<String, Object>> updateConfig(@org.springframework.web.bind.annotation.RequestBody java.util.Map<String, String> body) {
        String key = body.get("apiKey");
        if (key != null && !key.isBlank()) {
            supplierGateway.setApiKey(key.trim());
            return ResponseEntity.ok(java.util.Map.of(
                    "success", true,
                    "message", "LegacySupply API key saved and orders synchronized."
            ));
        }
        return ResponseEntity.badRequest().body(java.util.Map.of(
                "success", false,
                "message", "API key cannot be blank."
        ));
    }
}
