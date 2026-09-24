package edu.cit.rabanal.supplier;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.dataformat.xml.annotation.JacksonXmlElementWrapper;
import com.fasterxml.jackson.dataformat.xml.annotation.JacksonXmlProperty;
import com.fasterxml.jackson.dataformat.xml.annotation.JacksonXmlRootElement;

import java.util.ArrayList;
import java.util.List;

@JacksonXmlRootElement(localName = "Catalog")
@JsonIgnoreProperties(ignoreUnknown = true)
class CatalogXml {

    @JacksonXmlElementWrapper(useWrapping = false)
    @JacksonXmlProperty(localName = "Item")
    private List<CatalogItemXml> items = new ArrayList<>();

    CatalogXml() {
    }

    public List<CatalogItemXml> getItems() {
        return items;
    }

    public void setItems(List<CatalogItemXml> items) {
        this.items = items;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    static class CatalogItemXml {
        @JacksonXmlProperty(localName = "SupplierSku")
        private String supplierSku;

        @JacksonXmlProperty(localName = "Description")
        private String description;

        @JacksonXmlProperty(localName = "PackSize")
        private int packSize;

        CatalogItemXml() {
        }

        public String getSupplierSku() {
            return supplierSku;
        }

        public void setSupplierSku(String supplierSku) {
            this.supplierSku = supplierSku;
        }

        public String getDescription() {
            return description;
        }

        public void setDescription(String description) {
            this.description = description;
        }

        public int getPackSize() {
            return packSize;
        }

        public void setPackSize(int packSize) {
            this.packSize = packSize;
        }
    }
}
