import React from 'react';
import {
  Truck,
  Star,
  Clock,
  Mail,
  Phone,
  User,
  Package,
  Layers,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

export function SuppliersView({
  suppliers,
  products,
  onFilterBySupplier
}) {
  return (
    <div className="suppliers-view">
      <div className="view-header">
        <div className="view-header-title">
          <h1>
            <Truck size={26} color="var(--accent-cyan)" />
            Suppliers & Vendor Procurement Directory
          </h1>
          <p>Tier-1 hardware manufacturers, component contracts, SLA lead-time scores, and procurement direct lines.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        {suppliers.map(sup => {
          const supProducts = products.filter(p => p.supplierId === sup.id);

          return (
            <div key={sup.id} className="card card-hover" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <span className="font-mono" style={{ fontSize: '11px', color: 'var(--accent-cyan)', fontWeight: 700 }}>
                      {sup.code}
                    </span>
                    <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
                      {sup.name}
                    </h3>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'rgba(245, 158, 11, 0.15)',
                    color: 'var(--status-warning)',
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '12px',
                    fontWeight: 700
                  }}>
                    <Star size={13} fill="currentColor" />
                    <span>{sup.rating}</span>
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <span className="badge badge-indigo">{sup.category}</span>
                </div>

                {/* Metrics */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ background: 'var(--bg-surface)', padding: '10px 12px', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>LEAD TIME</div>
                    <div className="font-mono" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                      <Clock size={14} color="var(--accent-cyan)" />
                      <span>{sup.leadTimeDays} Business Days</span>
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-surface)', padding: '10px 12px', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>SUPPLIED SKUs</div>
                    <div className="font-mono" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                      <Package size={14} />
                      <span>{supProducts.length} Active SKUs</span>
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div style={{
                  background: 'var(--bg-surface)',
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <User size={13} color="var(--text-muted)" />
                    <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{sup.contactPerson}</span>
                    <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>(Account Rep)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Mail size={13} color="var(--text-muted)" />
                    <a href={`mailto:${sup.email}`} style={{ color: 'var(--accent-cyan)', textDecoration: 'none' }}>
                      {sup.email}
                    </a>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Phone size={13} color="var(--text-muted)" />
                    <span style={{ color: 'var(--text-secondary)' }}>{sup.phone}</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div style={{ marginTop: '16px' }}>
                <button
                  className="btn btn-secondary"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => onFilterBySupplier(sup.id)}
                >
                  <span>Filter Catalog for {sup.name}</span>
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
