import React from 'react';
import {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  AlertTriangle,
  Building2,
  Truck,
  Users,
  ShoppingCart,
  DollarSign,
  UserCheck,
  CreditCard,
  Layers,
  FileText,
  Download,
  Upload,
  ShieldAlert
} from 'lucide-react';
import { RbacService, PERMISSIONS } from '../../lib/permissions/rbac';

export function Sidebar({
  currentView,
  setCurrentView,
  currentUser,
  lowStockCount,
  totalProducts,
  onExportCSV,
  onExportJSON,
  onImportJSON
}) {
  const navSections = [
    {
      title: 'Supply Chain & Inventory',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: PERMISSIONS.INVENTORY_VIEW },
        { id: 'inventory', label: 'Inventory & SKUs', icon: Package, badge: totalProducts, permission: PERMISSIONS.INVENTORY_VIEW },
        { id: 'movements', label: 'Stock In/Out Ledger', icon: ArrowLeftRight, permission: PERMISSIONS.INVENTORY_MOVE },
        { id: 'low-stock', label: 'Reorder Radar', icon: AlertTriangle, badge: lowStockCount, isAlert: lowStockCount > 0, permission: PERMISSIONS.INVENTORY_VIEW },
        { id: 'warehouses', label: 'Depot Facilities', icon: Building2, permission: PERMISSIONS.WAREHOUSE_MANAGE },
        { id: 'suppliers', label: 'Suppliers Directory', icon: Truck, permission: PERMISSIONS.SUPPLIER_MANAGE },
      ]
    },
    {
      title: 'Commercial & Revenue',
      items: [
        { id: 'crm', label: 'CRM & Accounts', icon: Users, permission: PERMISSIONS.CRM_MANAGE },
        { id: 'sales', label: 'Sales Orders', icon: ShoppingCart, permission: PERMISSIONS.SALES_MANAGE },
        { id: 'finance', label: 'Finance & Ledger', icon: DollarSign, permission: PERMISSIONS.FINANCE_VIEW },
      ]
    },
    {
      title: 'Workforce & PMO',
      items: [
        { id: 'hr', label: 'Staff Directory', icon: UserCheck, permission: PERMISSIONS.HR_MANAGE },
        { id: 'payroll', label: 'Payroll Engine', icon: CreditCard, permission: PERMISSIONS.PAYROLL_MANAGE },
        { id: 'projects', label: 'Capital Projects', icon: Layers, permission: PERMISSIONS.INVENTORY_VIEW },
        { id: 'reports', label: 'Reports & Export', icon: FileText, permission: PERMISSIONS.INVENTORY_VIEW },
      ]
    }
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
      padding: '20px 14px',
      height: 'calc(100vh - var(--header-height))',
      position: 'sticky',
      top: 'var(--header-height)',
      zIndex: 90,
      flexShrink: 0,
      overflowY: 'auto'
    }}>
      <div>
        {navSections.map((sec, secIdx) => (
          <div key={secIdx} style={{ marginBottom: '18px' }}>
            <div style={{
              fontSize: '10.5px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--text-muted)',
              padding: '0 10px 8px'
            }}>
              {sec.title}
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {sec.items.map(item => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                const isAllowed = RbacService.canAccess(currentUser, item.permission);

                if (!isAllowed) return null;

                return (
                  <button
                    key={item.id}
                    id={`nav-link-${item.id}`}
                    onClick={() => setCurrentView(item.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: isActive ? 'var(--accent-cyan-dim)' : 'transparent',
                      color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                      border: isActive ? '1px solid rgba(0, 229, 255, 0.3)' : '1px solid transparent',
                      fontWeight: isActive ? 700 : 500,
                      fontSize: '13px',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                      textAlign: 'left',
                      width: '100%',
                      fontFamily: 'var(--font-sans)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Icon size={16} strokeWidth={isActive ? 2.5 : 2} color={isActive ? 'var(--accent-cyan)' : 'currentColor'} />
                      <span>{item.label}</span>
                    </div>

                    {item.badge !== undefined && item.badge !== null && (
                      <span style={{
                        fontSize: '10.5px',
                        fontWeight: 700,
                        padding: '1px 6px',
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
        ))}
      </div>

      {/* Bottom Hub: Backup & Import */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          <button className="btn btn-secondary" onClick={onExportCSV} style={{ fontSize: '11px', padding: '6px' }}>
            <Download size={12} /> CSV
          </button>
          <button className="btn btn-secondary" onClick={onExportJSON} style={{ fontSize: '11px', padding: '6px' }}>
            <Download size={12} /> Backup
          </button>
        </div>

        <label
          htmlFor="import-json-sidebar"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            fontSize: '11px',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: 'var(--radius-md)',
            border: '1px dashed var(--border-medium)',
            textAlign: 'center'
          }}
        >
          <Upload size={12} /> Import DB
          <input
            id="import-json-sidebar"
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
