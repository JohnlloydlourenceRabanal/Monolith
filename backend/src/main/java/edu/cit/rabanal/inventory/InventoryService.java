package edu.cit.rabanal.inventory;

import java.util.List;

public interface InventoryService {

    InventoryItem getItem(String productId);

    boolean reserve(String productId, int quantity);

    List<InventoryItem> getAllItems();
}
