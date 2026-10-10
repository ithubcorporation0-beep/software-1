import React, { useState, useEffect } from 'react';
import {
  Package,
  X,
  Sparkles,
  Barcode,
  Layers,
  MapPin,
  DollarSign,
  TrendingUp,
  Truck
} from 'lucide-react';

export function ProductModal({
  isOpen,
  onClose,
  onSave,
  productToEdit,
  categories,
  warehouses,
  suppliers
}) {
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode: '',
    category: categories[0]?.name || '',
    warehouseId: warehouses[0]?.id || '',
    binLocation: '',
    costPrice: '',
    sellingPrice: '',
    currentStock: '0',
    minThreshold: '10',
    maxCapacity: '100',
    unit: 'Units',
    supplierId: suppliers[0]?.id || '',
    description: ''
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (productToEdit) {
      setFormData({
        name: productToEdit.name || '',
        sku: productToEdit.sku || '',
        barcode: productToEdit.barcode || '',
        category: productToEdit.category || (categories[0]?.name || ''),
        warehouseId: productToEdit.warehouseId || (warehouses[0]?.id || ''),
        binLocation: productToEdit.binLocation || '',
        costPrice: productToEdit.costPrice ? String(productToEdit.costPrice) : '',
        sellingPrice: productToEdit.sellingPrice ? String(productToEdit.sellingPrice) : '',
        currentStock: productToEdit.currentStock !== undefined ? String(productToEdit.currentStock) : '0',
        minThreshold: productToEdit.minThreshold !== undefined ? String(productToEdit.minThreshold) : '10',
        maxCapacity: productToEdit.maxCapacity !== undefined ? String(productToEdit.maxCapacity) : '100',
        unit: productToEdit.unit || 'Units',
        supplierId: productToEdit.supplierId || (suppliers[0]?.id || ''),
        description: productToEdit.description || ''
      });
    } else {
      setFormData({
        name: '',
        sku: '',
        barcode: '',
        category: categories[0]?.name || '',
        warehouseId: warehouses[0]?.id || '',
        binLocation: '',
        costPrice: '',
        sellingPrice: '',
        currentStock: '0',
        minThreshold: '10',
        maxCapacity: '100',
        unit: 'Units',
        supplierId: suppliers[0]?.id || '',
        description: ''
      });
    }
    setErrors({});
  }, [productToEdit, isOpen, categories, warehouses, suppliers]);

  if (!isOpen) return null;

  const generateRandomSKU = () => {
    const selectedCat = categories.find(c => c.name === formData.category);
    const prefix = selectedCat ? selectedCat.code : 'SKU';
    const rand = Math.floor(1000 + Math.random() * 9000);
    const suffix = formData.name ? formData.name.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, '') : 'GEN';
    setFormData(prev => ({
      ...prev,
      sku: `${prefix}-${suffix || 'MAT'}-${rand}`
    }));
  };

  const generateBarcode = () => {
    const code = '79' + Math.floor(1000000000 + Math.random() * 9000000000);
    setFormData(prev => ({ ...prev, barcode: code }));
  };

  // Profit Margin calculation
  const cost = parseFloat(formData.costPrice) || 0;
  const price = parseFloat(formData.sellingPrice) || 0;
  const marginPercent = price > 0 ? (((price - cost) / price) * 100).toFixed(1) : 0;
  const profitPerUnit = (price - cost).toFixed(2);

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = 'Product name is required';
    if (!formData.sku.trim()) newErrors.sku = 'SKU identifier is required';
    if (!formData.costPrice || isNaN(formData.costPrice) || parseFloat(formData.costPrice) < 0) {
      newErrors.costPrice = 'Valid cost price is required';
    }
    if (!formData.sellingPrice || isNaN(formData.sellingPrice) || parseFloat(formData.sellingPrice) < 0) {
      newErrors.sellingPrice = 'Valid selling price is required';
    }
    if (isNaN(formData.currentStock) || parseInt(formData.currentStock) < 0) {
      newErrors.currentStock = 'Valid stock count is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSave({
      ...formData,
      costPrice: parseFloat(formData.costPrice),
      sellingPrice: parseFloat(formData.sellingPrice),
      currentStock: parseInt(formData.currentStock, 10),
      minThreshold: parseInt(formData.minThreshold, 10) || 10,
      maxCapacity: parseInt(formData.maxCapacity, 10) || 100
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px' }}>
        <div className="modal-header">
          <div className="modal-title">
            <Package size={20} color="var(--accent-cyan)" />
            <span>{productToEdit ? 'Edit SKU Specifications' : 'Create New Product SKU'}</span>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Row 1: Product Name */}
            <div className="form-group">
              <label className="form-label">
                <span>Product / Item Name *</span>
                {errors.name && <span style={{ color: 'var(--status-danger)' }}>{errors.name}</span>}
              </label>
              <input
                id="product-name-input"
                type="text"
                className="form-input"
                placeholder="e.g. Neural Accelerator Core H100"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            {/* Row 2: SKU & Barcode */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <div className="form-label">
                  <span>SKU Code *</span>
                  <button
                    type="button"
                    onClick={generateRandomSKU}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                  >
                    <Sparkles size={11} /> Auto-Generate
                  </button>
                </div>
                <input
                  id="product-sku-input"
                  type="text"
                  className="form-input font-mono"
                  placeholder="e.g. ELEC-GPU-H100"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                />
                {errors.sku && <div style={{ fontSize: '11px', color: 'var(--status-danger)' }}>{errors.sku}</div>}
              </div>

              <div className="form-group">
                <div className="form-label">
                  <span>Barcode / UPC (Optional)</span>
                  <button
                    type="button"
                    onClick={generateBarcode}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                  >
                    <Barcode size={11} /> Generate
                  </button>
                </div>
                <input
                  type="text"
                  className="form-input font-mono"
                  placeholder="e.g. 793847291048"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                />
              </div>
            </div>

            {/* Row 3: Category & Warehouse */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  className="form-select"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Warehouse Depot</label>
                <select
                  className="form-select"
                  value={formData.warehouseId}
                  onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
                >
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name} ({w.city})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 4: Bin Location & Supplier */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Warehouse Bin / Shelf Location</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Aisle 04 // Shelf B-12"
                  value={formData.binLocation}
                  onChange={(e) => setFormData({ ...formData, binLocation: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Primary Vendor / Supplier</label>
                <select
                  className="form-select"
                  value={formData.supplierId}
                  onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                >
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 5: Financials - Cost Price, Selling Price & Margin Display */}
            <div style={{
              background: 'var(--bg-surface)',
              padding: '14px 16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '16px', alignItems: 'center' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Cost Price ($) *</label>
                  <input
                    id="cost-price-input"
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-input font-mono"
                    placeholder="0.00"
                    value={formData.costPrice}
                    onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                  />
                  {errors.costPrice && <div style={{ fontSize: '11px', color: 'var(--status-danger)' }}>{errors.costPrice}</div>}
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Selling Price ($) *</label>
                  <input
                    id="selling-price-input"
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-input font-mono"
                    placeholder="0.00"
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                  />
                  {errors.sellingPrice && <div style={{ fontSize: '11px', color: 'var(--status-danger)' }}>{errors.sellingPrice}</div>}
                </div>

                <div style={{ fontSize: '12px', borderLeft: '1px solid var(--border-medium)', paddingLeft: '14px' }}>
                  <div style={{ color: 'var(--text-secondary)' }}>Calculated Profit Margin:</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: marginPercent > 0 ? 'var(--status-success)' : 'var(--text-muted)' }} className="font-mono">
                    {marginPercent}%
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    +${profitPerUnit} unit profit
                  </div>
                </div>
              </div>
            </div>

            {/* Row 6: Stock Tracking Parameters */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Current Stock *</label>
                <input
                  id="current-stock-input"
                  type="number"
                  min="0"
                  className="form-input font-mono"
                  value={formData.currentStock}
                  onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Min Threshold</label>
                <input
                  type="number"
                  min="0"
                  className="form-input font-mono"
                  value={formData.minThreshold}
                  onChange={(e) => setFormData({ ...formData, minThreshold: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Max Capacity</label>
                <input
                  type="number"
                  min="1"
                  className="form-input font-mono"
                  value={formData.maxCapacity}
                  onChange={(e) => setFormData({ ...formData, maxCapacity: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Unit Type</label>
                <select
                  className="form-select"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                >
                  <option value="Units">Units</option>
                  <option value="Sets">Sets</option>
                  <option value="Packs">Packs</option>
                  <option value="Bars">Bars</option>
                  <option value="Trays">Trays</option>
                  <option value="Boxes">Boxes</option>
                  <option value="Kilograms">Kg</option>
                </select>
              </div>
            </div>

            {/* Row 7: Description */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Technical Notes & Description</label>
              <textarea
                className="form-textarea"
                rows="2"
                placeholder="Product technical specifications, handling requirements, or hazardous material notes..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button id="save-product-submit-btn" type="submit" className="btn btn-primary">
              {productToEdit ? 'Update SKU Specifications' : 'Save New Master SKU'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
