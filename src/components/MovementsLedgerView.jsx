import React, { useState, useMemo } from 'react';
import {
  ArrowLeftRight,
  ArrowDownLeft,
  ArrowUpRight,
  Sliders,
  Search,
  Filter,
  Download,
  Calendar,
  User,
  FileText
} from 'lucide-react';

export function MovementsLedgerView({
  movements,
  warehouses,
  onOpenMovementModal
}) {
  const [filterType, setFilterType] = useState('ALL');
  const [filterWarehouse, setFilterWarehouse] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMovements = useMemo(() => {
    return movements.filter(m => {
      const matchType = filterType === 'ALL' || m.type === filterType;
      const matchWarehouse = filterWarehouse === 'ALL' || m.warehouseId === filterWarehouse;
      const matchSearch = !searchQuery ||
        m.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.reference && m.reference.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (m.operator && m.operator.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchType && matchWarehouse && matchSearch;
    });
  }, [movements, filterType, filterWarehouse, searchQuery]);

  const exportLedgerCSV = () => {
    const headers = ['Transaction ID', 'Timestamp', 'SKU', 'Product Name', 'Type', 'Quantity', 'Warehouse', 'Reference', 'Operator', 'Notes'];
    const rows = filteredMovements.map(m => [
      `"${m.id}"`,
      `"${m.timestamp}"`,
      `"${m.sku}"`,
      `"${m.productName.replace(/"/g, '""')}"`,
      `"${m.type}"`,
      m.quantity,
      `"${m.warehouseName || ''}"`,
      `"${m.reference || ''}"`,
      `"${m.operator || ''}"`,
      `"${(m.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexus_stock_movements_ledger_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="movements-ledger-view">
      <div className="view-header">
        <div className="view-header-title">
          <h1>
            <ArrowLeftRight size={26} color="var(--accent-cyan)" />
            Stock In / Out Ledger & Audit Trail
          </h1>
          <p>Immutable chronological journal of all inbound receipts, outbound dispatches, and inventory reconciliations.</p>
        </div>

        <div className="view-actions">
          <button
            className="btn btn-secondary"
            onClick={exportLedgerCSV}
            title="Download CSV of filtered ledger entries"
          >
            <Download size={15} />
            <span>Export Ledger CSV</span>
          </button>

          <button
            id="ledger-new-movement-btn"
            className="btn btn-primary"
            onClick={() => onOpenMovementModal({ type: 'Stock In' })}
          >
            <ArrowDownLeft size={16} />
            <span>Record Movement</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, flexWrap: 'wrap' }}>
            {/* Search */}
            <div style={{ position: 'relative', minWidth: '260px' }}>
              <input
                type="text"
                placeholder="Search transaction ID, SKU, PO#, operator..."
                className="form-input"
                style={{ padding: '8px 12px 8px 32px', fontSize: '13px' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            </div>

            {/* Type Filter */}
            <select
              className="form-select"
              style={{ width: 'auto', minWidth: '160px', padding: '8px 12px', fontSize: '13px' }}
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="ALL">All Types</option>
              <option value="Stock In">Stock In (Receipts)</option>
              <option value="Stock Out">Stock Out (Dispatches)</option>
              <option value="Audit Adjustment">Audit Adjustments</option>
            </select>

            {/* Warehouse Filter */}
            <select
              className="form-select"
              style={{ width: 'auto', minWidth: '180px', padding: '8px 12px', fontSize: '13px' }}
              value={filterWarehouse}
              onChange={(e) => setFilterWarehouse(e.target.value)}
            >
              <option value="ALL">All Warehouses</option>
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>

            {(filterType !== 'ALL' || filterWarehouse !== 'ALL' || searchQuery) && (
              <button
                className="btn btn-outline"
                style={{ padding: '7px 12px', fontSize: '12px' }}
                onClick={() => {
                  setFilterType('ALL');
                  setFilterWarehouse('ALL');
                  setSearchQuery('');
                }}
              >
                Reset
              </button>
            )}
          </div>

          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Total <strong>{filteredMovements.length}</strong> transactions
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="table-container">
        <table className="nexus-table">
          <thead>
            <tr>
              <th>Txn ID & Date</th>
              <th>Product & SKU</th>
              <th>Movement Type</th>
              <th>Qty Delta</th>
              <th>Depot Location</th>
              <th>Reference ID</th>
              <th>Operator</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {filteredMovements.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No transaction records found matching your filters.
                </td>
              </tr>
            ) : (
              filteredMovements.map(m => {
                const isPositive = m.quantity > 0;
                const dateFormatted = new Date(m.timestamp).toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });

                return (
                  <tr key={m.id}>
                    {/* Txn ID & Date */}
                    <td>
                      <div className="font-mono" style={{ fontWeight: 700, fontSize: '12.5px', color: 'var(--accent-cyan)' }}>
                        {m.id}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {dateFormatted}
                      </div>
                    </td>

                    {/* Product & SKU */}
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '13.5px' }}>
                        {m.productName}
                      </div>
                      <div className="font-mono" style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                        {m.sku}
                      </div>
                    </td>

                    {/* Type */}
                    <td>
                      <span className={`badge ${
                        m.type === 'Stock In' ? 'badge-in-stock' :
                        m.type === 'Stock Out' ? 'badge-cyan' : 'badge-low-stock'
                      }`}>
                        {m.type === 'Stock In' && <ArrowDownLeft size={12} />}
                        {m.type === 'Stock Out' && <ArrowUpRight size={12} />}
                        {m.type === 'Audit Adjustment' && <Sliders size={12} />}
                        {m.type}
                      </span>
                    </td>

                    {/* Qty Delta */}
                    <td>
                      <span className="font-mono" style={{
                        fontWeight: 800,
                        fontSize: '14px',
                        color: isPositive ? 'var(--status-success)' : 'var(--status-danger)'
                      }}>
                        {isPositive ? `+${m.quantity}` : m.quantity} units
                      </span>
                    </td>

                    {/* Depot Location */}
                    <td>
                      <div style={{ fontSize: '13px', color: 'var(--text-main)' }}>
                        {m.warehouseName}
                      </div>
                    </td>

                    {/* Reference */}
                    <td>
                      <span className="font-mono" style={{
                        fontSize: '12px',
                        background: 'var(--bg-surface)',
                        padding: '3px 7px',
                        borderRadius: '4px',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-secondary)'
                      }}>
                        {m.reference || 'N/A'}
                      </span>
                    </td>

                    {/* Operator */}
                    <td>
                      <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <User size={12} color="var(--text-muted)" />
                        {m.operator}
                      </div>
                    </td>

                    {/* Notes */}
                    <td style={{ maxWidth: '240px' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={m.notes}>
                        {m.notes || '—'}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
