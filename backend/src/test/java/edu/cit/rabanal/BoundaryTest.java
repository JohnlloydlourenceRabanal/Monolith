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
}
