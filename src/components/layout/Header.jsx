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
  Clock,
  ShieldCheck,
  AlertTriangle,
  User,
  ChevronDown
} from 'lucide-react';
import { AuthService } from '../../lib/auth/authService';

export function Header({
  searchTerm,
  setSearchTerm,
  lowStockCount,
  theme,
  toggleTheme,
  onOpenProductModal,
  onOpenMovementModal,
  onResetData,
  criticalItems,
  currentUser,
  onSwitchUser
}) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const availableUsers = AuthService.getAvailableUsers();

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
      padding: '0 28px',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      {/* Left: Brand Identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, var(--accent-cyan) 0%, var(--accent-indigo) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0a0e17',
            boxShadow: '0 0 15px rgba(0, 229, 255, 0.4)'
          }}>
            <Boxes size={20} strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 800, fontSize: '16.5px', letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
                IT-HUB<span style={{ color: 'var(--accent-cyan)' }}>ERP</span>
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
                ENTERPRISE
              </span>
            </div>
            <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--status-success)', display: 'inline-block' }} />
              SYSTEM SYNCHRONIZED // 4 DEPOTS
            </div>
          </div>
        </div>
      </div>

      {/* Middle: Universal Search Bar */}
      <div style={{ flex: 1, maxWidth: '420px', margin: '0 20px', position: 'relative' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: 'var(--bg-input)',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-md)',
          padding: '8px 14px',
          gap: '10px'
        }}>
          <Search size={15} color="var(--text-muted)" />
          <input
            id="global-search-input"
            type="text"
            placeholder="Search SKUs, products, barcodes, accounts... (/)"
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
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px' }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Real-time Clock */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          fontSize: '11.5px',
          color: 'var(--text-secondary)',
          background: 'var(--bg-surface)',
          padding: '6px 10px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          fontFamily: 'var(--font-mono)'
        }}>
          <Clock size={12} color="var(--accent-cyan)" />
          <span>{currentTime}</span>
        </div>

        {/* Action: Stock In/Out */}
        <button
          className="btn btn-secondary"
          onClick={onOpenMovementModal}
          style={{ padding: '7px 12px', fontSize: '12px' }}
          title="Record Stock Movement"
        >
          <ArrowDownRight size={14} color="var(--accent-cyan)" />
          <span>Stock In/Out</span>
        </button>

        {/* Action: New SKU */}
        <button
          className="btn btn-primary"
          onClick={() => onOpenProductModal(null)}
          style={{ padding: '7px 14px', fontSize: '12px' }}
          title="Create New SKU"
        >
          <Plus size={15} />
          <span>New SKU</span>
        </button>

        {/* Notifications Popover */}
        <div style={{ position: 'relative' }}>
          <button
            className="btn-icon"
            onClick={() => setShowNotifications(!showNotifications)}
            style={{ position: 'relative' }}
            title="Stock Warnings Radar"
          >
            <Bell size={17} />
            {lowStockCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                background: 'var(--status-danger)',
                color: '#fff',
                fontSize: '10px',
                fontWeight: 800,
                width: '17px',
                height: '17px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {lowStockCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div style={{
              position: 'absolute',
              top: '44px',
              right: 0,
              width: '320px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-lg)',
              padding: '14px',
              boxShadow: 'var(--shadow-lg)',
              zIndex: 200
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontWeight: 700, fontSize: '13px' }}>Stock Radar ({lowStockCount})</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Auto Alerts</span>
              </div>
              {criticalItems && criticalItems.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
                  {criticalItems.map(item => (
                    <div key={item.id} style={{
                      padding: '8px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-surface)',
                      fontSize: '12px'
                    }}>
                      <div style={{ fontWeight: 600 }}>{item.name}</div>
                      <div style={{ color: item.currentStock === 0 ? 'var(--status-danger)' : 'var(--status-warning)', fontSize: '11px' }}>
                        {item.currentStock === 0 ? 'OUT OF STOCK' : `${item.currentStock} left (min: ${item.minThreshold})`}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '12px', color: 'var(--text-muted)', fontSize: '12px' }}>
                  All stock levels nominal.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <button className="btn-icon" onClick={toggleTheme} title="Toggle Dark/Light Mode">
          {theme === 'dark' ? <Sun size={17} color="var(--status-warning)" /> : <Moon size={17} color="var(--accent-indigo)" />}
        </button>

        {/* User Role Switcher */}
        <div style={{ position: 'relative' }}>
          <button
            className="btn btn-secondary"
            style={{ padding: '6px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => setShowUserMenu(!showUserMenu)}
            title="Switch User Role & Test RBAC"
          >
            <div style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: 'var(--accent-cyan)',
              color: '#000',
              fontWeight: 800,
              fontSize: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {currentUser?.avatar || 'U'}
            </div>
            <span style={{ fontWeight: 600, maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentUser?.name || 'User'}
            </span>
            <ChevronDown size={12} />
          </button>

          {showUserMenu && (
            <div style={{
              position: 'absolute',
              top: '42px',
              right: 0,
              width: '260px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-md)',
              padding: '10px',
              boxShadow: 'var(--shadow-lg)',
              zIndex: 200
            }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', padding: '4px 6px', textTransform: 'uppercase' }}>
                Simulate Role (RBAC)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {availableUsers.map(u => (
                  <button
                    key={u.id}
                    onClick={() => {
                      onSwitchUser(u.id);
                      setShowUserMenu(false);
                    }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      background: currentUser?.id === u.id ? 'var(--accent-cyan-dim)' : 'transparent',
                      border: 'none',
                      color: 'var(--text-main)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%'
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: '12.5px' }}>{u.name}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{u.role}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Reset Demo Button */}
        <button className="btn-icon" onClick={onResetData} title="Reset Demo Data">
          <RefreshCw size={15} />
        </button>
      </div>
    </header>
  );
}
