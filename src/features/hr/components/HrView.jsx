import React, { useState } from 'react';
import { UserCheck, Plus, Mail, Phone, Building, DollarSign, Search, Briefcase } from 'lucide-react';
import { HrService } from '../services/hrService';
import { formatCurrency } from '../../../lib/utils/formatters';

export function HrView({ onNotify }) {
  const [employees, setEmployees] = useState(() => HrService.getEmployees());
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    department: 'Logistics & Supply Chain',
    designation: '',
    email: '',
    phone: '',
    baseSalary: '90000'
  });

  const filtered = employees.filter(e =>
    e.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.designation.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = (e) => {
    e.preventDefault();
    if (!formData.fullName.trim()) return;

    const emp = HrService.addEmployee(formData);
    setEmployees(HrService.getEmployees());
    setShowModal(false);
    setFormData({ fullName: '', department: 'Logistics & Supply Chain', designation: '', email: '', phone: '', baseSalary: '90000' });
    if (onNotify) onNotify(`Onboarded new staff member: ${emp.fullName}`);
  };

  return (
    <div className="hr-view">
      <div className="view-header">
        <div className="view-header-title">
          <h1>
            <UserCheck size={26} color="var(--accent-cyan)" />
            Human Capital & Staff Directory
          </h1>
          <p>Organizational workforce, site directors, designations, and employee compensation profiles.</p>
        </div>

        <div className="view-actions">
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} />
            <span>Onboard Employee</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="metrics-grid">
        <div className="metric-card" style={{ '--card-accent': 'var(--accent-cyan)' }}>
          <div className="metric-top">
            <span className="metric-label">Total Active Personnel</span>
            <div className="metric-icon-wrap"><UserCheck size={20} /></div>
          </div>
          <div className="metric-value font-mono">{employees.length}</div>
          <div className="metric-footer">
            <span>Corporate & Warehouse Staff</span>
          </div>
        </div>

        <div className="metric-card" style={{ '--card-accent': 'var(--status-success)' }}>
          <div className="metric-top">
            <span className="metric-label">Operational Departments</span>
            <div className="metric-icon-wrap" style={{ '--metric-bg': 'var(--status-success-dim)', '--metric-color': 'var(--status-success)' }}>
              <Briefcase size={20} />
            </div>
          </div>
          <div className="metric-value font-mono">
            {new Set(employees.map(e => e.department)).size}
          </div>
          <div className="metric-footer">
            <span>Engineering, Ops, Logistics</span>
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
            placeholder="Search staff by name, department, role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="nexus-table">
          <thead>
            <tr>
              <th>Employee Code & Name</th>
              <th>Department</th>
              <th>Designation</th>
              <th>Contact Details</th>
              <th>Annual Compensation</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(emp => (
              <tr key={emp.id}>
                <td>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{emp.fullName}</div>
                  <div className="font-mono" style={{ fontSize: '11px', color: 'var(--accent-cyan)' }}>
                    {emp.employeeCode}
                  </div>
                </td>
                <td>
                  <span className="badge badge-indigo">{emp.department}</span>
                </td>
                <td>
                  <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{emp.designation}</span>
                </td>
                <td>
                  <div style={{ fontSize: '12px', color: 'var(--text-main)' }}>{emp.email}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{emp.phone}</div>
                </td>
                <td>
                  <span className="font-mono" style={{ fontWeight: 700, color: 'var(--status-success)', fontSize: '13.5px' }}>
                    {formatCurrency(emp.baseSalary)}/yr
                  </span>
                </td>
                <td>
                  <span className="badge badge-in-stock">{emp.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Onboard Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <div className="modal-title">
                <UserCheck size={18} color="var(--accent-cyan)" />
                <span>Onboard New Employee</span>
              </div>
            </div>
            <form onSubmit={handleAdd}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <select
                    className="form-select"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  >
                    <option value="Logistics & Supply Chain">Logistics & Supply Chain</option>
                    <option value="Warehouse Operations">Warehouse Operations</option>
                    <option value="Procurement & Logistics">Procurement & Logistics</option>
                    <option value="Executive Management">Executive Management</option>
                    <option value="Engineering & Systems">Engineering & Systems</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Job Title / Designation *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Work Email</label>
                  <input
                    type="email"
                    className="form-input"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Annual Salary ($)</label>
                  <input
                    type="number"
                    className="form-input font-mono"
                    value={formData.baseSalary}
                    onChange={(e) => setFormData({ ...formData, baseSalary: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Complete Onboarding</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
