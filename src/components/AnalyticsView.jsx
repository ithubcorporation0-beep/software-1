import React from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  PieChart,
  Package,
  Layers,
  ArrowUpRight,
  ShieldAlert,
  Percent,
  CheckCircle2
} from 'lucide-react';

export function AnalyticsView({
  products,
  movements,
  categories
}) {
  const totalCostValuation = products.reduce((acc, p) => acc + (p.costPrice * p.currentStock), 0);
  const totalRetailValuation = products.reduce((acc, p) => acc + (p.sellingPrice * p.currentStock), 0);
  const potentialProfit = totalRetailValuation - totalCostValuation;
  const overallMargin = totalRetailValuation > 0 ? (potentialProfit / totalRetailValuation) * 100 : 0;

  // Top 5 Highest Valuation SKUs
  const topValuationProducts = [...products]
    .map(p => ({
      ...p,
      stockValue: p.costPrice * p.currentStock
    }))
    .sort((a, b) => b.stockValue - a.stockValue)
    .slice(0, 5);

  // Top 5 Highest Margin SKUs
  const topMarginProducts = [...products]
    .map(p => ({
      ...p,
      marginPercent: p.sellingPrice > 0 ? ((p.sellingPrice - p.costPrice) / p.sellingPrice) * 100 : 0
    }))
    .sort((a, b) => b.marginPercent - a.marginPercent)
    .slice(0, 5);

  // Slow moving / Dead stock risks: In stock but zero recent outbound movements
  const outboundProductIds = new Set(movements.filter(m => m.type === 'Stock Out').map(m => m.productId));
  const stagnantItems = products.filter(p => p.currentStock > 10 && !outboundProductIds.has(p.id));

  return (
    <div className="analytics-view">
      <div className="view-header">
        <div className="view-header-title">
          <h1>
            <BarChart3 size={26} color="var(--accent-cyan)" />
            Valuation & Inventory Financial Analytics
          </h1>
          <p>Working capital allocation, gross profit margins, inventory asset liquidity, and risk audit.</p>
        </div>
      </div>

      {/* Financial Health Metric Cards */}
      <div className="metrics-grid">
        <div className="metric-card" style={{ '--card-accent': 'var(--accent-cyan)' }}>
          <div className="metric-top">
            <span className="metric-label">Asset Cost Basis</span>
            <div className="metric-icon-wrap" style={{ '--metric-bg': 'var(--accent-cyan-dim)', '--metric-color': 'var(--accent-cyan)' }}>
              <DollarSign size={20} />
            </div>
          </div>
          <div className="metric-value font-mono">
            ${totalCostValuation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="metric-footer">
            <span>Capital tied in physical stock</span>
            <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>Active Assets</span>
          </div>
        </div>

        <div className="metric-card" style={{ '--card-accent': 'var(--status-success)' }}>
          <div className="metric-top">
            <span className="metric-label">Projected Retail Yield</span>
            <div className="metric-icon-wrap" style={{ '--metric-bg': 'var(--status-success-dim)', '--metric-color': 'var(--status-success)' }}>
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="metric-value font-mono" style={{ color: 'var(--status-success)' }}>
            ${totalRetailValuation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="metric-footer">
            <span>At standard list selling prices</span>
            <span style={{ color: 'var(--status-success)', fontWeight: 600 }}>Gross Turnover</span>
          </div>
        </div>

        <div className="metric-card" style={{ '--card-accent': 'var(--accent-indigo)' }}>
          <div className="metric-top">
            <span className="metric-label">Unrealized Gross Profit</span>
            <div className="metric-icon-wrap" style={{ '--metric-bg': 'var(--accent-indigo-dim)', '--metric-color': 'var(--accent-indigo)' }}>
              <Percent size={20} />
            </div>
          </div>
          <div className="metric-value font-mono">
            ${potentialProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="metric-footer">
            <span>Overall Margin: <strong>{overallMargin.toFixed(1)}%</strong></span>
            <span style={{ color: 'var(--accent-indigo)', fontWeight: 600 }}>Spread</span>
          </div>
        </div>
      </div>

      {/* Two Columns: Top Valuation Assets & High-Margin Leaders */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Top Valuation SKUs */}
        <div className="card">
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <DollarSign size={18} color="var(--accent-cyan)" />
            Top 5 Highest Valuation Inventory Assets
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {topValuationProducts.map((p, idx) => {
              const maxVal = topValuationProducts[0]?.stockValue || 1;
              const percent = Math.round((p.stockValue / maxVal) * 100);

              return (
                <div key={p.id} style={{
                  padding: '12px',
                  background: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--text-main)' }}>
                      #{idx + 1} {p.name}
                    </div>
                    <div className="font-mono" style={{ fontWeight: 800, fontSize: '14px', color: 'var(--accent-cyan)' }}>
                      ${p.stockValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    <span className="font-mono">{p.sku} ({p.currentStock} {p.unit})</span>
                    <span>Cost: ${p.costPrice.toFixed(2)}/unit</span>
                  </div>
                  <div style={{ width: '100%', height: '5px', background: 'var(--bg-secondary)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${percent}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent-cyan), var(--accent-indigo))' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Margin Products */}
        <div className="card">
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} color="var(--status-success)" />
            Top 5 Highest Margin Performers
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {topMarginProducts.map((p, idx) => (
              <div key={p.id} style={{
                padding: '12px',
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--text-main)' }}>
                    #{idx + 1} {p.name}
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }} className="font-mono">
                    {p.sku} // Cost: ${p.costPrice.toFixed(2)} ➔ Price: ${p.sellingPrice.toFixed(2)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="font-mono" style={{ fontSize: '16px', fontWeight: 800, color: 'var(--status-success)' }}>
                    {p.marginPercent.toFixed(1)}%
                  </div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                    +${(p.sellingPrice - p.costPrice).toFixed(2)} unit profit
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Inventory Liquidity & Stagnant Stock Notice */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={16} color="var(--status-warning)" />
            Slow-Moving / Liquidity Alert Audit
          </h3>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Audit criteria: &gt;10 units in stock with 0 dispatches</span>
        </div>

        {stagnantItems.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
            {stagnantItems.map(item => (
              <div key={item.id} style={{
                background: 'var(--bg-surface)',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                borderLeft: '3px solid var(--status-warning)'
              }}>
                <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-main)' }}>{item.name}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  <span className="font-mono">{item.sku}</span>
                  <span>{item.currentStock} units (${(item.costPrice * item.currentStock).toLocaleString()} tied)</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: 'var(--status-success)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={16} />
            <span>Optimal inventory velocity: All major stocked SKUs have registered recent transaction flow.</span>
          </div>
        )}
      </div>
    </div>
  );
}
