import { DbAdapter } from '../../../lib/db/dbAdapter';
import { AuditService } from '../../../lib/audit/auditService';
import { Validators } from '../../../lib/validation/validators';

export const InventoryService = {
  getProducts() {
    return DbAdapter.getProducts();
  },

  calculateStatus(stock, minThreshold) {
    const s = Number(stock);
    const m = Number(minThreshold);
    if (s <= 0) return 'Out of Stock';
    if (s <= Math.ceil(m * 0.4)) return 'Critical Low';
    if (s <= m) return 'Low Stock';
    return 'In Stock';
  },

  addProduct(productData, operator = 'Admin') {
    const val = Validators.validateProduct(productData);
    if (!val.isValid) {
      const firstErr = Object.values(val.errors)[0];
      throw new Error(firstErr);
    }

    const products = DbAdapter.getProducts();
    const newProduct = {
      ...productData,
      id: `prod-${Date.now()}`,
      createdAt: new Date().toISOString(),
      lastRestocked: productData.currentStock > 0 ? new Date().toISOString() : null,
      status: this.calculateStatus(productData.currentStock, productData.minThreshold)
    };

    DbAdapter.setProducts([newProduct, ...products]);
    AuditService.log({
      action: 'PRODUCT_CREATED',
      entityType: 'PRODUCT',
      entityId: newProduct.id,
      operator,
      details: `Created SKU ${newProduct.sku} (${newProduct.name})`
    });

    return newProduct;
  },

  updateProduct(id, updates, operator = 'Admin') {
    const products = DbAdapter.getProducts();
    const idx = products.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('Product not found');

    const currentStock = updates.currentStock !== undefined ? Number(updates.currentStock) : products[idx].currentStock;
    const minThreshold = updates.minThreshold !== undefined ? Number(updates.minThreshold) : products[idx].minThreshold;

    const updated = {
      ...products[idx],
      ...updates,
      currentStock,
      minThreshold,
      status: this.calculateStatus(currentStock, minThreshold)
    };

    products[idx] = updated;
    DbAdapter.setProducts(products);
    AuditService.log({
      action: 'PRODUCT_UPDATED',
      entityType: 'PRODUCT',
      entityId: id,
      operator,
      details: `Updated SKU ${updated.sku}`
    });

    return updated;
  },

  deleteProduct(id, operator = 'Admin') {
    const products = DbAdapter.getProducts();
    const target = products.find(p => p.id === id);
    if (!target) return products;

    const filtered = products.filter(p => p.id !== id);
    DbAdapter.setProducts(filtered);
    AuditService.log({
      action: 'PRODUCT_DELETED',
      entityType: 'PRODUCT',
      entityId: id,
      operator,
      details: `Deleted SKU ${target.sku}`
    });

    return filtered;
  },

  recordMovement({ productId, type, quantity, reference, operator = 'Operations Specialist', notes }) {
    const products = DbAdapter.getProducts();
    const product = products.find(p => p.id === productId);
    if (!product) throw new Error('Product SKU not found');

    const qty = Number(quantity);
    const val = Validators.validateStockMovement({ type, quantity: qty }, product.currentStock);
    if (!val.isValid) {
      throw new Error(Object.values(val.errors)[0]);
    }

    let newStock = product.currentStock;
    if (type === 'Stock In') {
      newStock += qty;
    } else if (type === 'Stock Out') {
      newStock -= qty;
    } else if (type === 'Audit Adjustment') {
      newStock += qty;
      if (newStock < 0) newStock = 0;
    }

    const updatedProduct = {
      ...product,
      currentStock: newStock,
      status: this.calculateStatus(newStock, product.minThreshold),
      lastRestocked: type === 'Stock In' ? new Date().toISOString() : product.lastRestocked
    };

    DbAdapter.setProducts(products.map(p => p.id === productId ? updatedProduct : p));

    const movements = DbAdapter.getMovements();
    const warehouses = DbAdapter.getWarehouses();
    const warehouse = warehouses.find(w => w.id === product.warehouseId);

    const movementRecord = {
      id: `MOV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toISOString(),
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      type,
      quantity: type === 'Stock Out' ? -Math.abs(qty) : Math.abs(qty),
      warehouseId: product.warehouseId,
      warehouseName: warehouse ? warehouse.name : 'Main Warehouse',
      reference: reference || `REF-${Date.now().toString().slice(-6)}`,
      operator,
      notes: notes || `${type} recorded for ${product.sku}`
    };

    DbAdapter.setMovements([movementRecord, ...movements]);

    // Log Activity
    const acts = DbAdapter.getActivities();
    const actType = type === 'Stock In' ? 'in' : (type === 'Stock Out' ? 'out' : 'alert');
    const newAct = {
      id: `act-${Date.now()}`,
      text: `${operator} recorded ${type} (${Math.abs(qty)} units) for ${product.sku}`,
      time: 'Just now',
      type: actType
    };
    DbAdapter.setActivities([newAct, ...acts.slice(0, 19)]);

    AuditService.log({
      action: 'STOCK_MOVEMENT',
      entityType: 'INVENTORY',
      entityId: movementRecord.id,
      operator,
      details: `${type} of ${qty} units for SKU ${product.sku}`
    });

    return { product: updatedProduct, movement: movementRecord };
  }
};
