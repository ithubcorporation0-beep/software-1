// Storage Service with LocalStorage persistence and transaction management

import {
  INITIAL_CATEGORIES,
  INITIAL_WAREHOUSES,
  INITIAL_SUPPLIERS,
  INITIAL_PRODUCTS,
  INITIAL_MOVEMENTS,
  INITIAL_ACTIVITIES
} from '../data/initialData';

const STORAGE_KEYS = {
  PRODUCTS: 'nexus_erp_products',
  CATEGORIES: 'nexus_erp_categories',
  WAREHOUSES: 'nexus_erp_warehouses',
  SUPPLIERS: 'nexus_erp_suppliers',
  MOVEMENTS: 'nexus_erp_movements',
  ACTIVITIES: 'nexus_erp_activities',
  THEME: 'nexus_erp_theme'
};

function safeGet(key, fallback) {
  try {
    const item = localStorage.getItem(key);
    if (!item) return fallback;
    return JSON.parse(item);
  } catch (err) {
    console.error(`Error reading ${key} from localStorage:`, err);
    return fallback;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Error saving ${key} to localStorage:`, err);
  }
}

export const StorageService = {
  // Initialize and Seed data if not present
  init() {
    if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) {
      safeSet(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.CATEGORIES)) {
      safeSet(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
    }
    if (!localStorage.getItem(STORAGE_KEYS.WAREHOUSES)) {
      safeSet(STORAGE_KEYS.WAREHOUSES, INITIAL_WAREHOUSES);
    }
    if (!localStorage.getItem(STORAGE_KEYS.SUPPLIERS)) {
      safeSet(STORAGE_KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.MOVEMENTS)) {
      safeSet(STORAGE_KEYS.MOVEMENTS, INITIAL_MOVEMENTS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.ACTIVITIES)) {
      safeSet(STORAGE_KEYS.ACTIVITIES, INITIAL_ACTIVITIES);
    }
  },

  // Reset to initial demo dataset
  resetToDemo() {
    safeSet(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
    safeSet(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
    safeSet(STORAGE_KEYS.WAREHOUSES, INITIAL_WAREHOUSES);
    safeSet(STORAGE_KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
    safeSet(STORAGE_KEYS.MOVEMENTS, INITIAL_MOVEMENTS);
    safeSet(STORAGE_KEYS.ACTIVITIES, INITIAL_ACTIVITIES);
    return {
      products: INITIAL_PRODUCTS,
      categories: INITIAL_CATEGORIES,
      warehouses: INITIAL_WAREHOUSES,
      suppliers: INITIAL_SUPPLIERS,
      movements: INITIAL_MOVEMENTS,
      activities: INITIAL_ACTIVITIES
    };
  },

  // Products CRUD
  getProducts() {
    return safeGet(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
  },

  saveProducts(products) {
    safeSet(STORAGE_KEYS.PRODUCTS, products);
  },

  addProduct(productData) {
    const products = this.getProducts();
    const newProduct = {
      ...productData,
      id: `prod-${Date.now()}`,
      createdAt: new Date().toISOString(),
      lastRestocked: productData.currentStock > 0 ? new Date().toISOString() : null,
      status: this.calculateStatus(productData.currentStock, productData.minThreshold)
    };
    const updated = [newProduct, ...products];
    this.saveProducts(updated);
    this.logActivity(`Created new SKU: ${newProduct.sku} (${newProduct.name})`, 'in');
    return newProduct;
  },

  updateProduct(id, updates) {
    const products = this.getProducts();
    const idx = products.findIndex(p => p.id === id);
    if (idx === -1) return null;

    const currentStock = updates.currentStock !== undefined ? Number(updates.currentStock) : products[idx].currentStock;
    const minThreshold = updates.minThreshold !== undefined ? Number(updates.minThreshold) : products[idx].minThreshold;

    const updatedProduct = {
      ...products[idx],
      ...updates,
      currentStock,
      minThreshold,
      status: this.calculateStatus(currentStock, minThreshold)
    };

    products[idx] = updatedProduct;
    this.saveProducts(products);
    this.logActivity(`Updated product specifications: ${updatedProduct.sku}`, 'neutral');
    return updatedProduct;
  },

  deleteProduct(id) {
    const products = this.getProducts();
    const target = products.find(p => p.id === id);
    const filtered = products.filter(p => p.id !== id);
    this.saveProducts(filtered);
    if (target) {
      this.logActivity(`Removed product SKU: ${target.sku} from catalog`, 'danger');
    }
    return filtered;
  },

  // Stock Movement Transaction
  recordStockMovement({ productId, type, quantity, reference, notes, operator = 'Admin' }) {
    const products = this.getProducts();
    const product = products.find(p => p.id === productId);
    if (!product) throw new Error('Product not found');

    const qty = Number(quantity);
    let newStock = product.currentStock;

    if (type === 'Stock In') {
      newStock += qty;
    } else if (type === 'Stock Out') {
      if (newStock < qty) {
        throw new Error(`Insufficient stock. Current stock is ${newStock}, requested ${qty}`);
      }
      newStock -= qty;
    } else if (type === 'Audit Adjustment') {
      // qty can be positive or negative
      newStock += qty;
      if (newStock < 0) newStock = 0;
    }

    const updatedProduct = {
      ...product,
      currentStock: newStock,
      status: this.calculateStatus(newStock, product.minThreshold),
      lastRestocked: type === 'Stock In' ? new Date().toISOString() : product.lastRestocked
    };

    const updatedProducts = products.map(p => p.id === productId ? updatedProduct : p);
    this.saveProducts(updatedProducts);

    // Record movement item
    const movements = this.getMovements();
    const warehouses = this.getWarehouses();
    const warehouse = warehouses.find(w => w.id === product.warehouseId);

    const movementRecord = {
      id: `MOV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toISOString(),
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      type,
      quantity: type === 'Stock Out' ? -Math.abs(qty) : (type === 'Stock In' ? Math.abs(qty) : qty),
      warehouseId: product.warehouseId,
      warehouseName: warehouse ? warehouse.name : 'Main Warehouse',
      reference: reference || `REF-${Date.now().toString().slice(-6)}`,
      operator: operator || 'Operations Specialist',
      notes: notes || `${type} recorded for ${product.sku}`
    };

    const updatedMovements = [movementRecord, ...movements];
    safeSet(STORAGE_KEYS.MOVEMENTS, updatedMovements);

    const activityType = type === 'Stock In' ? 'in' : (type === 'Stock Out' ? 'out' : 'alert');
    this.logActivity(`${operator} recorded ${type} (${Math.abs(qty)} units) for ${product.sku}`, activityType);

    return { product: updatedProduct, movement: movementRecord };
  },

  calculateStatus(stock, minThreshold) {
    const s = Number(stock);
    const m = Number(minThreshold);
    if (s <= 0) return 'Out of Stock';
    if (s <= Math.ceil(m * 0.4)) return 'Critical Low';
    if (s <= m) return 'Low Stock';
    return 'In Stock';
  },

  // Movements
  getMovements() {
    return safeGet(STORAGE_KEYS.MOVEMENTS, INITIAL_MOVEMENTS);
  },

  // Warehouses
  getWarehouses() {
    return safeGet(STORAGE_KEYS.WAREHOUSES, INITIAL_WAREHOUSES);
  },

  saveWarehouses(warehouses) {
    safeSet(STORAGE_KEYS.WAREHOUSES, warehouses);
  },

  // Suppliers
  getSuppliers() {
    return safeGet(STORAGE_KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
  },

  saveSuppliers(suppliers) {
    safeSet(STORAGE_KEYS.SUPPLIERS, suppliers);
  },

  // Categories
  getCategories() {
    return safeGet(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
  },

  // Activity Log
  getActivities() {
    return safeGet(STORAGE_KEYS.ACTIVITIES, INITIAL_ACTIVITIES);
  },

  logActivity(text, type = 'neutral') {
    const activities = this.getActivities();
    const newAct = {
      id: `act-${Date.now()}`,
      text,
      time: 'Just now',
      type
    };
    const updated = [newAct, ...activities.slice(0, 19)];
    safeSet(STORAGE_KEYS.ACTIVITIES, updated);
    return updated;
  },

  // Export Data as JSON
  exportDataJSON() {
    const data = {
      exportTimestamp: new Date().toISOString(),
      version: '1.0.0',
      products: this.getProducts(),
      categories: this.getCategories(),
      warehouses: this.getWarehouses(),
      suppliers: this.getSuppliers(),
      movements: this.getMovements()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexus_erp_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  // Export Products as CSV
  exportProductsCSV() {
    const products = this.getProducts();
    const headers = ['SKU', 'Name', 'Category', 'Cost Price', 'Selling Price', 'Current Stock', 'Min Threshold', 'Unit', 'Bin Location', 'Status'];
    const rows = products.map(p => [
      `"${p.sku}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.category}"`,
      p.costPrice,
      p.sellingPrice,
      p.currentStock,
      p.minThreshold,
      `"${p.unit || 'Units'}"`,
      `"${p.binLocation || ''}"`,
      `"${p.status}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexus_inventory_catalog_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },

  // Import Data from JSON file
  importDataJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (data.products && Array.isArray(data.products)) {
        safeSet(STORAGE_KEYS.PRODUCTS, data.products);
      }
      if (data.movements && Array.isArray(data.movements)) {
        safeSet(STORAGE_KEYS.MOVEMENTS, data.movements);
      }
      if (data.warehouses && Array.isArray(data.warehouses)) {
        safeSet(STORAGE_KEYS.WAREHOUSES, data.warehouses);
      }
      if (data.suppliers && Array.isArray(data.suppliers)) {
        safeSet(STORAGE_KEYS.SUPPLIERS, data.suppliers);
      }
      return true;
    } catch (e) {
      console.error('Import error:', e);
      return false;
    }
  }
};
