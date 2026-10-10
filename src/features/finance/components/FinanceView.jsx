import React from 'react';
import { DollarSign, TrendingUp, CreditCard, PieChart, FileText, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { FinanceService } from '../services/financeService';
import { formatCurrency } from '../../../lib/utils/formatters';

export function FinanceView() {
  const accounts = FinanceService.getChartOfAccounts();
  const summary = FinanceService.getFinancialSummary();

  return (
    <div className="finance-view">
      <div className="view-header">
        <div className="view-header-title">
          <h1>
            <DollarSign size={26} color="var(--accent-cyan)" />
            Finance, Ledger & Treasury Capital
          </h1>
          <p>Chart of accounts, balance sheet capitalization, accounts payable/receivable, and P&L ledger.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="metrics-grid">
        <div className="metric-card" style={{ '--card-accent': 'var(--accent-cyan)' }}>
          <div className="metric-top">
            <span className="metric-label">Total Liquid & Asset Basis</span>
            <div className="metric-icon-wrap"><DollarSign size={20} /></div>
          </div>
          <div className="metric-value font-mono">
            {formatCurrency(summary.totalAssets)}
          </div>
          <div className="metric-footer">
            <span>Cash, Receivables & Inventory</span>
          </div>
        </div>

        <div className="metric-card" style={{ '--card-accent': 'var(--status-warning)' }}>
          <div className="metric-top">
            <span className="metric-label">Current Liabilities (Payables)</span>
            <div className="metric-icon-wrap" style={{ '--metric-bg': 'var(--status-warning-dim)', '--metric-color': 'var(--status-warning)' }}>
              <CreditCard size={20} />
            </div>
          </div>
          <div className="metric-value font-mono" style={{ color: 'var(--status-warning)' }}>
            {formatCurrency(summary.totalLiabilities)}
          </div>
          <div className="metric-footer">
            <span>Supplier Invoices & Commitments</span>
          </div>
        </div>

        <div className="metric-card" style={{ '--card-accent': 'var(--status-success)' }}>
          <div className="metric-top">
            <span className="metric-label">Working Capital Net</span>
            <div className="metric-icon-wrap" style={{ '--metric-bg': 'var(--status-success-dim)', '--metric-color': 'var(--status-success)' }}>
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="metric-value font-mono" style={{ color: 'var(--status-success)' }}>
            {formatCurrency(summary.workingCapital)}
          </div>
          <div className="metric-footer">
            <span>Net Current Operating Margin</span>
          </div>
        </div>
      </div>

      {/* Chart of Accounts */}
      <div className="card">
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '16px' }}>
          Enterprise Chart of Accounts
        </h3>
        <div className="table-container">
          <table className="nexus-table">
            <thead>
              <tr>
                <th>Account Code</th>
                <th>Account Name</th>
                <th>Classification</th>
                <th style={{ textAlign: 'right' }}>Current Balance</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map(acc => (
                <tr key={acc.code}>
                  <td>
                    <span className="font-mono" style={{ fontWeight: 800, color: 'var(--accent-cyan)' }}>
                      {acc.code}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{acc.name}</span>
                  </td>
                  <td>
                    <span className={`badge ${
                      acc.type === 'Asset' ? 'badge-in-stock' :
                      acc.type === 'Revenue' ? 'badge-cyan' :
                      acc.type === 'Liability' ? 'badge-low-stock' : 'badge-indigo'
                    }`}>
                      {acc.type}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span className="font-mono" style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-main)' }}>
                      {formatCurrency(acc.balance)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
