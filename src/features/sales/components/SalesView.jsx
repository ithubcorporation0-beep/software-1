import React, { useState } from 'react';
import { ShoppingCart, Plus, CheckCircle, Clock, Truck, DollarSign, Search, FileText } from 'lucide-react';
import { SalesService } from '../services/salesService';
import { formatCurrency, formatDate } from '../../../lib/utils/formatters';

export function SalesView({ onNotify }) {
  const [orders, setOrders] = useState(() => SalesService.getOrders());
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = orders.filter(o =>
    o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalSalesRevenue = orders.reduce((acc, o) => acc + o.totalAmount, 0);

  const handleUpdateStatus = (id, status) => {
    SalesService.updateStatus(id, status);
    setOrders(SalesService.getOrders());
    if (onNotify) onNotify(`Updated order ${id} status to ${status}`);
  };

  return (
    <div className="sales-view">
      <div className="view-header">
        <div className="view-header-title">
          <h1>
            <ShoppingCart size={26} color="var(--accent-cyan)" />
            Sales Orders & Commercial Fulfillment
          </h1>
          <p>Client order pipelines, line-item dispatches, delivery statuses, and billing settlements.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="metrics-grid">
        <div className="metric-card" style={{ '--card-accent': 'var(--accent-cyan)' }}>
          <div className="metric-top">
            <span className="metric-label">Total Commercial Invoices</span>
            <div className="metric-icon-wrap"><ShoppingCart size={20} /></div>
          </div>
          <div className="metric-value font-mono">{orders.length}</div>
          <div className="metric-footer">
            <span>Orders Dispatched & Pending</span>
          </div>
        </div>

        <div className="metric-card" style={{ '--card-accent': 'var(--status-success)' }}>
          <div className="metric-top">
            <span className="metric-label">Total Billed Gross Value</span>
            <div className="metric-icon-wrap" style={{ '--metric-bg': 'var(--status-success-dim)', '--metric-color': 'var(--status-success)' }}>
              <DollarSign size={20} />
            </div>
          </div>
          <div className="metric-value font-mono">
            {formatCurrency(totalSalesRevenue)}
          </div>
          <div className="metric-footer">
            <span>Customer Accounts Receivable</span>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="card" style={{ padding: '14px 20px', marginBottom: '20px' }}>
        <div style={{ position: 'relative', maxWidth: '360px' }}>
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '34px' }}
            placeholder="Search order ID (SO#), client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
        </div>
      </div>

      {/* Orders Table */}
      <div className="table-container">
        <table className="nexus-table">
          <thead>
            <tr>
              <th>Order ID & Date</th>
              <th>Customer Account</th>
              <th>Ordered Line Items</th>
              <th>Order Amount</th>
              <th>Fulfillment Status</th>
              <th>Payment</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(order => (
              <tr key={order.id}>
                <td>
                  <div className="font-mono" style={{ fontWeight: 800, color: 'var(--accent-cyan)', fontSize: '13.5px' }}>
                    {order.id}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {formatDate(order.date, true)}
                  </div>
                </td>
                <td>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{order.customerName}</div>
                </td>
                <td>
                  {order.items.map((item, idx) => (
                    <div key={idx} style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      <strong style={{ color: 'var(--text-main)' }}>{item.qty}x</strong> {item.name}
                    </div>
                  ))}
                </td>
                <td>
                  <span className="font-mono" style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text-main)' }}>
                    {formatCurrency(order.totalAmount)}
                  </span>
                </td>
                <td>
                  <span className={`badge ${
                    order.status === 'Fulfilled' ? 'badge-in-stock' :
                    order.status === 'Dispatched' ? 'badge-cyan' : 'badge-low-stock'
                  }`}>
                    {order.status}
                  </span>
                </td>
                <td>
                  <span className={`badge ${order.paymentStatus === 'Paid' ? 'badge-in-stock' : 'badge-low-stock'}`}>
                    {order.paymentStatus}
                  </span>
                </td>
                <td>
                  <select
                    className="form-select"
                    style={{ width: 'auto', padding: '4px 8px', fontSize: '12px' }}
                    value={order.status}
                    onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                  >
                    <option value="Confirmed">Confirmed</option>
                    <option value="Dispatched">Dispatched</option>
                    <option value="Fulfilled">Fulfilled</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
