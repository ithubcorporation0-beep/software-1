import React from 'react';
import { CreditCard, CheckCircle, FileText, DollarSign, Download, ArrowDownRight } from 'lucide-react';
import { PayrollService } from '../services/payrollService';
import { formatCurrency } from '../../../lib/utils/formatters';

export function PayrollView({ onNotify }) {
  const payrollRuns = PayrollService.getPayrollRuns();
  const totalNet = payrollRuns.reduce((acc, r) => acc + r.netPay, 0);
  const totalTax = payrollRuns.reduce((acc, r) => acc + r.tax, 0);

  const handleDisburse = () => {
    const total = PayrollService.disbursePayroll();
    if (onNotify) onNotify(`Successfully authorized monthly payroll distribution of ${formatCurrency(total)}`);
  };

  return (
    <div className="payroll-view">
      <div className="view-header">
        <div className="view-header-title">
          <h1>
            <CreditCard size={26} color="var(--accent-cyan)" />
            Automated Payroll & Compensation Engine
          </h1>
          <p>Monthly gross salaries, statutory withholding deductions, healthcare benefits, and direct EFT disbursements.</p>
        </div>

        <div className="view-actions">
          <button className="btn btn-primary" onClick={handleDisburse}>
            <CheckCircle size={16} />
            <span>Authorize Monthly Disbursement</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="metrics-grid">
        <div className="metric-card" style={{ '--card-accent': 'var(--accent-cyan)' }}>
          <div className="metric-top">
            <span className="metric-label">Monthly Net Disbursement</span>
            <div className="metric-icon-wrap"><DollarSign size={20} /></div>
          </div>
          <div className="metric-value font-mono">
            {formatCurrency(totalNet)}
          </div>
          <div className="metric-footer">
            <span>Direct Deposit Transfer Total</span>
          </div>
        </div>

        <div className="metric-card" style={{ '--card-accent': 'var(--status-warning)' }}>
          <div className="metric-top">
            <span className="metric-label">Withholding & Compliance</span>
            <div className="metric-icon-wrap" style={{ '--metric-bg': 'var(--status-warning-dim)', '--metric-color': 'var(--status-warning)' }}>
              <FileText size={20} />
            </div>
          </div>
          <div className="metric-value font-mono" style={{ color: 'var(--status-warning)' }}>
            {formatCurrency(totalTax)}
          </div>
          <div className="metric-footer">
            <span>Statutory Payroll Tax Remittance</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="nexus-table">
          <thead>
            <tr>
              <th>Personnel</th>
              <th>Monthly Gross</th>
              <th>Tax Withheld (22%)</th>
              <th>Benefits Deduction</th>
              <th>Net Take-Home Pay</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {payrollRuns.map(r => (
              <tr key={r.id}>
                <td>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{r.employeeName}</div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{r.designation}</div>
                </td>
                <td>
                  <span className="font-mono" style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                    {formatCurrency(r.gross)}
                  </span>
                </td>
                <td>
                  <span className="font-mono" style={{ color: 'var(--status-danger)' }}>
                    -{formatCurrency(r.tax)}
                  </span>
                </td>
                <td>
                  <span className="font-mono" style={{ color: 'var(--text-muted)' }}>
                    -{formatCurrency(r.benefits)}
                  </span>
                </td>
                <td>
                  <span className="font-mono" style={{ fontWeight: 800, color: 'var(--status-success)', fontSize: '14px' }}>
                    {formatCurrency(r.netPay)}
                  </span>
                </td>
                <td>
                  <span className="badge badge-in-stock">
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
