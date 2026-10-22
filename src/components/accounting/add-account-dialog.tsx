"use client";

import * as React from "react";
import {
  Landmark,
  FileText,
  CreditCard,
  Building,
  HelpCircle,
  Plus,
  CheckCircle2,
  AlertCircle,
  FolderTree,
  DollarSign,
  Percent,
  Calendar,
  X,
  Layers,
} from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Account, AccountType } from "@/types/database.types";

export interface AccountTypeOption {
  id: string;
  label: string;
  group: "Balance Sheet" | "Profit & Loss";
  baseType: AccountType;
  codePrefix: string;
  description: string;
  examples: string[];
  detailTypes: string[];
}

export const ACCOUNT_TYPE_OPTIONS: AccountTypeOption[] = [
  // Balance Sheet - Assets
  {
    id: "bank",
    label: "Bank",
    group: "Balance Sheet",
    baseType: "Asset",
    codePrefix: "10",
    description: "Use a Bank account to track cash on hand, petty cash, checking, savings, or money market accounts. Normal balance: Debit.",
    examples: ["Operating checking accounts", "Petty cash drawers", "Business savings", "Short-term deposits"],
    detailTypes: ["Checking", "Savings", "Cash on Hand", "Money Market", "Petty Cash"],
  },
  {
    id: "accounts_receivable",
    label: "Accounts Receivable (A/R)",
    group: "Balance Sheet",
    baseType: "Asset",
    codePrefix: "12",
    description: "Tracks money owed to your business by clients for products or services sold on credit terms. Normal balance: Debit.",
    examples: ["Unpaid client sales invoices", "Accrued customer billings", "Trade receivables"],
    detailTypes: ["Accounts Receivable", "Retainage Receivable", "Employee Advances"],
  },
  {
    id: "other_current_assets",
    label: "Other Current Assets",
    group: "Balance Sheet",
    baseType: "Asset",
    codePrefix: "13",
    description: "Assets that are expected to be converted to cash, sold, or consumed within one operating fiscal year. Normal balance: Debit.",
    examples: ["Prepaid office rent", "Advance tax payments", "Security deposits (short-term)", "Inventory stock"],
    detailTypes: ["Prepaid Expenses", "Inventory Asset", "Employee Cash Advances", "Advance Income Tax (WHT)"],
  },
  {
    id: "fixed_assets",
    label: "Fixed Assets",
    group: "Balance Sheet",
    baseType: "Asset",
    codePrefix: "15",
    description: "Tangible, long-term property that your business uses in its operations and does not expect to consume within one year. Normal balance: Debit.",
    examples: ["Company vehicles", "Computer hardware & servers", "Office furniture", "Machinery", "Leasehold improvements"],
    detailTypes: ["Vehicles", "Computer Equipment", "Furniture & Fixtures", "Buildings", "Machinery & Equipment", "Accumulated Depreciation"],
  },
  {
    id: "other_assets",
    label: "Other Assets",
    group: "Balance Sheet",
    baseType: "Asset",
    codePrefix: "18",
    description: "Long-term assets not categorized as fixed assets or current assets. Normal balance: Debit.",
    examples: ["Long-term security utility deposits", "Intangible assets & trademarks", "Goodwill"],
    detailTypes: ["Security Deposits", "Licenses & Patents", "Long-term Investments", "Goodwill"],
  },

  // Balance Sheet - Liabilities
  {
    id: "accounts_payable",
    label: "Accounts Payable (A/P)",
    group: "Balance Sheet",
    baseType: "Liability",
    codePrefix: "20",
    description: "Tracks obligations and money owed by your business to suppliers and vendors for goods or services purchased on credit. Normal balance: Credit.",
    examples: ["Vendor bills awaiting payment", "Supplier trade credits", "Subcontractor payables"],
    detailTypes: ["Accounts Payable", "Trade Payables", "Accrued Payables"],
  },
  {
    id: "credit_card",
    label: "Credit Card",
    group: "Balance Sheet",
    baseType: "Liability",
    codePrefix: "21",
    description: "Tracks balances owed on corporate credit card accounts used for business expenditures. Normal balance: Credit.",
    examples: ["Corporate Visa/Mastercard", "Executive travel cards", "Supplier charge cards"],
    detailTypes: ["Credit Card", "Corporate Revolving Line"],
  },
  {
    id: "other_current_liabilities",
    label: "Other Current Liabilities",
    group: "Balance Sheet",
    baseType: "Liability",
    codePrefix: "22",
    description: "Debts and obligations due to be settled within one year, including government taxes collected. Normal balance: Credit.",
    examples: ["FBR Sales Tax collected payable", "Income tax withheld payable", "Accrued payroll & EOBI", "Customer advances"],
    detailTypes: ["Sales Tax Payable (FBR)", "Provincial Tax Payable (SRB/PRA)", "Payroll Taxes Withheld", "Customer Deposits / Unearned Revenue"],
  },
  {
    id: "long_term_liabilities",
    label: "Long Term Liabilities",
    group: "Balance Sheet",
    baseType: "Liability",
    codePrefix: "25",
    description: "Loans and financial obligations with repayment terms extending beyond one fiscal year. Normal balance: Credit.",
    examples: ["Commercial bank loans", "Equipment lease obligations", "Shareholder long-term loans"],
    detailTypes: ["Bank Loans Payable", "Notes Payable", "Mortgages Payable", "Director Financing"],
  },

  // Balance Sheet - Equity
  {
    id: "equity",
    label: "Equity",
    group: "Balance Sheet",
    baseType: "Equity",
    codePrefix: "30",
    description: "Represents the net worth of the business: total assets minus total liabilities. Normal balance: Credit.",
    examples: ["Paid-in capital", "Retained earnings", "Owner capital investments", "Partner draws"],
    detailTypes: ["Paid-In Capital", "Retained Earnings", "Owner Contributions", "Owner Draws", "Common Stock"],
  },

  // Profit & Loss - Income & COGS
  {
    id: "income",
    label: "Income / Revenue",
    group: "Profit & Loss",
    baseType: "Revenue",
    codePrefix: "40",
    description: "Revenue earned from your primary business operations, such as selling merchandise or rendering consulting services. Normal balance: Credit.",
    examples: ["Tax consulting fees", "Software licensing income", "Retail merchandise sales", "Audit service retainers"],
    detailTypes: ["Service / Fee Income", "Product Sales", "Consulting Revenue", "Discounts Given"],
  },
  {
    id: "other_income",
    label: "Other Income",
    group: "Profit & Loss",
    baseType: "Revenue",
    codePrefix: "45",
    description: "Incidental or non-operational revenue not generated from your primary business operations. Normal balance: Credit.",
    examples: ["Bank interest income", "Gain on foreign exchange", "Gain on sale of fixed assets", "Vendor rebates"],
    detailTypes: ["Interest Income", "FX Gain", "Asset Disposal Gain", "Miscellaneous Income"],
  },
  {
    id: "cogs",
    label: "Cost of Goods Sold (COGS)",
    group: "Profit & Loss",
    baseType: "Expense",
    codePrefix: "50",
    description: "Direct costs directly attributable to the production or acquisition of goods and services sold by the company. Normal balance: Debit.",
    examples: ["Direct material costs", "Subcontractor labor", "Inbound freight & duty", "Packaging materials"],
    detailTypes: ["Cost of Labor", "Freight & Delivery", "Direct Subcontractor Fees", "Material Supplies"],
  },

  // Profit & Loss - Expenses
  {
    id: "expense",
    label: "Expense",
    group: "Profit & Loss",
    baseType: "Expense",
    codePrefix: "51",
    description: "Ongoing operating costs incurred to run your daily business activities. Normal balance: Debit.",
    examples: ["Office rent", "Staff salaries & wages", "Electricity & utility bills", "Marketing & advertising", "Software subscriptions"],
    detailTypes: ["Rent or Lease", "Salaries & Benefits", "Advertising & Marketing", "Utilities", "Office Supplies", "Legal & Professional"],
  },
  {
    id: "other_expense",
    label: "Other Expense",
    group: "Profit & Loss",
    baseType: "Expense",
    codePrefix: "59",
    description: "Non-operational expenses or unexpected losses unrelated to core ongoing operations. Normal balance: Debit.",
    examples: ["Late tax penalties & fines", "Foreign exchange loss", "Loss on asset write-down"],
    detailTypes: ["Penalties & Fines", "Foreign Exchange Loss", "Loss on Disposal of Assets", "Other Miscellaneous Expense"],
  },
];

