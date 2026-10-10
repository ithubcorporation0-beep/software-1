import React from 'react';
import {
  Building2,
  MapPin,
  User,
  Phone,
  Mail,
  Package,
  Layers,
  ArrowRight,
  ShieldCheck,
  Zap
} from 'lucide-react';

export function WarehousesView({
  warehouses,
  products,
  onFilterByWarehouse
}) {
  return (
    <div className="warehouses-view">
      <div className="view-header">
        <div className="view-header-title">
          <h1>
            <Building2 size={26} color="var(--accent-cyan)" />
            Multi-Depot Logistics Facilities
          </h1>
          <p>Global warehouse footprints, storage utilization meters, and facility command contacts.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        {warehouses.map(wh => {
          const whProducts = products.filter(p => p.warehouseId === wh.id);
          const totalUnitsInWh = whProducts.reduce((acc, p) => acc + p.currentStock, 0);
          const totalValuation = whProducts.reduce((acc, p) => acc + (p.costPrice * p.currentStock), 0);
          const percentUsage = Math.round((wh.currentUsage / wh.capacity) * 100);

          return (
            <div key={wh.id} className="card card-hover" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <span className="font-mono" style={{ fontSize: '11px', color: 'var(--accent-cyan)', fontWeight: 700 }}>
                      {wh.code}
                    </span>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
                      {wh.name}
                    </h3>
                  </div>

                  <span className={`badge ${percentUsage > 85 ? 'badge-low-stock' : 'badge-in-stock'}`}>
                    {wh.status}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  <MapPin size={14} color="var(--accent-cyan)" />
                  <span>{wh.city}</span>
                </div>

                {/* Capacity Gauge */}
                <div style={{ background: 'var(--bg-surface)', padding: '14px', borderRadius: 'var(--radius-md)', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Storage Capacity Utilization</span>
                    <span className="font-mono" style={{ fontSize: '14px', fontWeight: 800, color: percentUsage > 85 ? 'var(--status-warning)' : 'var(--accent-cyan)' }}>
                      {percentUsage}%
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '7px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${percentUsage}%`,
                        height: '100%',
                        background: percentUsage > 85
                          ? 'linear-gradient(90deg, var(--status-warning), var(--status-danger))'
                          : 'linear-gradient(90deg, var(--accent-cyan), var(--accent-indigo))',
                        borderRadius: '4px',
                        transition: 'width 0.4s ease'
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }} className="font-mono">
                    <span>{wh.currentUsage.toLocaleString()} stored</span>
                    <span>{wh.capacity.toLocaleString()} max units</span>
                  </div>
                </div>

                {/* Local Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ background: 'var(--bg-surface)', padding: '10px 12px', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ACTIVE SKUs</div>
                    <div className="font-mono" style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
                      {whProducts.length} items
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-surface)', padding: '10px 12px', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>DEPOT VALUATION</div>
                    <div className="font-mono" style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent-cyan)', marginTop: '2px' }}>
                      ${totalValuation.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                </div>

                {/* Manager Contact */}
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <User size={13} color="var(--text-muted)" />
                    <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{wh.manager}</span>
                    <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>(Site Director)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Mail size={13} color="var(--text-muted)" />
                    <span>{wh.email}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Phone size={13} color="var(--text-muted)" />
                    <span>{wh.phone}</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div style={{ marginTop: '18px' }}>
                <button
                  className="btn btn-secondary"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => onFilterByWarehouse(wh.id)}
                >
                  <span>View Depot Inventory ({whProducts.length} SKUs)</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
