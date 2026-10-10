import React from 'react';
import {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  AlertTriangle,
  Building2,
  Truck,
  BarChart3,
  Download,
  Upload,
  Layers,
  ChevronRight
} from 'lucide-react';

export function Sidebar({ currentView, setCurrentView, lowStockCount, totalProducts, onExportCSV, onExportJSON, onImportJSON }) {
  const navItems = [
    { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
    { id: 'products', label: 'Product & SKU Catalog', icon: Package, badge: totalProducts },
    { id: 'movements', label: 'Stock In/Out Ledger', icon: ArrowLeftRight },
    { id: 'low-stock', label: 'Reorder & Low Stock', icon: AlertTriangle, badge: lowStockCount, isAlert: lowStockCount > 0 },
    { id: 'warehouses', label: 'Warehouse Facilities', icon: Building2 },
    { id: 'suppliers', label: 'Suppliers & Vendors', icon: Truck },
    { id: 'analytics', label: 'Valuation & Turnover', icon: BarChart3 },
  ];

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      onImportJSON(event.target.result);
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  return (
    <aside className="nexus-sidebar" style={{
      width: 'var(--sidebar-width)',
      background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '24px 16px',
      height: 'calc(100vh - var(--header-height))',
      position: 'sticky',
      top: 'var(--header-height)',
      zIndex: 90,
      flexShrink: 0
    }}>
      {/* Navigation Links */}
      <div>
        <div style={{
          fontSize: '11px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--text-muted)',
          padding: '0 12px 12px'
        }}>
          Operations Hub
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;

            return (
              <button
                key={item.id}
                id={`nav-link-${item.id}`}
                onClick={() => setCurrentView(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: isActive ? 'var(--accent-cyan-dim)' : 'transparent',
                  color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  border: isActive ? '1px solid rgba(0, 229, 255, 0.3)' : '1px solid transparent',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '13.5px',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                  textAlign: 'left',
                  width: '100%',
                  fontFamily: 'var(--font-sans)'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = 'var(--text-main)';
                    e.currentTarget.style.background = 'var(--bg-surface)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = 'var(--text-secondary)';
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Icon size={18} strokeWidth={isActive ? 2.5 : 2} color={isActive ? 'var(--accent-cyan)' : 'currentColor'} />
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && item.badge !== null && (
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: 'var(--radius-full)',
                    background: item.isAlert ? 'var(--status-danger)' : 'var(--bg-surface)',
                    color: item.isAlert ? '#fff' : 'var(--text-muted)',
                    boxShadow: item.isAlert ? '0 0 8px rgba(239, 68, 68, 0.5)' : 'none'
                  }}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Hub: Backup & Warehouse Capacity */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', borderTop: '1px solid var(--border-subtle)', paddingTop: '18px' }}>
        {/* Warehouse Utilization Meter */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '12px',
          fontSize: '12px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Total Fleet Usage</span>
            <span style={{ color: 'var(--accent-cyan)', fontWeight: 700 }} className="font-mono">76.8%</span>
          </div>
          <div style={{ width: '100%', height: '5px', background: 'var(--bg-surface)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: '76.8%', height: '100%', background: 'linear-gradient(90deg, var(--accent-cyan), var(--accent-indigo))' }} />
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '10.5px', marginTop: '6px' }}>
            69,320 / 90,000 units filled
          </div>
        </div>

        {/* Export / Import Data Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <button
            id="export-csv-btn"
            className="btn btn-secondary"
            onClick={onExportCSV}
            style={{ fontSize: '11.5px', padding: '7px 8px' }}
            title="Download Inventory Catalog as CSV"
          >
            <Download size={13} />
            <span>CSV</span>
          </button>
          
          <button
            id="export-json-btn"
            className="btn btn-secondary"
            onClick={onExportJSON}
            style={{ fontSize: '11.5px', padding: '7px 8px' }}
            title="Download Full Database Backup as JSON"
          >
            <Download size={13} />
            <span>Backup</span>
          </button>
        </div>

        {/* Hidden Import file input */}
        <label
          htmlFor="import-json-input"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            fontSize: '11.5px',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: 'var(--radius-md)',
            border: '1px dashed var(--border-medium)',
            textAlign: 'center'
          }}
        >
          <Upload size={13} />
          <span>Import JSON Dataset</span>
          <input
            id="import-json-input"
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
        </label>
      </div>
    </aside>
  );
}
