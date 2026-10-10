import { AuditService } from '../../../lib/audit/auditService';

const FINANCE_ACCOUNTS = [
  { code: '1010', name: 'Operating Cash & Treasury', type: 'Asset', balance: 1420500.00 },
  { code: '1200', name: 'Accounts Receivable (Trade)', type: 'Asset', balance: 324100.00 },
  { code: '1400', name: 'Raw Materials & Inventory Assets', type: 'Asset', balance: 485900.00 },
  { code: '2010', name: 'Accounts Payable (Suppliers)', type: 'Liability', balance: 198000.00 },
  { code: '3010', name: 'Retained Enterprise Earnings', type: 'Equity', balance: 1845000.00 },
  { code: '4010', name: 'Gross Commercial Sales Revenue', type: 'Revenue', balance: 2150000.00 },
  { code: '5010', name: 'Cost of Goods Sold (COGS)', type: 'Expense', balance: 1290000.00 }
];

export const FinanceService = {
  getChartOfAccounts() {
    return FINANCE_ACCOUNTS;
  },

  getFinancialSummary() {
    const totalAssets = FINANCE_ACCOUNTS.filter(a => a.type === 'Asset').reduce((acc, a) => acc + a.balance, 0);
    const totalLiabilities = FINANCE_ACCOUNTS.filter(a => a.type === 'Liability').reduce((acc, a) => acc + a.balance, 0);
    const totalRevenue = FINANCE_ACCOUNTS.filter(a => a.type === 'Revenue').reduce((acc, a) => acc + a.balance, 0);
    const totalExpenses = FINANCE_ACCOUNTS.filter(a => a.type === 'Expense').reduce((acc, a) => acc + a.balance, 0);

    return {
      totalAssets,
      totalLiabilities,
      workingCapital: totalAssets - totalLiabilities,
      netIncome: totalRevenue - totalExpenses
    };
  }
};
