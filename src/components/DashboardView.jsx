import React from 'react';
import {
  DollarSign,
  Package,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  Activity,
  Layers,
  Sparkles,
  ChevronRight,
  ShieldAlert,
  Archive,
  BarChart2
} from 'lucide-react';

export function DashboardView({
  products,
  movements,
  activities,
  categories,
  onNavigate,
  onOpenMovementModal,
  onOpenProductModal
}) {
  // Financial & inventory analytics calculations
  const totalValuation = products.reduce((acc, p) => acc + (p.costPrice * p.currentStock), 0);
  const potentialRetailValue = products.reduce((acc, p) => acc + (p.sellingPrice * p.currentStock), 0);
  const totalUnits = products.reduce((acc, p) => acc + p.currentStock, 0);

  const lowStockItems = products.filter(p => p.currentStock > 0 && p.currentStock <= p.minThreshold);
  const criticalItems = products.filter(p => p.currentStock > 0 && p.currentStock <= Math.ceil(p.minThreshold * 0.4));
  const outOfStockItems = products.filter(p => p.currentStock === 0);

  const totalInboundMovements = movements.filter(m => m.type === 'Stock In').length;
  const totalOutboundMovements = movements.filter(m => m.type === 'Stock Out').length;

  const avgMargin = products.length > 0
    ? (products.reduce((acc, p) => acc + ((p.sellingPrice - p.costPrice) / p.sellingPrice), 0) / products.length) * 100
    : 0;

  // Category breakdown
  const categoryCounts = categories.map(cat => {
    const prods = products.filter(p => p.category === cat.name);
    const count = prods.reduce((acc, p) => acc + p.currentStock, 0);
    const value = prods.reduce((acc, p) => acc + (p.costPrice * p.currentStock), 0);
    return {
      ...cat,
      units: count,
      value,
      percentage: totalUnits > 0 ? Math.round((count / totalUnits) * 100) : 0
    };
  });

  return (
    <div className="dashboard-view">
      {/* Top Welcome & KPI Header */}
      <div className="view-header">
        <div className="view-header-title">
          <h1>
            <Activity size={26} color="var(--accent-cyan)" />
            Enterprise Inventory & Operations Radar
          </h1>
          <p>Real-time telemetry, SKU valuation, warehouse logistics, and restock velocity.</p>
        </div>

        <div className="view-actions">
          <button
            id="dash-quick-stock-in-btn"
            className="btn btn-secondary"
            onClick={() => onOpenMovementModal({ type: 'Stock In' })}
          >
            <ArrowDownLeft size={16} color="var(--status-success)" />
            <span>Receive Inbound</span>
          </button>

          <button
            id="dash-quick-stock-out-btn"
            className="btn btn-secondary"
            onClick={() => onOpenMovementModal({ type: 'Stock Out' })}
          >
            <ArrowUpRight size={16} color="var(--accent-cyan)" />
            <span>Dispatch Outbound</span>
          </button>

          <button
            id="dash-add-product-btn"
            className="btn btn-primary"
            onClick={() => onOpenProductModal(null)}
          >
            <Package size={16} />
            <span>New Master SKU</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="metrics-grid">
        {/* Total Stock Valuation */}
        <div className="metric-card" style={{ '--card-accent': 'var(--accent-cyan)' }}>
          <div className="metric-top">
            <span className="metric-label">Asset Valuation (Cost)</span>
            <div className="metric-icon-wrap" style={{ '--metric-bg': 'var(--accent-cyan-dim)', '--metric-color': 'var(--accent-cyan)' }}>
              <DollarSign size={20} />
            </div>
          </div>
          <div className="metric-value font-mono">
            ${totalValuation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="metric-footer">
            <span>Retail Value: ${potentialRetailValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
            <span className="metric-trend positive">
              <TrendingUp size={13} /> {avgMargin.toFixed(1)}% margin
            </span>
          </div>
        </div>

        {/* Active SKUs */}
        <div className="metric-card" style={{ '--card-accent': 'var(--accent-indigo)' }}>
          <div className="metric-top">
            <span className="metric-label">Catalog SKUs</span>
            <div className="metric-icon-wrap" style={{ '--metric-bg': 'var(--accent-indigo-dim)', '--metric-color': 'var(--accent-indigo)' }}>
              <Package size={20} />
            </div>
          </div>
          <div className="metric-value font-mono">{products.length}</div>
          <div className="metric-footer">
            <span>{totalUnits.toLocaleString()} Physical Units</span>
            <span style={{ color: 'var(--accent-indigo)', fontWeight: 600 }}>Across 4 Hubs</span>
          </div>
        </div>

        {/* Low Stock & Critical Warnings */}
        <div
          className="metric-card"
          style={{
            '--card-accent': (criticalItems.length > 0 || outOfStockItems.length > 0) ? 'var(--status-danger)' : 'var(--status-warning)',
            cursor: 'pointer'
          }}
          onClick={() => onNavigate('low-stock')}
          title="Click to view Low Stock Reorder Radar"
        >
          <div className="metric-top">
            <span className="metric-label">Reorder Attention</span>
            <div
              className="metric-icon-wrap"
              style={{
                '--metric-bg': (criticalItems.length > 0 || outOfStockItems.length > 0) ? 'var(--status-danger-dim)' : 'var(--status-warning-dim)',
                '--metric-color': (criticalItems.length > 0 || outOfStockItems.length > 0) ? 'var(--status-danger)' : 'var(--status-warning)'
              }}
            >
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="metric-value font-mono" style={{ color: (criticalItems.length > 0 || outOfStockItems.length > 0) ? 'var(--status-danger)' : 'var(--status-warning)' }}>
            {lowStockItems.length + outOfStockItems.length}
          </div>
          <div className="metric-footer">
            <span>{outOfStockItems.length} Out of Stock // {criticalItems.length} Critical</span>
            <span style={{ color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '2px' }}>
              Radar <ChevronRight size={13} />
            </span>
          </div>
        </div>

        {/* Stock Movement Velocity */}
        <div className="metric-card" style={{ '--card-accent': 'var(--status-success)' }}>
          <div className="metric-top">
            <span className="metric-label">Stock Movement Log</span>
            <div className="metric-icon-wrap" style={{ '--metric-bg': 'var(--status-success-dim)', '--metric-color': 'var(--status-success)' }}>
              <Activity size={20} />
            </div>
          </div>
          <div className="metric-value font-mono">{movements.length}</div>
          <div className="metric-footer">
            <span>+{totalInboundMovements} Inbound Receipts</span>
            <span style={{ color: 'var(--accent-cyan)' }}>-{totalOutboundMovements} Dispatches</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Charts & Activity Feeds */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '24px', marginBottom: '28px' }}>
        {/* Left Column: Movement Velocity Chart & Category Breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Movement Flow Visualizer */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>Stock Movement Velocity</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Recent inventory transaction volume</p>
              </div>
              <span className="badge badge-cyan">Real-time Telemetry</span>
            </div>

            {/* Custom Interactive SVG Movement Chart */}
            <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', padding: '20px 16px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '140px', gap: '12px', paddingBottom: '8px' }}>
                {[
                  { day: 'Mon', inbound: 45, outbound: 28 },
                  { day: 'Tue', inbound: 60, outbound: 35 },
                  { day: 'Wed', inbound: 30, outbound: 50 },
                  { day: 'Thu', inbound: 85, outbound: 42 },
                  { day: 'Fri', inbound: 70, outbound: 65 },
                  { day: 'Sat', inbound: 25, outbound: 18 },
                  { day: 'Sun (Today)', inbound: 50, outbound: 19 }
                ].map((item, idx) => (
                  <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', height: '100%', justifyContent: 'flex-end' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', width: '100%', justifyContent: 'center' }}>
                      {/* Inbound bar */}
                      <div
                        style={{
                          width: '12px',
                          height: `${(item.inbound / 100) * 110}px`,
                          background: 'linear-gradient(180deg, var(--status-success) 0%, rgba(16, 185, 129, 0.4) 100%)',
                          borderRadius: '4px 4px 0 0',
                          transition: 'height 0.3s ease'
                        }}
                        title={`Inbound: +${item.inbound} units`}
                      />
                      {/* Outbound bar */}
                      <div
                        style={{
                          width: '12px',
                          height: `${(item.outbound / 100) * 110}px`,
                          background: 'linear-gradient(180deg, var(--accent-cyan) 0%, rgba(0, 229, 255, 0.4) 100%)',
                          borderRadius: '4px 4px 0 0',
                          transition: 'height 0.3s ease'
                        }}
                        title={`Outbound: -${item.outbound} units`}
                      />
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.day}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '12px', fontSize: '12px', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                  <span style={{ width: '10px', height: '10px', background: 'var(--status-success)', borderRadius: '2px' }} />
                  Stock In / Receipts
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                  <span style={{ width: '10px', height: '10px', background: 'var(--accent-cyan)', borderRadius: '2px' }} />
                  Stock Out / Orders
                </span>
              </div>
            </div>
          </div>

          {/* Category Stock Distribution */}
          <div className="card">
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '14px' }}>
              Inventory Distribution by Category
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {categoryCounts.map(cat => (
                <div key={cat.id} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{cat.name}</span>
                    <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>
                      {cat.units} units (${cat.value.toLocaleString()})
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '7px', background: 'var(--bg-surface)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${cat.percentage}%`,
                        height: '100%',
                        background: cat.color || 'var(--accent-cyan)',
                        borderRadius: '4px',
                        transition: 'width 0.4s ease'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Reorder Alert Watchlist & Live Activity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Urgent Low-Stock Watchlist */}
          <div className="card" style={{ borderLeft: '4px solid var(--status-warning)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={18} color="var(--status-warning)" />
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>Urgent Reorder Watchlist</h3>
              </div>
              <button
                className="btn btn-outline"
                style={{ padding: '4px 10px', fontSize: '11px' }}
                onClick={() => onNavigate('low-stock')}
              >
                View All ({lowStockItems.length + outOfStockItems.length})
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[...outOfStockItems, ...criticalItems, ...lowStockItems].slice(0, 4).map(item => (
                <div key={item.id} style={{
                  padding: '10px 12px',
                  background: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  border: '1px solid var(--border-subtle)'
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-main)' }}>{item.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }} className="font-mono">
                      {item.sku} // Min: {item.minThreshold}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className={`badge ${item.currentStock === 0 ? 'badge-critical' : 'badge-low-stock'}`}>
                      {item.currentStock === 0 ? 'STOCKOUT' : `${item.currentStock} left`}
                    </span>
                    <button
                      className="btn btn-primary"
                      style={{ padding: '4px 8px', fontSize: '11px' }}
                      onClick={() => onOpenMovementModal({ productId: item.id, type: 'Stock In' })}
                    >
                      Restock
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Audit Log */}
          <div className="card">
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={16} color="var(--accent-cyan)" />
              Live Operations Activity Feed
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {activities.slice(0, 6).map(act => (
                <div key={act.id} style={{
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-start',
                  fontSize: '12.5px',
                  paddingBottom: '10px',
                  borderBottom: '1px solid var(--border-subtle)'
                }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    marginTop: '5px',
                    flexShrink: 0,
                    background: act.type === 'in' ? 'var(--status-success)' :
                                act.type === 'out' ? 'var(--accent-cyan)' :
                                act.type === 'danger' ? 'var(--status-danger)' : 'var(--status-warning)'
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'var(--text-main)' }}>{act.text}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{act.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
