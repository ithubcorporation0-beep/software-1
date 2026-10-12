import * as React from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ContentLayout } from "@/components/layout/content-layout";
import { InventoryClient } from "./inventory-client";
import {
  getProducts,
  getStockMovements,
  getWarehouses,
  getSuppliers,
  getPurchaseOrders,
} from "@/lib/inventory/server";
import { getCompanySettings } from "@/lib/company/server";

const DEFAULT_COMPANY_ID = "00000000-0000-0000-0000-000000000001";

export default async function InventoryPage() {
  const companyId = DEFAULT_COMPANY_ID;

  const [products, movements, warehouses, suppliers, purchaseOrders, companySettings] =
    await Promise.all([
      getProducts(companyId).catch(() => []),
      getStockMovements(companyId).catch(() => []),
      getWarehouses(companyId).catch(() => []),
      getSuppliers(companyId).catch(() => []),
      getPurchaseOrders(companyId).catch(() => []),
      getCompanySettings(companyId).catch(() => ({ currency: "USD" })),
    ]);

  return (
    <ContentLayout>
      <PageHeader
        title="Inventory, Warehouses & Purchasing"
        description="Master SKU product catalog, auditable stock movements ledger, suppliers, and procurement workflow."
        breadcrumbs={[{ label: "Inventory & Purchasing" }]}
      />

      <InventoryClient
        companyId={companyId}
        currency={companySettings.currency || "USD"}
        initialProducts={products}
        initialMovements={movements}
        initialWarehouses={warehouses}
        initialSuppliers={suppliers}
        initialPurchaseOrders={purchaseOrders}
      />
    </ContentLayout>
  );
}
