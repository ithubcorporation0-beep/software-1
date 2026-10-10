import { DbAdapter } from '../../../lib/db/dbAdapter';
import { AuditService } from '../../../lib/audit/auditService';

export const CrmService = {
  getCustomers() {
    return DbAdapter.getCustomers();
  },

  addCustomer(customerData, operator = 'Admin') {
    const customers = DbAdapter.getCustomers();
    const newCust = {
      ...customerData,
      id: `cust-${Date.now()}`,
      totalSpend: parseFloat(customerData.totalSpend) || 0
    };
    DbAdapter.setCustomers([newCust, ...customers]);
    AuditService.log({
      action: 'CUSTOMER_CREATED',
      entityType: 'CRM',
      entityId: newCust.id,
      operator,
      details: `Added customer ${newCust.name} (${newCust.company})`
    });
    return newCust;
  },

  updateStatus(customerId, newStatus, operator = 'Admin') {
    const customers = DbAdapter.getCustomers();
    const updated = customers.map(c => c.id === customerId ? { ...c, status: newStatus } : c);
    DbAdapter.setCustomers(updated);
    AuditService.log({
      action: 'CUSTOMER_STATUS_UPDATED',
      entityType: 'CRM',
      entityId: customerId,
      operator,
      details: `Updated status to ${newStatus}`
    });
    return updated;
  }
};
