import * as React from "react";
import { Package } from "lucide-react";
import { ContentLayout } from "@/components/layout/content-layout";
import { ComingSoonModule } from "@/components/shared/coming-soon-module";

export default function InventoryPage() {
  return (
    <ContentLayout>
      <ComingSoonModule
        moduleName="Inventory & Multi-Depot Logistics"
        moduleCode="INV"
        targetPhase="Phase 2"
        icon={Package}
        description="Comprehensive SKU master catalog, multi-warehouse stock balances, barcode scanning, and stock movement ledgers."
        plannedFeatures={[
          "Product catalog with automated SKU and UPC/EAN barcode generators",
          "Multi-warehouse storage depot tracking and bin location allocations",
          "Inbound/Outbound movement journal with negative-stock prevention",
          "Automated stockout defense and replenishment threshold calculations",
          "Cycle counting audit reconciliation and scrap management",
        ]}
        schemaRef="supabase/migrations/20261010000000_init_erp_schema.sql (products, warehouses, stock_movements)"
      />
    </ContentLayout>
  );
}
