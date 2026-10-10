import React from 'react';
import { Layers, Calendar, User, DollarSign, CheckCircle2, Clock } from 'lucide-react';
import { ProjectsService } from '../services/projectsService';
import { formatCurrency, formatDate } from '../../../lib/utils/formatters';

export function ProjectsView() {
  const projects = ProjectsService.getProjects();

  return (
    <div className="projects-view">
      <div className="view-header">
        <div className="view-header-title">
          <h1>
            <Layers size={26} color="var(--accent-cyan)" />
            Enterprise Engineering & Capital Projects
          </h1>
          <p>Strategic automation initiatives, depot expansion projects, and milestone budget burns.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
        {projects.map(p => (
          <div key={p.id} className="card card-hover" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <span className="font-mono" style={{ fontSize: '11px', color: 'var(--accent-cyan)', fontWeight: 700 }}>{p.code}</span>
                <span className={`badge ${p.status === 'Review' ? 'badge-low-stock' : 'badge-cyan'}`}>{p.status}</span>
              </div>

              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
                {p.name}
              </h3>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                <User size={13} />
                <span>Project Lead: <strong>{p.lead}</strong></span>
              </div>

              {/* Progress Bar */}
              <div style={{ background: 'var(--bg-surface)', padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Milestone Progress</span>
                  <span className="font-mono" style={{ fontWeight: 800, color: 'var(--accent-cyan)' }}>{p.progress}%</span>
                </div>
                <div style={{ width: '100%', height: '6px', background: 'var(--bg-secondary)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${p.progress}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent-cyan), var(--status-success))' }} />
                </div>
              </div>

              {/* Budget Details */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                <span>Allocated Budget:</span>
                <span className="font-mono" style={{ fontWeight: 700, color: 'var(--text-main)' }}>{formatCurrency(p.budget)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <span>Committed Spend:</span>
                <span className="font-mono" style={{ color: 'var(--status-warning)' }}>{formatCurrency(p.spent)}</span>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', marginTop: '16px', display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Calendar size={12} /> Target: {p.dueDate}
              </span>
              <span style={{ color: 'var(--status-success)' }}>On Schedule</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
