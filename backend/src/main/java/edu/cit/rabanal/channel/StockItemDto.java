package edu.cit.rabanal.channel;

/**
 * Package-private DTO representing stock availability for a product on Tiangge.
 */
record StockItemDto(String sellerSku, int available) {}
