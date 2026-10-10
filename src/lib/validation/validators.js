export const Validators = {
  validateProduct(formData) {
    const errors = {};
    if (!formData.name || !formData.name.trim()) {
      errors.name = 'Product title is required';
    }
    if (!formData.sku || !formData.sku.trim()) {
      errors.sku = 'SKU code is required';
    }
    const cost = parseFloat(formData.costPrice);
    if (isNaN(cost) || cost < 0) {
      errors.costPrice = 'Valid cost basis (>= 0) required';
    }
    const price = parseFloat(formData.sellingPrice);
    if (isNaN(price) || price < 0) {
      errors.sellingPrice = 'Valid selling price (>= 0) required';
    }
    const stock = parseInt(formData.currentStock, 10);
    if (isNaN(stock) || stock < 0) {
      errors.currentStock = 'Current stock count must be 0 or greater';
    }
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  },

  validateStockMovement(movementData, currentStock) {
    const errors = {};
    const qty = parseInt(movementData.quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      errors.quantity = 'Quantity must be positive integer';
    }
    if (movementData.type === 'Stock Out' && qty > currentStock) {
      errors.quantity = `Insufficient stock: only ${currentStock} units available for dispatch`;
    }
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
};
