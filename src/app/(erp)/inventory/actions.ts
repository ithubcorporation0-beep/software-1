"use server";

import { revalidatePath } from "next/cache";
import {
  createWarehouse,
  createSupplier,
  createProduct,
  updateProduct,
  recordStockMovement,
  createPurchaseOrder,
  receivePurchaseOrderGoods,
  payPurchaseOrder,
} from "@/lib/inventory/server";

export interface ActionState<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
}

export async function createWarehouseAction(
  companyId: string,
  payload: any
): Promise<ActionState> {
  try {
    const warehouse = await createWarehouse(companyId, payload);
    revalidatePath("/inventory");
    return {
      success: true,
      message: `Warehouse ${warehouse.name} (${warehouse.code}) created successfully.`,
      data: warehouse,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to create warehouse",
    };
  }
}

export async function createSupplierAction(
  companyId: string,
  payload: any
): Promise<ActionState> {
  try {
    const supplier = await createSupplier(companyId, payload);
    revalidatePath("/inventory");
    return {
      success: true,
      message: `Supplier ${supplier.name} (${supplier.code}) added successfully.`,
      data: supplier,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to create supplier",
    };
  }
}

export async function createProductAction(
  companyId: string,
  payload: any
): Promise<ActionState> {
  try {
    const product = await createProduct(companyId, payload);
    revalidatePath("/inventory");
    return {
      success: true,
      message: `Product ${product.name} (SKU: ${product.sku}) registered in catalog.`,
      data: product,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to create product",
    };
  }
}

export async function updateProductAction(
  companyId: string,
  productId: string,
  payload: any
): Promise<ActionState> {
  try {
    const product = await updateProduct(companyId, productId, payload);
    revalidatePath("/inventory");
    return {
      success: true,
      message: `Product ${product.name} updated successfully.`,
      data: product,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to update product",
    };
  }
}

export async function recordStockMovementAction(
  companyId: string,
  payload: any
): Promise<ActionState> {
  try {
    const movement = await recordStockMovement(companyId, payload);
    revalidatePath("/inventory");
    return {
      success: true,
      message: `Stock movement ${movement.movement_number} recorded: ${movement.type} (${movement.quantity} units). New balance: ${movement.new_stock}.`,
      data: movement,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to record stock movement",
    };
  }
}

export async function createPurchaseOrderAction(
  companyId: string,
  payload: any
): Promise<ActionState> {
  try {
    const po = await createPurchaseOrder(companyId, payload);
    revalidatePath("/inventory");
    return {
      success: true,
      message: `Purchase Order ${po.po_number} created with ${po.items?.length || 0} line items ($${po.total_amount}).`,
      data: po,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to create purchase order",
    };
  }
}

export async function receivePurchaseOrderGoodsAction(
  companyId: string,
  poId: string,
  payload: any
): Promise<ActionState> {
  try {
    const po = await receivePurchaseOrderGoods(companyId, poId, payload);
    revalidatePath("/inventory");
    revalidatePath("/finance");
    return {
      success: true,
      message: `Goods received for PO ${po.po_number}. Stock updated and Accounts Payable journal entry posted.`,
      data: po,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to receive goods",
    };
  }
}

export async function payPurchaseOrderAction(
  companyId: string,
  poId: string,
  payload: any
): Promise<ActionState> {
  try {
    const po = await payPurchaseOrder(companyId, poId, payload);
    revalidatePath("/inventory");
    revalidatePath("/finance");
    return {
      success: true,
      message: `Payment of $${payload.amount} processed for PO ${po.po_number}. Status: ${po.payment_status}.`,
      data: po,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to process supplier payment",
    };
  }
}
