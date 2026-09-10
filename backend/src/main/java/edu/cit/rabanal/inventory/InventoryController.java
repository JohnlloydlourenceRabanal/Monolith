package edu.cit.rabanal.inventory;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/inventory")
public class InventoryController {

    private final InventoryService inventoryService;

    public InventoryController(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    @GetMapping
    public ResponseEntity<List<InventoryItem>> getInventory() {
        return ResponseEntity.ok(inventoryService.getAllItems());
    }

    @org.springframework.web.bind.annotation.PostMapping("/restock-all")
    public ResponseEntity<List<InventoryItem>> restockAll() {
        inventoryService.restockAll();
        return ResponseEntity.ok(inventoryService.getAllItems());
    }
}
