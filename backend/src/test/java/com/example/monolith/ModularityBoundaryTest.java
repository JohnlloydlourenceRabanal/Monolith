package com.example.monolith;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.lang.ArchRule;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

public class ModularityBoundaryTest {

    private final JavaClasses importedClasses = new ClassFileImporter()
            .importPackages("com.example.monolith");

    @Test
    @DisplayName("Order module must NOT access internal inventory classes or entities")
    void orderModuleShouldNotAccessInternalInventoryClasses() {
        ArchRule rule = noClasses()
                .that().resideInAPackage("com.example.monolith.order..")
                .should().dependOnClassesThat()
                .resideInAPackage("com.example.monolith.inventory.internal..");

        rule.check(importedClasses);
    }

    @Test
    @DisplayName("Inventory module must NOT access internal order classes or entities")
    void inventoryModuleShouldNotAccessInternalOrderClasses() {
        ArchRule rule = noClasses()
                .that().resideInAPackage("com.example.monolith.inventory..")
                .should().dependOnClassesThat()
                .resideInAPackage("com.example.monolith.order.internal..");

        rule.check(importedClasses);
    }

    @Test
    @DisplayName("Inventory internal entities must not be referenced by the order module")
    void inventoryEntitiesMustNotLeakToOrderModule() {
        ArchRule rule = noClasses()
                .that().resideInAPackage("com.example.monolith.order..")
                .should().dependOnClassesThat()
                .resideInAPackage("com.example.monolith.inventory.internal.domain..");

        rule.check(importedClasses);
    }
}
