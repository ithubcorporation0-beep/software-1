import { DbAdapter } from '../../../lib/db/dbAdapter';
import { AuditService } from '../../../lib/audit/auditService';

export const PayrollService = {
  getPayrollRuns() {
    const employees = DbAdapter.getEmployees();
    return employees.map(emp => {
      const monthlyGross = emp.baseSalary / 12;
      const taxWithholding = monthlyGross * 0.22;
      const benefits = 450.00;
      const netPay = monthlyGross - taxWithholding - benefits;

      return {
        id: `pay-${emp.id}`,
        employeeId: emp.id,
        employeeName: emp.fullName,
        designation: emp.designation,
        gross: monthlyGross,
        tax: taxWithholding,
        benefits,
        netPay,
        status: 'Processed'
      };
    });
  },

  disbursePayroll(operator = 'Finance Director') {
    const runs = this.getPayrollRuns();
    const totalDisbursed = runs.reduce((acc, r) => acc + r.netPay, 0);
    AuditService.log({
      action: 'PAYROLL_DISBURSED',
      entityType: 'PAYROLL',
      entityId: `RUN-${new Date().toISOString().slice(0, 7)}`,
      operator,
      details: `Executed monthly payroll disbursement totaling $${totalDisbursed.toFixed(2)}`
    });
    return totalDisbursed;
  }
};