export const TAX_LINE_OPTIONS = [
  "Non-Taxable / No Tax Applicable",
  "FBR Sales Tax - Standard 18% (Supplies)",
  "FBR Sales Tax - Reduced 1% - 15%",
  "SRB Services Tax - Standard 13% (Sindh)",
  "PRA Services Tax - Standard 16% (Punjab)",
  "KPRA Services Tax - Standard 15% (KPK)",
  "BRA Services Tax - Standard 15% (Balochistan)",
  "WHT Sec 153 - Goods Withholding (5%)",
  "WHT Sec 153 - Services Withholding (11%)",
  "Zero Rated - Fifth Schedule (Export)",
  "Exempt - Sixth Schedule (Healthcare/Basic Food)",
];

interface AddAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingAccounts: Account[];
  onAccountCreated: (newAccount: Account) => void;
}

export function AddAccountDialog({
  open,
  onOpenChange,
  existingAccounts,
  onAccountCreated,
}: AddAccountDialogProps) {
  const [selectedType, setSelectedType] = React.useState<AccountTypeOption>(ACCOUNT_TYPE_OPTIONS[0]);

  // Form Fields
  const [detailType, setDetailType] = React.useState<string>(ACCOUNT_TYPE_OPTIONS[0].detailTypes[0]);
  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState("");
  const [isSubAccount, setIsSubAccount] = React.useState(false);
  const [parentId, setParentId] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [taxLine, setTaxLine] = React.useState(TAX_LINE_OPTIONS[0]);
  const [currency, setCurrency] = React.useState("PKR");
  const [openingBalance, setOpeningBalance] = React.useState("");
  const [openingBalanceDate, setOpeningBalanceDate] = React.useState(
    new Date().toISOString().split("T")[0]
  );

  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Auto-generate code when account type changes if code is blank or matches a default pattern
  React.useEffect(() => {
    setDetailType(selectedType.detailTypes[0]);
    // Suggest sequential code based on prefix
    const existingWithPrefix = existingAccounts
      .filter((a) => a.code.startsWith(selectedType.codePrefix))
      .map((a) => parseInt(a.code, 10))
      .filter((n) => !isNaN(n));

    const nextCodeNum = existingWithPrefix.length > 0 ? Math.max(...existingWithPrefix) + 10 : parseInt(`${selectedType.codePrefix}00`, 10) + 10;
    setCode(String(nextCodeNum));
  }, [selectedType, existingAccounts]);

  const handleSelectType = (opt: AccountTypeOption) => {
    setSelectedType(opt);
    setError(null);
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setIsSubAccount(false);
    setParentId("");
    setOpeningBalance("");
    setError(null);
  };

  const handleSave = async (closeAfterSave: boolean) => {
    if (!name.trim()) {
      setError("Account Name is required.");
      return;
    }
    if (!code.trim()) {
      setError("Account Code/Number is required.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        code: code.trim(),
        name: name.trim(),
        account_type: selectedType.baseType,
        sub_type: detailType,
        parent_id: isSubAccount && parentId ? parentId : null,
        tax_line: taxLine,
        currency,
        opening_balance: openingBalance ? parseFloat(openingBalance) : 0,
        opening_balance_date: openingBalance ? openingBalanceDate : null,
        description: description.trim() || null,
      };

      const res = await fetch("/api/accounting/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create account.");
      }

      onAccountCreated(data.account);
      resetForm();

      if (closeAfterSave) {
        onOpenChange(false);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred while saving the account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter possible parent accounts by matching baseType
  const potentialParents = existingAccounts.filter(
    (a) => a.account_type === selectedType.baseType && !a.parent_id
  );

  const isBalanceSheet = selectedType.group === "Balance Sheet";

  return (
    <Dialog open={open} onOpenChange={onOpenChange} className="max-w-5xl p-0 overflow-hidden border-[#343e47] bg-[#f8fafc]">
      {/* Dialog Title Bar (QuickBooks Style) */}
      <div className="flex h-11 items-center justify-between border-b border-[#343e47] bg-[#1e252b] px-4 text-white">
        <div className="flex items-center gap-2">
          <Landmark className="h-4 w-4 text-[#0078d4]" />
          <span className="text-xs font-bold uppercase tracking-wider">Add New Account — Chart of Accounts</span>
        </div>
        <span className="text-[10px] text-[#94a3b8] font-mono">GAAP & FBR Standard</span>
      </div>

      {error && (
        <div className="flex items-center gap-2 border-b border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Two-Panel Content */}
      <div className="grid grid-cols-1 md:grid-cols-12 min-h-[520px]">
        {/* Left Panel: Account Type Selection (Categorized) */}
        <div className="md:col-span-4 border-r border-[#e2e8f0] bg-[#f1f5f9] p-3 overflow-y-auto max-h-[600px] custom-desktop-scrollbar">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748b] px-2 mb-2">
            Choose Account Type
          </div>

          {/* Group 1: Balance Sheet */}
          <div className="mb-4">
            <div className="px-2 py-1 text-[10px] font-bold text-slate-700 bg-slate-200/60 rounded mb-1 flex items-center justify-between">
              <span>Balance Sheet Accounts</span>
              <span className="text-[9px] text-slate-500 font-mono">Assets, Liab, Equity</span>
            </div>
            <div className="space-y-0.5">
              {ACCOUNT_TYPE_OPTIONS.filter((o) => o.group === "Balance Sheet").map((opt) => {
                const isSelected = selectedType.id === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectType(opt)}
                    className={`w-full flex items-center justify-between rounded px-2.5 py-1.5 text-xs text-left transition-colors ${
                      isSelected
                        ? "bg-[#0078d4] text-white font-semibold shadow-xs"
                        : "text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    <span>{opt.label}</span>
                    <span className={`text-[10px] font-mono ${isSelected ? "text-white/80" : "text-slate-400"}`}>
                      {opt.codePrefix}xx
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Group 2: Profit & Loss */}
          <div>
            <div className="px-2 py-1 text-[10px] font-bold text-slate-700 bg-slate-200/60 rounded mb-1 flex items-center justify-between">
              <span>Profit & Loss Accounts</span>
              <span className="text-[9px] text-slate-500 font-mono">Income & Expenses</span>
            </div>
            <div className="space-y-0.5">
              {ACCOUNT_TYPE_OPTIONS.filter((o) => o.group === "Profit & Loss").map((opt) => {
                const isSelected = selectedType.id === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectType(opt)}
                    className={`w-full flex items-center justify-between rounded px-2.5 py-1.5 text-xs text-left transition-colors ${
                      isSelected
                        ? "bg-[#0078d4] text-white font-semibold shadow-xs"
                        : "text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    <span>{opt.label}</span>
                    <span className={`text-[10px] font-mono ${isSelected ? "text-white/80" : "text-slate-400"}`}>
                      {opt.codePrefix}xx
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Panel: Contextual Guidance Banner + Setup Form */}
        <div className="md:col-span-8 p-4 md:p-5 flex flex-col justify-between overflow-y-auto max-h-[600px] bg-white">
          <div className="space-y-4">
            {/* Contextual Banner */}
            <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-3.5 text-xs text-slate-800">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-[#0078d4] text-sm flex items-center gap-1.5">
                  <Landmark className="h-4 w-4" />
                  {selectedType.label}
                </span>
                <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-800 uppercase">
                  {selectedType.group} • {selectedType.baseType}
                </span>
              </div>
              <p className="text-slate-600 text-xs leading-relaxed mt-1">
                {selectedType.description}
              </p>
              <div className="mt-2 pt-2 border-t border-blue-200/60">
                <span className="font-semibold text-slate-700 text-[11px]">Typical transactions: </span>
                <span className="text-slate-600 text-[11px]">{selectedType.examples.join(", ")}</span>
              </div>
            </div>

            {/* High-Density Accounting Form */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              {/* Account Type (Readonly Confirmation) */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Account Type
                </label>
                <input
                  type="text"
                  disabled
                  value={`${selectedType.label} (${selectedType.baseType})`}
                  className="w-full rounded border border-slate-300 bg-slate-100 px-2.5 py-1.5 text-xs text-slate-600 cursor-not-allowed"
                />
              </div>

              {/* Detail Type / Subtype */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Detail Type / Sub-type <span className="text-rose-500">*</span>
                </label>
                <select
                  value={detailType}
                  onChange={(e) => setDetailType(e.target.value)}
                  className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-[#0078d4] focus:outline-none"
                >
                  {selectedType.detailTypes.map((dt) => (
                    <option key={dt} value={dt}>
                      {dt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Account Name */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Account Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Meezan Bank Islamic Checking"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-[#0078d4] focus:outline-none"
                />
              </div>

              {/* Account Code / Number */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Account Code / Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1025"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-800 focus:border-[#0078d4] focus:outline-none"
                />
              </div>

              {/* Sub-account Checkbox and Parent Selector */}
              <div className="sm:col-span-2 rounded border border-slate-200 bg-slate-50/60 p-2.5 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700 select-none">
                  <input
                    type="checkbox"
                    checked={isSubAccount}
                    onChange={(e) => setIsSubAccount(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-[#0078d4] focus:ring-[#0078d4]"
                  />
                  <span>Is sub-account of parent account</span>
                </label>

                {isSubAccount && (
                  <div className="pl-5 pt-1">
                    <select
                      value={parentId}
                      onChange={(e) => setParentId(e.target.value)}
                      className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-[#0078d4] focus:outline-none"
                    >
                      <option value="">-- Select Parent {selectedType.baseType} Account --</option>
                      {potentialParents.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.code} - {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Description / Notes
                </label>
                <input
                  type="text"
                  placeholder="Optional internal purpose notes or bank IBAN"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-[#0078d4] focus:outline-none"
                />
              </div>

              {/* Tax Code / Tax Line Mapping */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tax Line / Reporting Mapping
                </label>
                <select
                  value={taxLine}
                  onChange={(e) => setTaxLine(e.target.value)}
                  className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-[#0078d4] focus:outline-none"
                >
                  {TAX_LINE_OPTIONS.map((tl) => (
                    <option key={tl} value={tl}>
                      {tl}
                    </option>
                  ))}
                </select>
              </div>

              {/* Currency Selector */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-[#0078d4] focus:outline-none"
                >
                  <option value="PKR">PKR - Pakistani Rupee (Base Currency)</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="AED">AED - UAE Dirham</option>
                  <option value="SAR">SAR - Saudi Riyal</option>
                </select>
              </div>

              {/* Opening Balance (Only shown for Balance Sheet accounts) */}
              {isBalanceSheet && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Opening Balance
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={openingBalance}
                      onChange={(e) => setOpeningBalance(e.target.value)}
                      className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-800 focus:border-[#0078d4] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      As of Date
                    </label>
                    <input
                      type="date"
                      value={openingBalanceDate}
                      onChange={(e) => setOpeningBalanceDate(e.target.value)}
                      className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-[#0078d4] focus:outline-none"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between border-t border-slate-200 pt-4 mt-6">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSave(false)}
                disabled={isSubmitting}
                className="rounded border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Save & New
              </button>
              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={isSubmitting}
                className="rounded bg-[#0078d4] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#006bbd] shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSubmitting && <span className="animate-spin text-white">⟳</span>}
                Save & Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
