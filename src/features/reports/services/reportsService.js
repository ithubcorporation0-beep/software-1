import { DbAdapter } from '../../../lib/db/dbAdapter';

export const ReportsService = {
  generateInventoryValuationReport() {
    const products = DbAdapter.getProducts();
    const headers = ['SKU', 'Product Name', 'Category', 'Unit Cost', 'Selling Price', 'In Stock', 'Total Valuation'];
    const rows = products.map(p => [
      `"${p.sku}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.category}"`,
      p.costPrice.toFixed(2),
      p.sellingPrice.toFixed(2),
      p.currentStock,
      (p.costPrice * p.currentStock).toFixed(2)
    ]);
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    this.downloadCSV(csvContent, 'it_hub_inventory_valuation_report.csv');
  },

  generateStockMovementAuditReport() {
    const movements = DbAdapter.getMovements();
    const headers = ['Txn ID', 'Timestamp', 'SKU', 'Product Name', 'Type', 'Quantity', 'Warehouse', 'Operator', 'Reference'];
    const rows = movements.map(m => [
      `"${m.id}"`,
      `"${m.timestamp}"`,
      `"${m.sku}"`,
      `"${m.productName.replace(/"/g, '""')}"`,
      `"${m.type}"`,
      m.quantity,
      `"${m.warehouseName || ''}"`,
      `"${m.operator || ''}"`,
      `"${m.reference || ''}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    this.downloadCSV(csvContent, 'it_hub_stock_movement_audit.csv');
  },

  downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
};
