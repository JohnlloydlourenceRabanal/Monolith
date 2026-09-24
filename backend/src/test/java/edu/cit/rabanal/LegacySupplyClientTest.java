package edu.cit.rabanal;

import edu.cit.rabanal.supplier.SupplierGateway;
import edu.cit.rabanal.supplier.SupplierReorderResult;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
public class LegacySupplyClientTest {

    @Autowired
    private SupplierGateway supplierGateway;

    @Test
    void testReorderExecution() {
        SupplierReorderResult result = supplierGateway.orderReplenishment("P100", 15);
        System.out.println("Result: " + result);
    }
}
