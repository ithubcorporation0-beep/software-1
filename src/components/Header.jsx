import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Search,
  Bell,
  Sun,
  Moon,
  Plus,
  RefreshCw,
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';

export function Header({
  searchTerm,
  setSearchTerm,
  lowStockCount,
  theme,
  toggleTheme,
  onOpenProductModal,
  onOpenMovementModal,
  onResetData,
  criticalItems
}) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="nexus-header" style={{
      height: 'var(--header-height)',
      borderBottom: '1px solid var(--border-subtle)',
      background: 'var(--bg-card)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 32px',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      {/* Left: Brand Identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, var(--accent-cyan) 0%, var(--accent-indigo) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0a0e17',
            boxShadow: '0 0 15px rgba(0, 229, 255, 0.4)'
          }}>
            <Boxes size={22} strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 800, fontSize: '17px', letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
                NEXUS<span style={{ color: 'var(--accent-cyan)' }}>ERP</span>
              </span>
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                background: 'var(--accent-cyan-dim)',
                color: 'var(--accent-cyan)',
                padding: '2px 6px',
                borderRadius: '4px',
                letterSpacing: '0.05em'
              }}>
                v2.6 PRO
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--status-success)', display: 'inline-block' }} />
              OPERATIONAL // 4 WAREHOUSES SYNCED
            </div>
          </div>
        </div>
      </div>

      {/* Middle: Universal Search Bar */}
      <div style={{ flex: 1, maxWidth: '440px', margin: '0 24px', position: 'relative' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: 'var(--bg-input)',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-md)',
          padding: '8px 14px',
          gap: '10px',
          transition: 'all var(--transition-fast)'
        }}>
          <Search size={16} color="var(--text-muted)" />
          <input
            id="global-search-input"
            type="text"
            placeholder="Search SKUs, products, barcodes, bin locations... (/)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-main)',
              fontSize: '13px',
              width: '100%',
              fontFamily: 'var(--font-sans)'
            }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Right: Quick Actions, Live Clock, Notifications, Theme */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Real-time Clock */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12px',
          color: 'var(--text-secondary)',
          background: 'var(--bg-surface)',
          padding: '6px 12px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          fontFamily: 'var(--font-mono)'
        }}>
          <Clock size={13} color="var(--accent-cyan)" />
          <span>{currentTime}</span>
        </div>

        {/* Quick Action: Log Stock Movement */}
        <button
          id="quick-log-movement-btn"
          className="btn btn-secondary"
          onClick={onOpenMovementModal}
          style={{ padding: '8px 14px', fontSize: '13px' }}
          title="Log Inbound or Outbound Stock Movement"
        >
          <ArrowDownRight size={15} color="var(--accent-cyan)" />
          <span>Stock In/Out</span>
        </button>

        {/* Quick Action: Add SKU */}
        <button
          id="quick-add-sku-btn"
          className="btn btn-primary"
          onClick={() => onOpenProductModal(null)}
          style={{ padding: '8px 16px', fontSize: '13px' }}
          title="Add New Master Product SKU"
        >
          <Plus size={16} />
          <span>New SKU</span>
        </button>

        {/* Notifications Popover */}
        <div style={{ position: 'relative' }}>
          <button
            id="notifications-bell-btn"
            className="btn-icon"
            onClick={() => setShowNotifications(!showNotifications)}
            style={{ position: 'relative' }}
            title="System Alerts & Low Stock Radar"
          >
            <Bell size={18} />
            {lowStockCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                background: 'var(--status-danger)',
                color: '#fff',
                fontSize: '10px',
                fontWeight: 800,
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)'
              }}>
                {lowStockCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div style={{
              position: 'absolute',
              top: '46px',
              right: 0,
              width: '340px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-lg)',
              padding: '16px',
              boxShadow: 'var(--shadow-lg)',
              zIndex: 200,
              animation: 'slideUp 0.15s ease'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={15} color="var(--status-warning)" />
                  Stock Alerts ({lowStockCount})
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Automated Radar</span>
              </div>

              {criticalItems && criticalItems.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
                  {criticalItems.map(item => (
                    <div key={item.id} style={{
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-surface)',
                      borderLeft: `3px solid ${item.currentStock === 0 ? 'var(--status-danger)' : 'var(--status-warning)'}`,
                      fontSize: '12px'
                    }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{item.name}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        <span className="font-mono">{item.sku}</span>
                        <span style={{ color: item.currentStock === 0 ? 'var(--status-danger)' : 'var(--status-warning)', fontWeight: 700 }}>
                          {item.currentStock} / {item.minThreshold} min
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '13px' }}>
                  <ShieldCheck size={28} color="var(--status-success)" style={{ margin: '0 auto 8px' }} />
                  <div>All stock levels optimal.</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Theme Toggle Button */}
        <button
          id="theme-toggle-btn"
          className="btn-icon"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Obsidian Dark'} Theme`}
        >
          {theme === 'dark' ? <Sun size={18} color="var(--status-warning)" /> : <Moon size={18} color="var(--accent-indigo)" />}
        </button>

        {/* Reset Demo Data Button */}
        <button
          id="reset-demo-btn"
          className="btn-icon"
          onClick={onResetData}
          title="Reset Enterprise Demo Data"
          style={{ opacity: 0.7 }}
        >
          <RefreshCw size={16} />
        </button>
      </div>
    </header>
  );
}
