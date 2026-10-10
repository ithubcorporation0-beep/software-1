import React from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  ArrowDownLeft,
  Truck,
  CheckCircle,
  FileCheck,
  Package,
  Layers,
  Clock,
  DollarSign
} from 'lucide-react';

export function LowStockView({
  products,
  suppliers,
  warehouses,
  onOpenMovementModal,
  onSimulatePO
}) {
  const attentionItems = products.filter(p => p.currentStock <= p.minThreshold);
  const outOfStockItems = products.filter(p => p.currentStock === 0);
  const criticalItems = products.filter(p => p.currentStock > 0 && p.currentStock <= Math.ceil(p.minThreshold * 0.4));
  const moderateLow = products.filter(p => p.currentStock > Math.ceil(p.minThreshold * 0.4) && p.currentStock <= p.minThreshold);

  // Total investment needed to replenish all below-threshold items to max capacity
  const totalReplenishmentInvestment = attentionItems.reduce((acc, p) => {
    const needed = Math.max(0, p.maxCapacity - p.currentStock);
    return acc + (needed * p.costPrice);
  }, 0);

  return (
    <div className="low-stock-view">
      <div className="view-header">
        <div className="view-header-title">
          <h1>
            <AlertTriangle size={26} color="var(--status-warning)" />
            Intelligent Reorder Radar & Stockout Defense
          </h1>
          <p>Automated replenishment algorithms, supplier lead-time buffers, and purchase order drafting.</p>
        </div>

        <div className="view-actions">
          <button
            id="batch-po-btn"
            className="btn btn-primary"
            onClick={() => onSimulatePO(attentionItems)}
            disabled={attentionItems.length === 0}
          >
            <FileCheck size={16} />
            <span>Generate Batch Restock PO ({attentionItems.length})</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="metrics-grid">
        <div className="metric-card" style={{ '--card-accent': 'var(--status-danger)' }}>
          <div className="metric-top">
            <span className="metric-label">Stockout Emergencies</span>
            <div className="metric-icon-wrap" style={{ '--metric-bg': 'var(--status-danger-dim)', '--metric-color': 'var(--status-danger)' }}>
              <ShieldAlert size={20} />
            </div>
          </div>
          <div className="metric-value font-mono" style={{ color: 'var(--status-danger)' }}>
            {outOfStockItems.length}
          </div>
          <div className="metric-footer">
            <span>Zero physical units available</span>
            <span style={{ color: 'var(--status-danger)', fontWeight: 700 }}>Immediate Action</span>
          </div>
        </div>

        <div className="metric-card" style={{ '--card-accent': 'var(--status-warning)' }}>
          <div className="metric-top">
            <span className="metric-label">Critical Depletion (&lt;40% min)</span>
            <div className="metric-icon-wrap" style={{ '--metric-bg': 'var(--status-warning-dim)', '--metric-color': 'var(--status-warning)' }}>
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="metric-value font-mono" style={{ color: 'var(--status-warning)' }}>
            {criticalItems.length}
          </div>
          <div className="metric-footer">
            <span>High probability of stockout within 48h</span>
            <span style={{ color: 'var(--status-warning)' }}>Warning</span>
          </div>
        </div>

        <div className="metric-card" style={{ '--card-accent': 'var(--accent-cyan)' }}>
          <div className="metric-top">
            <span className="metric-label">Est. Replenishment Capital</span>
            <div className="metric-icon-wrap" style={{ '--metric-bg': 'var(--accent-cyan-dim)', '--metric-color': 'var(--accent-cyan)' }}>
              <DollarSign size={20} />
            </div>
          </div>
          <div className="metric-value font-mono">
            ${totalReplenishmentInvestment.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="metric-footer">
            <span>Total to reach max capacity</span>
            <span style={{ color: 'var(--accent-cyan)' }}>{attentionItems.length} SKUs affected</span>
          </div>
        </div>
      </div>

      {/* Reorder Recommendation Table */}
      {attentionItems.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text-muted)' }}>
          <CheckCircle size={56} color="var(--status-success)" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '20px', color: 'var(--text-main)', marginBottom: '8px' }}>
            All Stock Levels Are Healthy & Balanced
          </h3>
          <p style={{ fontSize: '14px', maxWidth: '440px', margin: '0 auto' }}>
            Every product in your catalog is currently stocked above its safety threshold. No urgent supplier replenishment required.
          </p>
        </div>
      ) : (
        <div className="table-container">
          <table className="nexus-table">
            <thead>
              <tr>
                <th>Urgency</th>
                <th>SKU & Product</th>
                <th>Current / Min</th>
                <th>Suggested Order Qty</th>
                <th>Est. Order Cost</th>
                <th>Primary Supplier</th>
                <th>Lead Time</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {attentionItems.map(item => {
                const supplier = suppliers.find(s => s.id === item.supplierId);
                const warehouse = warehouses.find(w => w.id === item.warehouseId);
                const recommendedQty = Math.max(1, item.maxCapacity - item.currentStock);
                const estCost = (recommendedQty * item.costPrice);

                const isZero = item.currentStock === 0;
                const isCritical = !isZero && item.currentStock <= Math.ceil(item.minThreshold * 0.4);

                return (
                  <tr key={item.id}>
                    {/* Urgency Badge */}
                    <td>
                      <span className={`badge ${
                        isZero ? 'badge-critical' : isCritical ? 'badge-low-stock' : 'badge-cyan'
                      }`}>
                        {isZero ? 'OUT OF STOCK' : isCritical ? 'CRITICAL' : 'REORDER'}
                      </span>
                    </td>

                    {/* SKU & Name */}
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{item.name}</div>
                      <div className="font-mono" style={{ fontSize: '11.5px', color: 'var(--accent-cyan)' }}>
                        {item.sku} // {warehouse ? warehouse.city : 'Main Depot'}
                      </div>
                    </td>

                    {/* Current vs Min */}
                    <td>
                      <div className="font-mono" style={{ fontWeight: 800, color: isZero ? 'var(--status-danger)' : 'var(--status-warning)' }}>
                        {item.currentStock} {item.unit}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Min safety: {item.minThreshold}
                      </div>
                    </td>

                    {/* Suggested Order Qty */}
                    <td>
                      <div className="font-mono" style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '14px' }}>
                        +{recommendedQty} {item.unit}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Target: {item.maxCapacity} cap
                      </div>
                    </td>

                    {/* Est. Cost */}
                    <td>
                      <div className="font-mono" style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                        ${estCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        @ ${item.costPrice.toFixed(2)}/unit
                      </div>
                    </td>

                    {/* Supplier */}
                    <td>
                      <div style={{ fontSize: '13px', color: 'var(--text-main)', fontWeight: 600 }}>
                        {supplier ? supplier.name : 'Apex Semiconductor Systems'}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {supplier ? supplier.email : 'procurement@supplier.com'}
                      </div>
                    </td>

                    {/* Lead Time */}
                    <td>
                      <div style={{ fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
                        <Clock size={13} color="var(--accent-cyan)" />
                        <span>{supplier ? supplier.leadTimeDays : 7} days</span>
                      </div>
                    </td>

                    {/* Action */}
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-primary"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        onClick={() => onOpenMovementModal({
                          productId: item.id,
                          type: 'Stock In'
                        })}
                      >
                        <ArrowDownLeft size={14} />
                        <span>Restock</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
