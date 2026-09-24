package edu.cit.rabanal;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.lang.ArchRule;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Modifier;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static org.assertj.core.api.Assertions.assertThat;

public class BoundaryTest {

    @Test
    @DisplayName("InventoryServiceImpl MUST be package-private (no public modifier)")
    void inventoryServiceImplMustBePackagePrivate() throws Exception {
        Class<?> implClass = Class.forName("edu.cit.rabanal.inventory.InventoryServiceImpl");
        int modifiers = implClass.getModifiers();

        // Must not be public, private, or protected -> default package-private
        assertThat(Modifier.isPublic(modifiers))
                .as("InventoryServiceImpl must not have the 'public' modifier")
                .isFalse();
        assertThat(Modifier.isPrivate(modifiers))
                .isFalse();
        assertThat(Modifier.isProtected(modifiers))
                .isFalse();
    }

    @Test
    @DisplayName("Shop module must NEVER depend on InventoryServiceImpl directly")
    void shopModuleMustNotDependOnInventoryServiceImpl() {
        JavaClasses importedClasses = new ClassFileImporter().importPackages("edu.cit.rabanal");

        ArchRule rule = noClasses()
                .that().resideInAPackage("edu.cit.rabanal.shop..")
                .should().dependOnClassesThat()
                .haveFullyQualifiedName("edu.cit.rabanal.inventory.InventoryServiceImpl");

        rule.check(importedClasses);
    }

    @Test
    @DisplayName("Notification module must NEVER depend on OrderService or InventoryService")
    void notificationModuleMustNotDependOnServicesOrRepositories() {
        JavaClasses importedClasses = new ClassFileImporter().importPackages("edu.cit.rabanal");

        ArchRule rule = noClasses()
                .that().resideInAPackage("edu.cit.rabanal.notification..")
                .should().dependOnClassesThat()
                .haveFullyQualifiedName("edu.cit.rabanal.shop.OrderService")
                .orShould().dependOnClassesThat()
                .haveFullyQualifiedName("edu.cit.rabanal.inventory.InventoryService")
                .orShould().dependOnClassesThat()
                .haveFullyQualifiedName("edu.cit.rabanal.inventory.InventoryServiceImpl")
                .orShould().dependOnClassesThat()
                .haveFullyQualifiedName("edu.cit.rabanal.shop.OrderRepository")
                .orShould().dependOnClassesThat()
                .haveFullyQualifiedName("edu.cit.rabanal.inventory.InventoryRepository");

        rule.check(importedClasses);
    }

    @Test
    @DisplayName("Shop and Inventory modules must NEVER depend on the Notification module")
    void shopAndInventoryMustNotDependOnNotification() {
        JavaClasses importedClasses = new ClassFileImporter().importPackages("edu.cit.rabanal");

        ArchRule rule = noClasses()
                .that().resideInAnyPackage("edu.cit.rabanal.shop..", "edu.cit.rabanal.inventory..")
                .should().dependOnClassesThat()
                .resideInAPackage("edu.cit.rabanal.notification..");

        rule.check(importedClasses);
    }

    @Test
    @DisplayName("Supplier internal classes (XML, HTTP client, Session, Translators, Impl) MUST be package-private")
    void supplierInternalClassesMustBePackagePrivate() throws Exception {
        String[] pkgPrivateClassNames = {
                "edu.cit.rabanal.supplier.SupplierGatewayImpl",
                "edu.cit.rabanal.supplier.SupplierOrder",
                "edu.cit.rabanal.supplier.LegacySupplyClient",
                "edu.cit.rabanal.supplier.SessionManager",
                "edu.cit.rabanal.supplier.SupplierTranslator",
                "edu.cit.rabanal.supplier.AuthRequestXml",
                "edu.cit.rabanal.supplier.AuthResponseXml",
                "edu.cit.rabanal.supplier.PurchaseOrderXml",
                "edu.cit.rabanal.supplier.PurchaseOrderAckXml",
                "edu.cit.rabanal.supplier.PurchaseOrderStatusXml",
                "edu.cit.rabanal.supplier.LSErrorXml"
        };

        for (String className : pkgPrivateClassNames) {
            Class<?> clazz = Class.forName(className);
            int modifiers = clazz.getModifiers();
            assertThat(Modifier.isPublic(modifiers))
                    .as("%s must NOT have the 'public' modifier", className)
                    .isFalse();
        }
    }

    @Test
    @DisplayName("Shop and Inventory modules must NEVER import LegacySupply or supplier internal implementations")
    void shopAndInventoryMustNotDependOnSupplierInternals() {
        JavaClasses importedClasses = new ClassFileImporter().importPackages("edu.cit.rabanal");

        ArchRule rule = noClasses()
                .that().resideInAnyPackage("edu.cit.rabanal.shop..", "edu.cit.rabanal.inventory..")
                .should().dependOnClassesThat()
                .haveFullyQualifiedName("edu.cit.rabanal.supplier.SupplierGatewayImpl")
                .orShould().dependOnClassesThat()
                .haveFullyQualifiedName("edu.cit.rabanal.supplier.LegacySupplyClient")
                .orShould().dependOnClassesThat()
                .haveFullyQualifiedName("edu.cit.rabanal.supplier.SessionManager")
                .orShould().dependOnClassesThat()
                .haveFullyQualifiedName("edu.cit.rabanal.supplier.SupplierTranslator")
                .orShould().dependOnClassesThat()
                .haveFullyQualifiedName("edu.cit.rabanal.supplier.SupplierOrder")
                .orShould().dependOnClassesThat()
                .haveFullyQualifiedName("edu.cit.rabanal.supplier.SupplierOrderRepository")
                .orShould().dependOnClassesThat()
                .haveSimpleNameEndingWith("Xml");

        rule.check(importedClasses);
    }

    @Test
    @DisplayName("Shop module must NEVER depend on the Supplier module")
    void shopModuleMustNotDependOnSupplier() {
        JavaClasses importedClasses = new ClassFileImporter().importPackages("edu.cit.rabanal");

        ArchRule rule = noClasses()
                .that().resideInAPackage("edu.cit.rabanal.shop..")
                .should().dependOnClassesThat()
                .resideInAPackage("edu.cit.rabanal.supplier..");

        rule.check(importedClasses);
    }
}
