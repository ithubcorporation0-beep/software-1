"use client";

import * as React from "react";
import {
  Package,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Flame,
  ArrowRight,
  ArrowDownRight,
  ArrowUpRight,
  RefreshCw,
  Building,
  Truck,
  DollarSign,
  FileText,
  CreditCard,
  Layers,
  History,
  ShieldAlert,
  ChevronRight,
  Warehouse as WarehouseIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type {
  Product,
  ProductStatus,
  StockMovement,
  StockMovementType,
  Warehouse,
  InventorySupplier,
  PurchaseOrder,
  PurchaseOrderStatus,
} from "@/types/database.types";
import {
  createProductAction,
  recordStockMovementAction,
  createWarehouseAction,
  createSupplierAction,
  createPurchaseOrderAction,
  receivePurchaseOrderGoodsAction,
  payPurchaseOrderAction,
} from "./actions";

interface InventoryClientProps {
  companyId: string;
  currency: string;
  initialProducts: Product[];
  initialMovements: StockMovement[];
  initialWarehouses: Warehouse[];
  initialSuppliers: InventorySupplier[];
  initialPurchaseOrders: PurchaseOrder[];
}

export function InventoryClient({
  companyId,
  currency,
  initialProducts,
  initialMovements,
  initialWarehouses,
  initialSuppliers,
  initialPurchaseOrders,
}: InventoryClientProps) {
  const [products, setProducts] = React.useState<Product[]>(initialProducts);
  const [movements, setMovements] = React.useState<StockMovement[]>(initialMovements);
  const [warehouses, setWarehouses] = React.useState<Warehouse[]>(initialWarehouses);
  const [suppliers, setSuppliers] = React.useState<InventorySupplier[]>(initialSuppliers);
  const [purchaseOrders, setPurchaseOrders] = React.useState<PurchaseOrder[]>(initialPurchaseOrders);

  const [activeTab, setActiveTab] = React.useState<
    "products" | "movements" | "suppliers" | "purchases" | "warehouses"
  >("products");
  const [isPending, startTransition] = React.useTransition();

  // Banners
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  // Filters
  const [productSearch, setProductSearch] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState("all");
  const [selectedStatus, setSelectedStatus] = React.useState("all");

  // Modals
  const [isNewProductModalOpen, setIsNewProductModalOpen] = React.useState(false);
  const [isMovementModalOpen, setIsMovementModalOpen] = React.useState(false);
  const [movementProductId, setMovementProductId] = React.useState<string>("");
  const [isNewSupplierModalOpen, setIsNewSupplierModalOpen] = React.useState(false);
  const [isNewWarehouseModalOpen, setIsNewWarehouseModalOpen] = React.useState(false);
  const [isNewPOModalOpen, setIsNewPOModalOpen] = React.useState(false);
  const [receivingPO, setReceivingPO] = React.useState<PurchaseOrder | null>(null);
  const [payingPO, setPayingPO] = React.useState<PurchaseOrder | null>(null);

  // Sync props
  React.useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts]);
  React.useEffect(() => {
    setMovements(initialMovements);
  }, [initialMovements]);
  React.useEffect(() => {
    setWarehouses(initialWarehouses);
  }, [initialWarehouses]);
  React.useEffect(() => {
    setSuppliers(initialSuppliers);
  }, [initialSuppliers]);
  React.useEffect(() => {
    setPurchaseOrders(initialPurchaseOrders);
  }, [initialPurchaseOrders]);

  // Derived filtered products
  const filteredProducts = React.useMemo(() => {
    return products.filter((p) => {
      if (selectedCategory !== "all" && p.category !== selectedCategory) return false;
      if (selectedStatus !== "all" && p.status !== selectedStatus) return false;
      if (productSearch.trim()) {
        const q = productSearch.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchSku = p.sku.toLowerCase().includes(q);
        const matchBrand = (p.brand || "").toLowerCase().includes(q);
        if (!matchName && !matchSku && !matchBrand) return false;
      }
      return true;
    });
  }, [products, selectedCategory, selectedStatus, productSearch]);

  // Inventory Statistics
  const stats = React.useMemo(() => {
    const totalSkus = products.length;
    const lowStockCount = products.filter((p) => p.status === "Low Stock").length;
    const outOfStockCount = products.filter((p) => p.status === "Out of Stock").length;
    const totalValuation = products.reduce((acc, p) => acc + p.current_stock * p.purchase_price, 0);
    const pendingPOs = purchaseOrders.filter((po) => po.status === "Purchase Order").length;

    return {
      totalSkus,
      lowStockCount,
      outOfStockCount,
      totalValuation,
      pendingPOs,
    };
  }, [products, purchaseOrders]);

  // Handlers
  const handleCreateProduct = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const formData = new FormData(e.currentTarget);
    const payload = {
      sku: formData.get("sku")?.toString() || "",
      name: formData.get("name")?.toString() || "",
      category: formData.get("category")?.toString() || "General",
      brand: formData.get("brand")?.toString() || null,
      unit: formData.get("unit")?.toString() || "Units",
      purchasePrice: Number(formData.get("purchasePrice")) || 0,
      sellingPrice: Number(formData.get("sellingPrice")) || 0,
      minimumStock: Number(formData.get("minimumStock")) || 10,
      supplierId: formData.get("supplierId")?.toString() || null,
      warehouseId: formData.get("warehouseId")?.toString() || null,
    };

    startTransition(async () => {
      const res = await createProductAction(companyId, payload);
      if (!res.success) {
        setErrorMessage(res.message || "Failed to create product");
      } else {
        setSuccessMessage(res.message || "Product created");
        if (res.data) {
          setProducts((prev) => [res.data, ...prev]);
        }
        setIsNewProductModalOpen(false);
      }
    });
  };

  const handleRecordMovement = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const formData = new FormData(e.currentTarget);
    const payload = {
      productId: formData.get("productId")?.toString() || movementProductId,
      type: formData.get("type")?.toString() as StockMovementType,
      quantity: Number(formData.get("quantity")) || 1,
      reason: formData.get("reason")?.toString() || "",
      reference: formData.get("reference")?.toString() || null,
      destinationWarehouseId: formData.get("destinationWarehouseId")?.toString() || null,
    };

    startTransition(async () => {
      const res = await recordStockMovementAction(companyId, payload);
      if (!res.success) {
        setErrorMessage(res.message || "Failed to record movement");
      } else {
        setSuccessMessage(res.message || "Stock movement recorded");
        if (res.data) {
          setMovements((prev) => [res.data, ...prev]);
          // Refresh products stock locally
          setProducts((prev) =>
            prev.map((p) =>
              p.id === res.data.product_id
                ? { ...p, current_stock: res.data.new_stock, status: res.data.new_stock === 0 ? "Out of Stock" : res.data.new_stock <= p.minimum_stock ? "Low Stock" : "In Stock" }
                : p
            )
          );
        }
        setIsMovementModalOpen(false);
      }
    });
  };

  const handleCreateSupplier = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const formData = new FormData(e.currentTarget);
    const payload = {
      name: formData.get("name")?.toString() || "",
      companyName: formData.get("companyName")?.toString() || null,
      email: formData.get("email")?.toString() || null,
      phone: formData.get("phone")?.toString() || null,
      address: formData.get("address")?.toString() || null,
      taxId: formData.get("taxId")?.toString() || null,
      paymentTerms: formData.get("paymentTerms")?.toString() || "Net 30",
    };

    startTransition(async () => {
      const res = await createSupplierAction(companyId, payload);
      if (!res.success) {
        setErrorMessage(res.message || "Failed to create supplier");
      } else {
        setSuccessMessage(res.message || "Supplier created");
        if (res.data) {
          setSuppliers((prev) => [res.data, ...prev]);
        }
        setIsNewSupplierModalOpen(false);
      }
    });
  };

  const handleCreateWarehouse = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const formData = new FormData(e.currentTarget);
    const payload = {
      code: formData.get("code")?.toString().toUpperCase() || "",
      name: formData.get("name")?.toString() || "",
      city: formData.get("city")?.toString() || null,
      capacity: Number(formData.get("capacity")) || 10000,
    };

    startTransition(async () => {
      const res = await createWarehouseAction(companyId, payload);
      if (!res.success) {
        setErrorMessage(res.message || "Failed to create warehouse");
      } else {
        setSuccessMessage(res.message || "Warehouse created");
        if (res.data) {
          setWarehouses((prev) => [...prev, res.data]);
        }
        setIsNewWarehouseModalOpen(false);
      }
    });
  };

  const handleCreatePO = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const formData = new FormData(e.currentTarget);
    const supplierId = formData.get("supplierId")?.toString() || "";
    const productId = formData.get("productId")?.toString() || "";
    const selectedProd = products.find((p) => p.id === productId);

    const quantityOrdered = Number(formData.get("quantityOrdered")) || 1;
    const unitPrice = Number(formData.get("unitPrice")) || (selectedProd ? selectedProd.purchase_price : 0);

    const payload = {
      supplierId,
      orderDate: formData.get("orderDate")?.toString() || new Date().toISOString().split("T")[0],
      expectedDeliveryDate: formData.get("expectedDeliveryDate")?.toString() || null,
      notes: formData.get("notes")?.toString() || null,
      items: [
        {
          productId: selectedProd ? selectedProd.id : null,
          productName: selectedProd ? selectedProd.name : "Procured Materials",
          productSku: selectedProd ? selectedProd.sku : "MAT-GEN",
          quantityOrdered,
          unitPrice,
        },
      ],
    };

    startTransition(async () => {
      const res = await createPurchaseOrderAction(companyId, payload);
      if (!res.success) {
        setErrorMessage(res.message || "Failed to create purchase order");
      } else {
        setSuccessMessage(res.message || "Purchase order created");
        if (res.data) {
          setPurchaseOrders((prev) => [res.data, ...prev]);
        }
        setIsNewPOModalOpen(false);
      }
    });
  };

  const handleReceiveGoods = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!receivingPO) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    const formData = new FormData(e.currentTarget);
    const payload = {
      grnNumber: formData.get("grnNumber")?.toString() || undefined,
      supplierInvoiceNumber: formData.get("supplierInvoiceNumber")?.toString() || undefined,
    };

    startTransition(async () => {
      const res = await receivePurchaseOrderGoodsAction(companyId, receivingPO.id, payload);
      if (!res.success) {
        setErrorMessage(res.message || "Failed to receive goods");
      } else {
        setSuccessMessage(res.message || "Goods received and stock movements recorded!");
        if (res.data) {
          setPurchaseOrders((prev) =>
            prev.map((po) => (po.id === receivingPO.id ? res.data : po))
          );
        }
        setReceivingPO(null);
      }
    });
  };

  const handlePaySupplier = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!payingPO) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    const formData = new FormData(e.currentTarget);
    const payload = {
      amount: Number(formData.get("amount")),
      paymentMethod: formData.get("paymentMethod")?.toString() || "Bank Transfer",
      notes: formData.get("notes")?.toString() || undefined,
    };

    startTransition(async () => {
      const res = await payPurchaseOrderAction(companyId, payingPO.id, payload);
      if (!res.success) {
        setErrorMessage(res.message || "Failed to record payment");
      } else {
        setSuccessMessage(res.message || "Supplier payment posted to accounting ledger");
        if (res.data) {
          setPurchaseOrders((prev) =>
            prev.map((po) => (po.id === payingPO.id ? res.data : po))
          );
        }
        setPayingPO(null);
      }
    });
  };

  const renderStockBadge = (status: ProductStatus) => {
    switch (status) {
      case "In Stock":
        return <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">In Stock</Badge>;
      case "Low Stock":
        return <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30">Low Stock</Badge>;
      case "Out of Stock":
      default:
        return <Badge variant="destructive">Out of Stock</Badge>;
    }
  };

  const renderPOStatusBadge = (status: PurchaseOrderStatus) => {
    switch (status) {
      case "Paid":
        return <Badge className="bg-purple-500/20 text-purple-400 border border-purple-500/30">Paid</Badge>;
      case "Goods Received":
        return <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Goods Received</Badge>;
      case "Invoiced":
        return <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/30">Invoiced</Badge>;
      case "Purchase Order":
        return <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30">PO Placed</Badge>;
      case "Purchase Request":
        return <Badge variant="secondary">Purchase Request</Badge>;
      case "Cancelled":
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert Banners */}
      {errorMessage && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm font-medium">{errorMessage}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setErrorMessage(null)}>Dismiss</Button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm font-medium">{successMessage}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setSuccessMessage(null)}>Dismiss</Button>
        </div>
      )}

      {/* Top Inventory & Procurement KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Master Catalog SKUs</CardTitle>
            <Package className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-100">{stats.totalSkus}</div>
            <p className="text-xs text-slate-500 mt-1">
              Active product definitions across depots
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Inventory Valuation</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-100">
              {currency} {stats.totalValuation.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-500 mt-1">Cost value of on-hand inventory</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Stockout Defense Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-400">
              {stats.lowStockCount + stats.outOfStockCount}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              <span className="text-amber-400 font-semibold">{stats.lowStockCount}</span> low stock,{" "}
              <span className="text-red-400 font-semibold">{stats.outOfStockCount}</span> out of stock
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Active Purchases</CardTitle>
            <Truck className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-100">{purchaseOrders.length}</div>
            <p className="text-xs text-slate-500 mt-1">
              <span className="text-blue-400 font-semibold">{stats.pendingPOs}</span> awaiting delivery receipt
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Auditable Ledger Policy Notice */}
      <div className="p-3 bg-blue-950/20 border border-blue-900/40 rounded-xl text-blue-300 text-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 flex-shrink-0 text-blue-400" />
          <span>
            <strong>Auditable Stock Ledger Guarantee:</strong> Current stock cannot be edited directly as an untraceable number. All balance changes are derived atomically from immutable movement records with actor, timestamp, and reason logs.
          </span>
        </div>
      </div>

      {/* Main Tab Controls & Quick Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={activeTab === "products" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("products")}
            className="gap-2"
          >
            <Package className="h-4 w-4" />
            Products Catalog ({products.length})
          </Button>
          <Button
            variant={activeTab === "movements" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("movements")}
            className="gap-2"
          >
            <History className="h-4 w-4" />
            Stock Movements ({movements.length})
          </Button>
          <Button
            variant={activeTab === "purchases" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("purchases")}
            className="gap-2"
          >
            <Truck className="h-4 w-4" />
            Purchasing & Receiving ({purchaseOrders.length})
          </Button>
          <Button
            variant={activeTab === "suppliers" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("suppliers")}
            className="gap-2"
          >
            <Building className="h-4 w-4" />
            Suppliers ({suppliers.length})
          </Button>
          <Button
            variant={activeTab === "warehouses" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("warehouses")}
            className="gap-2"
          >
            <WarehouseIcon className="h-4 w-4" />
            Warehouses ({warehouses.length})
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setMovementProductId(products[0]?.id || "");
              setIsMovementModalOpen(true);
            }}
            disabled={products.length === 0}
            className="gap-1 border-slate-700 hover:bg-slate-800"
          >
            <RefreshCw className="h-4 w-4" />
            Record Movement
          </Button>
          <Button
            size="sm"
            onClick={() => setIsNewProductModalOpen(true)}
            className="gap-1 bg-primary text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
            New Product
          </Button>
        </div>
      </div>

      {/* TAB 1: PRODUCTS CATALOG */}
      {activeTab === "products" && (
        <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-md">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg text-slate-100">Master Products Catalog</CardTitle>
                <CardDescription className="text-slate-400">
                  Item SKUs, purchase & selling prices, min threshold triggers, and storage depot.
                </CardDescription>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[200px]">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <Input
                    placeholder="Search SKU, name, brand..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="pl-9 h-9 bg-slate-950/60 border-slate-800 text-xs"
                  />
                </div>

                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="h-9 px-3 bg-slate-950/60 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-primary"
                >
                  <option value="all">All Statuses</option>
                  <option value="In Stock">In Stock</option>
                  <option value="Low Stock">Low Stock</option>
                  <option value="Out of Stock">Out of Stock</option>
                </select>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {filteredProducts.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl">
                <Package className="h-8 w-8 mx-auto text-slate-600 mb-2" />
                <p className="text-sm font-semibold text-slate-300">No products found</p>
                <p className="text-xs text-slate-500 mt-1">Register your first SKU in the master catalog.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400">
                      <th className="py-3 px-4">SKU</th>
                      <th className="py-3 px-4">Product Name</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Purchase Price</th>
                      <th className="py-3 px-4">Selling Price</th>
                      <th className="py-3 px-4">Current Stock</th>
                      <th className="py-3 px-4">Min Trigger</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-sm">
                    {filteredProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-xs text-primary">
                          {p.sku}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-200">
                          <div>{p.name}</div>
                          {p.brand && <span className="text-xs text-slate-500">Brand: {p.brand}</span>}
                        </td>
                        <td className="py-3 px-4 text-slate-300 text-xs">
                          {p.category}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-200">
                          {currency} {p.purchase_price.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-200">
                          {currency} {p.selling_price.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-100">
                          {p.current_stock} <span className="text-xs text-slate-400 font-normal">{p.unit}</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-400 text-xs">
                          {p.minimum_stock}
                        </td>
                        <td className="py-3 px-4">
                          {renderStockBadge(p.status)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-primary hover:text-primary-foreground hover:bg-primary"
                            onClick={() => {
                              setMovementProductId(p.id);
                              setIsMovementModalOpen(true);
                            }}
                          >
                            Move Stock
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 2: AUDITABLE STOCK MOVEMENTS LEDGER */}
      {activeTab === "movements" && (
        <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-md">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg text-slate-100">Immutable Stock Movements Ledger</CardTitle>
                <CardDescription className="text-slate-400">
                  Auditable record of Stock In, Stock Out, Physical Adjustments, and Depot Transfers.
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setMovementProductId(products[0]?.id || "");
                  setIsMovementModalOpen(true);
                }}
                disabled={products.length === 0}
                className="gap-1 border-slate-700 hover:bg-slate-800"
              >
                <RefreshCw className="h-4 w-4" />
                Record Movement
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {movements.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl">
                <History className="h-8 w-8 mx-auto text-slate-600 mb-2" />
                <p className="text-sm font-semibold text-slate-300">No stock movements recorded yet</p>
                <p className="text-xs text-slate-500 mt-1">
                  Perform a stock in or receive a purchase order to populate ledger.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400">
                      <th className="py-3 px-4">Movement #</th>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Product / SKU</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Qty</th>
                      <th className="py-3 px-4">Balance Delta</th>
                      <th className="py-3 px-4">Reason & Ref</th>
                      <th className="py-3 px-4">Actor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-sm">
                    {movements.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-xs text-primary">
                          {m.movement_number}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-400">
                          {new Date(m.created_at).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-slate-200">
                          <div className="font-medium">{m.product_name}</div>
                          <span className="font-mono text-xs text-slate-400">{m.product_sku}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              m.type === "Stock In"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : m.type === "Stock Out"
                                ? "bg-red-500/20 text-red-400"
                                : m.type === "Adjustment"
                                ? "bg-blue-500/20 text-blue-400"
                                : "bg-purple-500/20 text-purple-400"
                            }`}
                          >
                            {m.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-100">
                          {m.quantity}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-300">
                          {m.previous_stock} → <strong className="text-primary">{m.new_stock}</strong>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-300 max-w-xs truncate">
                          <div>{m.reason}</div>
                          {m.reference && <span className="text-slate-500">Ref: {m.reference}</span>}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-400">
                          {m.actor_name || "System"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 3: PURCHASING & ORDERS WORKFLOW */}
      {activeTab === "purchases" && (
        <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-md">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg text-slate-100">Purchasing & Inbound Goods Pipeline</CardTitle>
                <CardDescription className="text-slate-400">
                  Purchase Order → Goods Received (stock updated exactly once) → Supplier Payment & GL Posting.
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => setIsNewPOModalOpen(true)}
                disabled={suppliers.length === 0}
                className="gap-1 bg-primary text-primary-foreground"
              >
                <Plus className="h-4 w-4" />
                Create Purchase Order
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {purchaseOrders.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl">
                <Truck className="h-8 w-8 mx-auto text-slate-600 mb-2" />
                <p className="text-sm font-semibold text-slate-300">No purchase orders created yet</p>
                <p className="text-xs text-slate-500 mt-1">Issue a purchase order to your registered suppliers.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400">
                      <th className="py-3 px-4">PO Number</th>
                      <th className="py-3 px-4">Supplier</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Total Amount</th>
                      <th className="py-3 px-4">Paid Amount</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Goods Receipt</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-sm">
                    {purchaseOrders.map((po) => {
                      const isReceived =
                        po.status === "Goods Received" ||
                        po.status === "Invoiced" ||
                        po.status === "Paid";
                      const isFullyPaid = po.payment_status === "Paid";

                      return (
                        <tr key={po.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-xs text-primary">
                            {po.po_number}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-200">
                            {po.supplier_name}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-400">
                            {po.order_date}
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold text-slate-100">
                            {currency} {po.total_amount.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-300">
                            {currency} {po.paid_amount.toFixed(2)}
                          </td>
                          <td className="py-3 px-4">
                            {renderPOStatusBadge(po.status)}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-400">
                            {po.grn_number ? (
                              <span className="text-emerald-400 font-mono">GRN: {po.grn_number}</span>
                            ) : (
                              <span className="text-amber-400">Pending Receipt</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {!isReceived && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs border-emerald-700 text-emerald-400 hover:bg-emerald-950"
                                  onClick={() => setReceivingPO(po)}
                                >
                                  Receive Goods
                                </Button>
                              )}

                              {isReceived && !isFullyPaid && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs border-purple-700 text-purple-400 hover:bg-purple-950"
                                  onClick={() => setPayingPO(po)}
                                >
                                  Pay Supplier
                                </Button>
                              )}

                              {isFullyPaid && (
                                <span className="text-xs text-purple-400 font-medium">Settled</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 4: SUPPLIERS MASTER */}
      {activeTab === "suppliers" && (
        <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-md">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg text-slate-100">Supplier Directory & Terms</CardTitle>
                <CardDescription className="text-slate-400">
                  Vendors, contact phone, emails, tax registration, and payment terms.
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => setIsNewSupplierModalOpen(true)}
                className="gap-1 bg-primary text-primary-foreground"
              >
                <Plus className="h-4 w-4" />
                Add Supplier
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {suppliers.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl">
                <Building className="h-8 w-8 mx-auto text-slate-600 mb-2" />
                <p className="text-sm font-semibold text-slate-300">No suppliers registered</p>
                <p className="text-xs text-slate-500 mt-1">Add your supply chain partners and vendors.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400">
                      <th className="py-3 px-4">Code</th>
                      <th className="py-3 px-4">Supplier Name</th>
                      <th className="py-3 px-4">Company</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Phone</th>
                      <th className="py-3 px-4">Tax ID</th>
                      <th className="py-3 px-4">Terms</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-sm">
                    {suppliers.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-xs text-primary">
                          {s.code}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-200">
                          {s.name}
                        </td>
                        <td className="py-3 px-4 text-slate-300 text-xs">
                          {s.company_name || "Independent"}
                        </td>
                        <td className="py-3 px-4 text-slate-300 text-xs">
                          {s.email || "N/A"}
                        </td>
                        <td className="py-3 px-4 text-slate-300 text-xs font-mono">
                          {s.phone || "N/A"}
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-xs font-mono">
                          {s.tax_id || "N/A"}
                        </td>
                        <td className="py-3 px-4 text-slate-300 text-xs">
                          {s.payment_terms}
                        </td>
                        <td className="py-3 px-4">
                          <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            {s.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 5: WAREHOUSES & DEPOTS */}
      {activeTab === "warehouses" && (
        <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-md">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg text-slate-100">Storage Depots & Logistics Hubs</CardTitle>
                <CardDescription className="text-slate-400">
                  Multi-warehouse facilities and physical storage capacities.
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => setIsNewWarehouseModalOpen(true)}
                className="gap-1 bg-primary text-primary-foreground"
              >
                <Plus className="h-4 w-4" />
                Add Warehouse
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {warehouses.map((wh) => (
                <div
                  key={wh.id}
                  className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-primary">{wh.code}</span>
                    <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Active
                    </Badge>
                  </div>
                  <h4 className="text-base font-semibold text-slate-100">{wh.name}</h4>
                  <p className="text-xs text-slate-400">Location: {wh.city || "Corporate Hub"}</p>
                  <div className="pt-2 border-t border-slate-800 text-xs text-slate-400 flex justify-between">
                    <span>Capacity</span>
                    <span className="font-mono text-slate-200">{wh.capacity.toLocaleString()} units</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* MODAL: CREATE PRODUCT */}
      {isNewProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <h3 className="text-lg font-bold text-slate-100">Register Master Catalog Product</h3>
              <Button variant="ghost" size="sm" onClick={() => setIsNewProductModalOpen(false)}>✕</Button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">SKU Code *</label>
                  <Input name="sku" required placeholder="e.g. LAP-001" className="bg-slate-950/60 border-slate-800 uppercase" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Product Name *</label>
                  <Input name="name" required placeholder="e.g. Dell XPS 15" className="bg-slate-950/60 border-slate-800" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Category</label>
                  <Input name="category" defaultValue="Electronics" className="bg-slate-950/60 border-slate-800" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Brand</label>
                  <Input name="brand" placeholder="Dell" className="bg-slate-950/60 border-slate-800" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Unit</label>
                  <Input name="unit" defaultValue="Units" className="bg-slate-950/60 border-slate-800" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Purchase Price ($)</label>
                  <Input name="purchasePrice" type="number" step="0.01" min="0" defaultValue="100.00" className="bg-slate-950/60 border-slate-800" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Selling Price ($)</label>
                  <Input name="sellingPrice" type="number" step="0.01" min="0" defaultValue="150.00" className="bg-slate-950/60 border-slate-800" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Min Threshold</label>
                  <Input name="minimumStock" type="number" min="0" defaultValue="10" className="bg-slate-950/60 border-slate-800" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Preferred Supplier</label>
                  <select
                    name="supplierId"
                    className="w-full h-9 px-3 bg-slate-950/60 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-primary"
                  >
                    <option value="">None / Open Market</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Default Warehouse</label>
                  <select
                    name="warehouseId"
                    className="w-full h-9 px-3 bg-slate-950/60 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-primary"
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.name} ({whCode(w.code)})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsNewProductModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isPending} className="bg-primary text-primary-foreground">
                  {isPending ? "Saving..." : "Register Product"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RECORD STOCK MOVEMENT */}
      {isMovementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <h3 className="text-lg font-bold text-slate-100">Record Auditable Stock Movement</h3>
              <Button variant="ghost" size="sm" onClick={() => setIsMovementModalOpen(false)}>✕</Button>
            </div>

            <form onSubmit={handleRecordMovement} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Target Product *</label>
                <select
                  name="productId"
                  defaultValue={movementProductId || products[0]?.id || ""}
                  className="w-full h-9 px-3 bg-slate-950/60 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-primary"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} - {p.name} (Current: {p.current_stock} {p.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Movement Type *</label>
                  <select
                    name="type"
                    defaultValue="Stock In"
                    className="w-full h-9 px-3 bg-slate-950/60 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-primary"
                  >
                    <option value="Stock In">Stock In (Inbound Receipt)</option>
                    <option value="Stock Out">Stock Out (Issue / Sales)</option>
                    <option value="Adjustment">Adjustment (Physical Audit Count)</option>
                    <option value="Transfer">Transfer (Depot Shift)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Quantity *</label>
                  <Input name="quantity" type="number" min="1" defaultValue="1" required className="bg-slate-950/60 border-slate-800" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Reason / Justification *</label>
                <Input name="reason" required placeholder="e.g. Initial Opening Stock / Damaged Goods Scrap" className="bg-slate-950/60 border-slate-800" />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Document Reference (Optional)</label>
                <Input name="reference" placeholder="e.g. PO-1001, RMA-402, AUDIT-2026" className="bg-slate-950/60 border-slate-800" />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsMovementModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isPending} className="bg-primary text-primary-foreground">
                  {isPending ? "Posting..." : "Post Movement"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE SUPPLIER */}
      {isNewSupplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <h3 className="text-lg font-bold text-slate-100">Add Supplier</h3>
              <Button variant="ghost" size="sm" onClick={() => setIsNewSupplierModalOpen(false)}>✕</Button>
            </div>

            <form onSubmit={handleCreateSupplier} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Supplier Name *</label>
                  <Input name="name" required placeholder="e.g. Silicon Supply Co." className="bg-slate-950/60 border-slate-800" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Company Entity</label>
                  <Input name="companyName" placeholder="Silicon Global Ltd" className="bg-slate-950/60 border-slate-800" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Email</label>
                  <Input name="email" type="email" placeholder="sales@silicon.com" className="bg-slate-950/60 border-slate-800" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Phone</label>
                  <Input name="phone" placeholder="+1-800-555-0199" className="bg-slate-950/60 border-slate-800" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Tax / VAT ID</label>
                  <Input name="taxId" placeholder="TAX-998822" className="bg-slate-950/60 border-slate-800" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Payment Terms</label>
                  <select
                    name="paymentTerms"
                    defaultValue="Net 30"
                    className="w-full h-9 px-3 bg-slate-950/60 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-primary"
                  >
                    <option value="Due on Receipt">Due on Receipt</option>
                    <option value="Net 15">Net 15</option>
                    <option value="Net 30">Net 30</option>
                    <option value="Net 60">Net 60</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Address</label>
                <Input name="address" placeholder="100 Semiconductor Way, Suite 400" className="bg-slate-950/60 border-slate-800" />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsNewSupplierModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isPending} className="bg-primary text-primary-foreground">
                  {isPending ? "Saving..." : "Add Supplier"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE WAREHOUSE */}
      {isNewWarehouseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <h3 className="text-lg font-bold text-slate-100">Add Warehouse Facility</h3>
              <Button variant="ghost" size="sm" onClick={() => setIsNewWarehouseModalOpen(false)}>✕</Button>
            </div>

            <form onSubmit={handleCreateWarehouse} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Depot Code *</label>
                  <Input name="code" required placeholder="e.g. WH-EAST" className="bg-slate-950/60 border-slate-800 uppercase" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Warehouse Name *</label>
                  <Input name="name" required placeholder="e.g. East Coast Depot" className="bg-slate-950/60 border-slate-800" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">City / Region</label>
                  <Input name="city" placeholder="New York" className="bg-slate-950/60 border-slate-800" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Storage Capacity (Units)</label>
                  <Input name="capacity" type="number" min="100" defaultValue="25000" className="bg-slate-950/60 border-slate-800" />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsNewWarehouseModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isPending} className="bg-primary text-primary-foreground">
                  {isPending ? "Creating..." : "Add Warehouse"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE PURCHASE ORDER */}
      {isNewPOModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <h3 className="text-lg font-bold text-slate-100">Issue Purchase Order</h3>
              <Button variant="ghost" size="sm" onClick={() => setIsNewPOModalOpen(false)}>✕</Button>
            </div>

            <form onSubmit={handleCreatePO} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Supplier *</label>
                <select
                  name="supplierId"
                  required
                  defaultValue={suppliers[0]?.id || ""}
                  className="w-full h-9 px-3 bg-slate-950/60 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-primary"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Order Date *</label>
                  <Input name="orderDate" type="date" defaultValue={new Date().toISOString().split("T")[0]} required className="bg-slate-950/60 border-slate-800" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Expected Delivery Date</label>
                  <Input name="expectedDeliveryDate" type="date" className="bg-slate-950/60 border-slate-800" />
                </div>
              </div>

              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg space-y-3">
                <span className="text-xs font-semibold text-slate-300">Procured Line Item</span>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Product SKU *</label>
                  <select
                    name="productId"
                    defaultValue={products[0]?.id || ""}
                    className="w-full h-9 px-3 bg-slate-950/60 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-primary"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.sku} - {p.name} (${p.purchase_price})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Quantity *</label>
                    <Input name="quantityOrdered" type="number" min="1" defaultValue="10" required className="bg-slate-900 border-slate-800" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Unit Cost ($)</label>
                    <Input name="unitPrice" type="number" step="0.01" min="0" defaultValue="100.00" className="bg-slate-900 border-slate-800" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Notes / Instructions</label>
                <textarea
                  name="notes"
                  rows={2}
                  className="w-full p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-primary"
                  placeholder="Delivery terms, dock receipt instructions..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsNewPOModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isPending} className="bg-primary text-primary-foreground">
                  {isPending ? "Generating..." : "Issue Purchase Order"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RECEIVE GOODS */}
      {receivingPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <h3 className="text-lg font-bold text-slate-100">Receive Goods: {receivingPO.po_number}</h3>
              <Button variant="ghost" size="sm" onClick={() => setReceivingPO(null)}>✕</Button>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Confirm inbound delivery for supplier <strong>{receivingPO.supplier_name}</strong>. This will atomically increment stock in the inventory ledger and post balanced double-entry accounting records.
            </p>

            <form onSubmit={handleReceiveGoods} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Goods Receipt Note (GRN #)</label>
                <Input name="grnNumber" placeholder="Auto-generated if empty" className="bg-slate-950/60 border-slate-800" />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Supplier Invoice Number</label>
                <Input name="supplierInvoiceNumber" placeholder="e.g. INV-SUP-9021" className="bg-slate-950/60 border-slate-800" />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <Button type="button" variant="outline" size="sm" onClick={() => setReceivingPO(null)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  {isPending ? "Processing..." : "Confirm & Update Stock"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PAY SUPPLIER */}
      {payingPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <h3 className="text-lg font-bold text-slate-100">Supplier Payment: {payingPO.po_number}</h3>
              <Button variant="ghost" size="sm" onClick={() => setPayingPO(null)}>✕</Button>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-lg text-xs space-y-1 mb-4 border border-slate-800">
              <div className="flex justify-between text-slate-400">
                <span>Total PO Amount:</span>
                <span className="font-mono text-slate-200">${payingPO.total_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Already Paid:</span>
                <span className="font-mono text-slate-200">${payingPO.paid_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-200 font-semibold pt-1 border-t border-slate-800">
                <span>Remaining Due:</span>
                <span className="font-mono text-primary">
                  ${(payingPO.total_amount - payingPO.paid_amount).toFixed(2)}
                </span>
              </div>
            </div>

            <form onSubmit={handlePaySupplier} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Disbursement Amount ($) *</label>
                <Input
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={(payingPO.total_amount - payingPO.paid_amount).toFixed(2)}
                  defaultValue={(payingPO.total_amount - payingPO.paid_amount).toFixed(2)}
                  required
                  className="bg-slate-950/60 border-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Payment Method</label>
                <select
                  name="paymentMethod"
                  defaultValue="Bank Transfer"
                  className="w-full h-9 px-3 bg-slate-950/60 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-primary"
                >
                  <option value="Bank Transfer">Operating Bank Transfer</option>
                  <option value="Cheque">Corporate Cheque</option>
                  <option value="Cash">Cash in Vault</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <Button type="button" variant="outline" size="sm" onClick={() => setPayingPO(null)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isPending} className="bg-purple-600 hover:bg-purple-700 text-white">
                  {isPending ? "Disbursing..." : "Post Payment"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function whCode(code: string) {
  return code;
}
