package edu.cit.rabanal.inventory;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final InventoryRepository inventoryRepository;

    public DataInitializer(InventoryRepository inventoryRepository) {
        this.inventoryRepository = inventoryRepository;
    }

    @Override
    public void run(String... args) {
        if (inventoryRepository.count() == 0) {
            log.info("[Data Seeding] Seeding required inventory table...");
            inventoryRepository.saveAll(List.of(
                    new InventoryItem("P100", "Wireless Mouse", 25),
                    new InventoryItem("P200", "Mechanical Keyboard", 10),
                    new InventoryItem("P300", "USB-C Hub", 0)
            ));
            log.info("[Data Seeding] Seeded P100 (25), P200 (10), P300 (0) into inventory table.");
        } else {
            log.info("[Data Seeding] Inventory table already contains {} records.", inventoryRepository.count());
        }
    }
}
