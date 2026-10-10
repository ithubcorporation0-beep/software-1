const AUDIT_STORAGE_KEY = 'it_hub_erp_audit_logs';

export const AuditService = {
  getLogs() {
    try {
      const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  },

  log({ action, entityType, entityId, operator = 'System', details = '' }) {
    const logs = this.getLogs();
    const entry = {
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      action,
      entityType,
      entityId,
      operator,
      details
    };
    const updated = [entry, ...logs.slice(0, 99)]; // Keep latest 100 entries
    try {
      localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to commit audit entry:', e);
    }
    return entry;
  }
};
