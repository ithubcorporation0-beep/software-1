import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export function ToastContainer({ toasts, onCloseToast }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      zIndex: 2000,
      maxWidth: '420px',
      pointerEvents: 'none'
    }}>
      {toasts.map(toast => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';
        const isWarning = toast.type === 'warning';

        const borderColor = isSuccess ? 'var(--status-success)' :
                            isError ? 'var(--status-danger)' :
                            isWarning ? 'var(--status-warning)' : 'var(--accent-cyan)';

        const Icon = isSuccess ? CheckCircle2 :
                     isError ? AlertCircle :
                     isWarning ? AlertTriangle : Info;

        return (
          <div
            key={toast.id}
            style={{
              pointerEvents: 'auto',
              background: 'var(--bg-secondary)',
              border: `1px solid ${borderColor}`,
              boxShadow: 'var(--shadow-lg)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              animation: 'slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              color: 'var(--text-main)',
              fontSize: '13.5px'
            }}
          >
            <Icon size={18} color={borderColor} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, fontWeight: 500 }}>
              {toast.message}
            </div>
            <button
              onClick={() => onCloseToast(toast.id)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
