import React, { useState, useMemo } from 'react';
import {
  Package,
  Plus,
  Filter,
  ArrowUpDown,
  Search,
  Edit2,
  Trash2,
  ArrowDownRight,
  LayoutGrid,
  List,
  Barcode,
  Layers,
  MapPin,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Copy,
  Check
} from 'lucide-react';

export function ProductsView({
  products,
  categories,
  warehouses,
  onOpenProductModal,
  onOpenMovementModal,
  onDeleteProduct,
  searchTerm,
  setSearchTerm
}) {
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedWarehouse, setSelectedWarehouse] = useState('ALL');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
  const [sortBy, setSortBy] = useState('name'); // 'name' | 'stock' | 'price' | 'sku'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' | 'desc'
  const [copiedSku, setCopiedSku] = useState(null);

  // Filter & Sort Logic
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = !searchTerm ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.barcode && p.barcode.includes(searchTerm)) ||
        (p.binLocation && p.binLocation.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
      const matchStatus = selectedStatus === 'ALL' || p.status === selectedStatus;
      const matchWarehouse = selectedWarehouse === 'ALL' || p.warehouseId === selectedWarehouse;

      return matchSearch && matchCategory && matchStatus && matchWarehouse;
    }).sort((a, b) => {
      let valA, valB;
      if (sortBy === 'name') {
        valA = a.name.toLowerCase();
        valB = b.name.toLowerCase();
      } else if (sortBy === 'sku') {
        valA = a.sku.toLowerCase();
        valB = b.sku.toLowerCase();
      } else if (sortBy === 'stock') {
        valA = a.currentStock;
        valB = b.currentStock;
      } else if (sortBy === 'price') {
        valA = a.sellingPrice;
        valB = b.sellingPrice;
      }
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [products, searchTerm, selectedCategory, selectedStatus, selectedWarehouse, sortBy, sortOrder]);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedSku(id);
    setTimeout(() => setCopiedSku(null), 1500);
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'In Stock': return 'badge-in-stock';
      case 'Low Stock': return 'badge-low-stock';
      case 'Critical Low': return 'badge-critical';
      case 'Out of Stock': return 'badge-out-of-stock';
      default: return 'badge-cyan';
    }
  };

  return (
    <div className="products-view">
      {/* Header Banner */}
      <div className="view-header">
        <div className="view-header-title">
          <h1>
            <Package size={26} color="var(--accent-cyan)" />
            Inventory & SKU Master Catalog
          </h1>
          <p>Full lifecycle tracking, barcode indexes, bin coordinates, and pricing tiers.</p>
        </div>

        <div className="view-actions">
          <button
            id="create-product-btn"
            className="btn btn-primary"
            onClick={() => onOpenProductModal(null)}
          >
            <Plus size={16} />
            <span>Create New SKU</span>
          </button>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          {/* Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flex: 1 }}>
            {/* Category Filter */}
            <select
              id="filter-category-select"
              className="form-select"
              style={{ width: 'auto', minWidth: '170px', padding: '8px 12px' }}
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="ALL">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              id="filter-status-select"
              className="form-select"
              style={{ width: 'auto', minWidth: '150px', padding: '8px 12px' }}
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="ALL">All Stock Statuses</option>
              <option value="In Stock">In Stock</option>
              <option value="Low Stock">Low Stock</option>
              <option value="Critical Low">Critical Low</option>
              <option value="Out of Stock">Out of Stock</option>
            </select>

            {/* Warehouse Filter */}
            <select
              id="filter-warehouse-select"
              className="form-select"
              style={{ width: 'auto', minWidth: '180px', padding: '8px 12px' }}
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
            >
              <option value="ALL">All Warehouse Hubs</option>
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>

            {/* Clear Filters Button */}
            {(selectedCategory !== 'ALL' || selectedStatus !== 'ALL' || selectedWarehouse !== 'ALL' || searchTerm) && (
              <button
                className="btn btn-outline"
                style={{ padding: '7px 12px', fontSize: '12px' }}
                onClick={() => {
                  setSelectedCategory('ALL');
                  setSelectedStatus('ALL');
                  setSelectedWarehouse('ALL');
                  setSearchTerm('');
                }}
              >
                Reset Filters
              </button>
            )}
          </div>

          {/* Right: Sorting & View Mode Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Sort by:</span>
              <select
                className="form-select"
                style={{ width: 'auto', padding: '6px 10px', fontSize: '13px' }}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="name">Product Name</option>
                <option value="sku">SKU Code</option>
                <option value="stock">Stock Count</option>
                <option value="price">Selling Price</option>
              </select>

              <button
                className="btn-icon"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
              >
                <ArrowUpDown size={15} />
              </button>
            </div>

            {/* View Mode */}
            <div style={{ display: 'flex', background: 'var(--bg-surface)', padding: '2px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <button
                className="btn-icon"
                style={{
                  background: viewMode === 'table' ? 'var(--bg-secondary)' : 'transparent',
                  color: viewMode === 'table' ? 'var(--accent-cyan)' : 'var(--text-muted)',
                  border: 'none',
                  borderRadius: '4px'
                }}
                onClick={() => setViewMode('table')}
                title="Table List View"
              >
                <List size={16} />
              </button>
              <button
                className="btn-icon"
                style={{
                  background: viewMode === 'grid' ? 'var(--bg-secondary)' : 'transparent',
                  color: viewMode === 'grid' ? 'var(--accent-cyan)' : 'var(--text-muted)',
                  border: 'none',
                  borderRadius: '4px'
                }}
                onClick={() => setViewMode('grid')}
                title="Grid Cards View"
              >
                <LayoutGrid size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Results count banner */}
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px', display: 'flex', justifyContent: 'space-between' }}>
          <span>Showing <strong>{filteredProducts.length}</strong> of <strong>{products.length}</strong> products</span>
          {searchTerm && <span>Search filter: "{searchTerm}"</span>}
        </div>
      </div>

      {/* Main Products Display (Table or Grid) */}
      {filteredProducts.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
          <Package size={48} color="var(--border-medium)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '18px', color: 'var(--text-main)', marginBottom: '6px' }}>No matching products found</h3>
          <p style={{ fontSize: '13px', maxWidth: '400px', margin: '0 auto 16px' }}>
            Try adjusting your search criteria, clearing category filters, or add a new SKU.
          </p>
          <button className="btn btn-primary" onClick={() => onOpenProductModal(null)}>
            <Plus size={16} /> Add First Product
          </button>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="table-container">
          <table className="nexus-table">
            <thead>
              <tr>
                <th>Product & SKU</th>
                <th>Category</th>
                <th>Warehouse & Bin</th>
                <th>Cost / Price (Margin)</th>
                <th>Stock Level</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(product => {
                const warehouse = warehouses.find(w => w.id === product.warehouseId);
                const margin = product.sellingPrice > 0
                  ? (((product.sellingPrice - product.costPrice) / product.sellingPrice) * 100).toFixed(0)
                  : 0;

                const percentCapacity = product.maxCapacity > 0
                  ? Math.min(100, Math.round((product.currentStock / product.maxCapacity) * 100))
                  : 50;

                return (
                  <tr key={product.id}>
                    {/* SKU & Product Name */}
                    <td>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '14px' }}>
                          {product.name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                          <span className="font-mono" style={{ fontSize: '11.5px', color: 'var(--accent-cyan)' }}>
                            {product.sku}
                          </span>
                          <button
                            onClick={() => copyToClipboard(product.sku, product.id)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
                            title="Copy SKU code"
                          >
                            {copiedSku === product.id ? <Check size={12} color="var(--status-success)" /> : <Copy size={12} />}
                          </button>
                          {product.barcode && (
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                              <Barcode size={12} /> {product.barcode}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td>
                      <span className="badge badge-indigo">
                        {product.category}
                      </span>
                    </td>

                    {/* Warehouse & Bin */}
                    <td>
                      <div style={{ fontSize: '13px', color: 'var(--text-main)' }}>
                        {warehouse ? warehouse.name : 'Unassigned'}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <MapPin size={11} color="var(--accent-cyan)" />
                        {product.binLocation || 'No bin assigned'}
                      </div>
                    </td>

                    {/* Cost / Price / Margin */}
                    <td>
                      <div style={{ fontSize: '13px', color: 'var(--text-main)', fontWeight: 600 }} className="font-mono">
                        ${product.sellingPrice.toFixed(2)}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }} className="font-mono">
                        Cost: ${product.costPrice.toFixed(2)} ({margin}% margin)
                      </div>
                    </td>

                    {/* Stock Level with Gauge */}
                    <td style={{ minWidth: '150px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span className="font-mono" style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text-main)' }}>
                          {product.currentStock} <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)' }}>{product.unit}</span>
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          min: {product.minThreshold}
                        </span>
                      </div>
                      <div style={{ width: '100%', height: '5px', background: 'var(--bg-surface)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${percentCapacity}%`,
                            height: '100%',
                            background: product.currentStock === 0 ? 'var(--text-muted)' :
                                        product.currentStock <= product.minThreshold ? 'var(--status-warning)' : 'var(--status-success)',
                            borderRadius: '3px'
                          }}
                        />
                      </div>
                    </td>

                    {/* Status Pill */}
                    <td>
                      <span className={`badge ${getStatusBadgeClass(product.status)}`}>
                        {product.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '6px 10px', fontSize: '12px' }}
                          onClick={() => onOpenMovementModal({ productId: product.id, type: 'Stock In' })}
                          title="Record Stock Movement"
                        >
                          <ArrowDownRight size={14} color="var(--accent-cyan)" />
                          <span>Stock</span>
                        </button>
                        <button
                          className="btn-icon"
                          onClick={() => onOpenProductModal(product)}
                          title="Edit Product Details"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="btn-icon"
                          style={{ color: 'var(--status-danger)' }}
                          onClick={() => onDeleteProduct(product.id)}
                          title="Delete SKU"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* GRID CARD VIEW */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '20px' }}>
          {filteredProducts.map(product => {
            const warehouse = warehouses.find(w => w.id === product.warehouseId);
            const margin = product.sellingPrice > 0
              ? (((product.sellingPrice - product.costPrice) / product.sellingPrice) * 100).toFixed(0)
              : 0;

            return (
              <div key={product.id} className="card card-hover" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <span className="badge badge-indigo">{product.category}</span>
                    <span className={`badge ${getStatusBadgeClass(product.status)}`}>{product.status}</span>
                  </div>

                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                    {product.name}
                  </h3>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
                    <span className="font-mono" style={{ fontSize: '12px', color: 'var(--accent-cyan)' }}>{product.sku}</span>
                    <button
                      onClick={() => copyToClipboard(product.sku, product.id)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
                    >
                      {copiedSku === product.id ? <Check size={12} color="var(--status-success)" /> : <Copy size={12} />}
                    </button>
                  </div>

                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px', minHeight: '36px' }}>
                    {product.description || 'Enterprise catalog SKU.'}
                  </p>

                  <div style={{ background: 'var(--bg-surface)', padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Current Inventory</span>
                      <span className="font-mono" style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-main)' }}>
                        {product.currentStock} {product.unit}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                      <span>Min Threshold: {product.minThreshold}</span>
                      <span>Max Cap: {product.maxCapacity}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Selling Price:</span>
                    <span className="font-mono" style={{ fontWeight: 700, color: 'var(--text-main)' }}>${product.sellingPrice.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    <span>Cost: ${product.costPrice.toFixed(2)}</span>
                    <span style={{ color: 'var(--status-success)' }}>{margin}% margin</span>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '14px', marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {warehouse ? warehouse.city : 'All Hubs'}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '5px 9px', fontSize: '11.5px' }}
                      onClick={() => onOpenMovementModal({ productId: product.id, type: 'Stock In' })}
                    >
                      <ArrowDownRight size={13} color="var(--accent-cyan)" /> Stock
                    </button>
                    <button
                      className="btn-icon"
                      onClick={() => onOpenProductModal(product)}
                      title="Edit"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      className="btn-icon"
                      style={{ color: 'var(--status-danger)' }}
                      onClick={() => onDeleteProduct(product.id)}
                      title="Delete"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
