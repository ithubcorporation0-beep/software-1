import { DbAdapter } from '../../../lib/db/dbAdapter';
import { AuditService } from '../../../lib/audit/auditService';

export const HrService = {
  getEmployees() {
    return DbAdapter.getEmployees();
  },

  addEmployee(empData, operator = 'Admin') {
    const employees = DbAdapter.getEmployees();
    const newEmp = {
      ...empData,
      id: `emp-${Date.now()}`,
      employeeCode: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
      baseSalary: parseFloat(empData.baseSalary) || 75000,
      status: 'Active'
    };
    DbAdapter.setEmployees([newEmp, ...employees]);
    AuditService.log({
      action: 'EMPLOYEE_HIRED',
      entityType: 'HR',
      entityId: newEmp.id,
      operator,
      details: `Onboarded employee ${newEmp.fullName} (${newEmp.designation})`
    });
    return newEmp;
  }
};
