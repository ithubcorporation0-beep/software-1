import React from 'react';
import { FileText, Download, BarChart2, ShieldCheck, CheckCircle } from 'lucide-react';
import { ReportsService } from '../services/reportsService';

export function ReportsView({ onNotify }) {
  const handleValuationReport = () => {
    ReportsService.generateInventoryValuationReport();
    if (onNotify) onNotify('Exported Inventory Valuation CSV Report');
  };

  const handleMovementReport = () => {
    ReportsService.generateStockMovementAuditReport();
    if (onNotify) onNotify('Exported Stock Movement Audit Trail CSV');
  };

  return (
    <div className="reports-view">
      <div className="view-header">
        <div className="view-header-title">
          <h1>
            <FileText size={26} color="var(--accent-cyan)" />
            Enterprise Reports & Business Intelligence
          </h1>
          <p>Exportable accounting records, movement audit ledgers, compliance schedules, and inventory reconciliation sheets.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
        <div className="card card-hover">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div className="metric-icon-wrap" style={{ '--metric-bg': 'var(--accent-cyan-dim)', '--metric-color': 'var(--accent-cyan)' }}>
              <BarChart2 size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>Inventory Valuation Ledger</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Asset basis, retail values & margins by SKU</p>
            </div>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Generates an audit-ready snapshot of all physical stock items, unit cost bases, and total working capital allocation across depots.
          </p>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleValuationReport}>
            <Download size={15} /> Download CSV Report
          </button>
        </div>

        <div className="card card-hover">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div className="metric-icon-wrap" style={{ '--metric-bg': 'var(--status-success-dim)', '--metric-color': 'var(--status-success)' }}>
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>Movement Audit Trail</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Chronological ledger of In/Out flows</p>
            </div>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Complete audit trail detailing receiving receipts, sales order dispatches, cycle adjustments, and authorized operators.
          </p>
          <button className="btn btn-secondary" style={{ width: '100%' }} onClick={handleMovementReport}>
            <Download size={15} /> Download CSV Ledger
          </button>
        </div>
      </div>
    </div>
  );
}
