import * as React from "react";
import { ShoppingCart } from "lucide-react";
import { ContentLayout } from "@/components/layout/content-layout";
import { ComingSoonModule } from "@/components/shared/coming-soon-module";

export default function SalesPage() {
  return (
    <ContentLayout>
      <ComingSoonModule
        moduleName="Sales Orders & Fulfillment"
        moduleCode="SLS"
        targetPhase="Phase 2"
        icon={ShoppingCart}
        description="Commercial sales order generation, price quotes, discount approvals, and dispatch fulfillment pipeline."
        plannedFeatures={[
          "Quotation creation and conversion to binding Sales Orders",
          "Line item pricing with tiered customer discounts and tax calculations",
          "Automated warehouse allocation and picking/packing slips",
          "Order payment milestones (Draft, Pending, Paid, Dispatched)",
          "Invoice generation with PDF document export",
        ]}
        schemaRef="supabase/migrations/20261010000000_init_erp_schema.sql (sales_orders, sales_order_items)"
      />
    </ContentLayout>
  );
}
