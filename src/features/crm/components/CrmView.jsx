import React, { useState } from 'react';
import { Users, Plus, Mail, Phone, Building, DollarSign, Search, CheckCircle, Clock } from 'lucide-react';
import { CrmService } from '../services/crmService';
import { formatCurrency } from '../../../lib/utils/formatters';

export function CrmView({ onNotify }) {
  const [customers, setCustomers] = useState(() => CrmService.getCustomers());
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    status: 'Prospect'
  });

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPipeline = customers.reduce((acc, c) => acc + (c.totalSpend || 0), 0);

  const handleAddCustomer = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) return;

    const created = CrmService.addCustomer(formData);
    setCustomers(CrmService.getCustomers());
    setShowAddModal(false);
    setFormData({ name: '', company: '', email: '', phone: '', status: 'Prospect' });
    if (onNotify) onNotify(`Added CRM Account: ${created.name}`);
  };

  return (
    <div className="crm-view">
      <div className="view-header">
        <div className="view-header-title">
          <h1>
            <Users size={26} color="var(--accent-cyan)" />
            CRM & Enterprise Accounts Directory
          </h1>
          <p>Customer relationships, sales engagement status, and lifetime procurement revenue.</p>
        </div>

        <div className="view-actions">
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={16} />
            <span>New Customer Account</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="metrics-grid">
        <div className="metric-card" style={{ '--card-accent': 'var(--accent-cyan)' }}>
          <div className="metric-top">
            <span className="metric-label">Active Customer Accounts</span>
            <div className="metric-icon-wrap"><Users size={20} /></div>
          </div>
          <div className="metric-value font-mono">{customers.length}</div>
          <div className="metric-footer">
            <span>Global Technology Partners</span>
          </div>
        </div>

        <div className="metric-card" style={{ '--card-accent': 'var(--status-success)' }}>
          <div className="metric-top">
            <span className="metric-label">Total Commercial Pipeline</span>
            <div className="metric-icon-wrap" style={{ '--metric-bg': 'var(--status-success-dim)', '--metric-color': 'var(--status-success)' }}>
              <DollarSign size={20} />
            </div>
          </div>
          <div className="metric-value font-mono">
            {formatCurrency(totalPipeline)}
          </div>
          <div className="metric-footer">
            <span>Cumulative Closed Revenue</span>
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
            placeholder="Search accounts, companies, contact emails..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
        </div>
      </div>

      {/* Customers Table */}
      <div className="table-container">
        <table className="nexus-table">
          <thead>
            <tr>
              <th>Customer Name & Company</th>
              <th>Contact Details</th>
              <th>Account Status</th>
              <th>Total Spend</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id}>
                <td>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{c.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Building size={12} /> {c.company}
                  </div>
                </td>
                <td>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Mail size={12} color="var(--accent-cyan)" /> {c.email}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                    <Phone size={12} /> {c.phone}
                  </div>
                </td>
                <td>
                  <span className={`badge ${c.status === 'Active Customer' ? 'badge-in-stock' : 'badge-cyan'}`}>
                    {c.status}
                  </span>
                </td>
                <td>
                  <span className="font-mono" style={{ fontWeight: 700, color: 'var(--status-success)', fontSize: '13.5px' }}>
                    {formatCurrency(c.totalSpend)}
                  </span>
                </td>
                <td>
                  <select
                    className="form-select"
                    style={{ width: 'auto', padding: '4px 8px', fontSize: '12px' }}
                    value={c.status}
                    onChange={(e) => {
                      CrmService.updateStatus(c.id, e.target.value);
                      setCustomers(CrmService.getCustomers());
                      if (onNotify) onNotify(`Updated account status for ${c.name}`);
                    }}
                  >
                    <option value="Lead">Lead</option>
                    <option value="Prospect">Prospect</option>
                    <option value="Active Customer">Active Customer</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <div className="modal-title">
                <Users size={18} color="var(--accent-cyan)" />
                <span>Create Customer Account</span>
              </div>
            </div>
            <form onSubmit={handleAddCustomer}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. Alexander Wright"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Company Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Quantum Aerospace Dynamics"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Work Email *</label>
                  <input
                    type="email"
                    required
                    className="form-input"
                    placeholder="e.g. a.wright@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. +1 (650) 555-9120"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Initial Status</label>
                  <select
                    className="form-select"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="Lead">Lead</option>
                    <option value="Prospect">Prospect</option>
                    <option value="Active Customer">Active Customer</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Account</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
