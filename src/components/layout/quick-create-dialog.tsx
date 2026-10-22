"use client";

import * as React from "react";
import Link from "next/link";
import {
  FileText,
  CreditCard,
  UserPlus,
  Receipt,
  ShoppingBag,
  BookOpen,
  ArrowRightLeft,
  PackagePlus,
  Users,
  PlusCircle,
  FileSpreadsheet,
  X,
  Landmark,
  Scale,
  ClipboardList,
} from "lucide-react";
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface QuickCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickCreateDialog({ open, onOpenChange }: QuickCreateDialogProps) {
  const sections = [
    {
      title: "Customers & Sales",
      items: [
        { label: "Sales Invoice", href: "/sales", icon: FileText, desc: "Bill customer for goods or services" },
        { label: "Receive Payment", href: "/account/customer-payments", icon: CreditCard, desc: "Record customer cash or bank receipt" },
        { label: "Sales Receipt", href: "/sales", icon: Receipt, desc: "Direct point-of-sale immediate cash payment" },
        { label: "Estimate / Quote", href: "/sales", icon: FileSpreadsheet, desc: "Provide commercial price quotation" },
        { label: "Credit Note / Refund", href: "/sales", icon: Receipt, desc: "Issue sales return or tax adjustment" },
        { label: "Add Customer", href: "/account/customers", icon: UserPlus, desc: "Register new business client" },
      ],
    },
    {
      title: "Vendors & Expenses",
      items: [
        { label: "Enter Bill", href: "/finance", icon: FileText, desc: "Log payable vendor invoice (A/P)" },
        { label: "Pay Bills", href: "/finance", icon: CreditCard, desc: "Disburse payments against vendor dues" },
        { label: "Record Expense", href: "/finance", icon: Receipt, desc: "Record direct cash/bank operational expense" },
        { label: "Purchase Order (PO)", href: "/inventory", icon: ShoppingBag, desc: "Issue supplier stock procurement order" },
        { label: "Vendor Credit", href: "/finance", icon: Receipt, desc: "Record credit memo from supplier" },
      ],
    },
    {
      title: "Accounting & Banking",
      items: [
        { label: "Journal Voucher (JV)", href: "/modules/accounting", icon: BookOpen, desc: "Post balanced double-entry GL adjustment" },
        { label: "Bank Transfer", href: "/modules/accounting", icon: ArrowRightLeft, desc: "Transfer funds between company accounts" },
        { label: "Reconcile Bank", href: "/modules/accounting", icon: Scale, desc: "Match bank statement against ledger" },
        { label: "Chart of Accounts (COA)", href: "/accounting/chart-of-accounts", icon: Landmark, desc: "Configure GL account codes and balances" },
      ],
    },
    {
      title: "Inventory & Staff",
      items: [
        { label: "Add Product / SKU", href: "/inventory", icon: PackagePlus, desc: "Add inventory stock item or service" },
        { label: "Inventory Adjustment", href: "/inventory", icon: ClipboardList, desc: "Adjust stock quantities or write-offs" },
        { label: "Employee Onboarding", href: "/hr", icon: Users, desc: "Add new personnel to payroll & HR" },
      ],
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange} className="max-w-4xl p-0 overflow-hidden border-[#343e47] bg-[#f8fafc]">
      <div className="p-4 bg-[#1e252b] text-white border-b border-[#343e47] flex items-center justify-between">
        <div>
          <DialogTitle className="text-sm font-bold flex items-center gap-2 text-white">
            <PlusCircle className="h-4 w-4 text-[#0078d4]" />
            Quick Create Transaction
          </DialogTitle>
          <DialogDescription className="text-xs text-[#94a3b8] mt-0.5">
            Quickly initiate a sales invoice, customer receipt, expense, bill, or accounting journal entry.
          </DialogDescription>
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3 bg-[#f8fafc] text-xs">
        {sections.map((sec) => (
          <div key={sec.title} className="bg-white rounded-lg border border-[#e2e8f0] p-3 shadow-xs flex flex-col justify-between">
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-2 pb-1 border-b border-[#f1f5f9]">
                {sec.title}
              </h4>
              <div className="space-y-1">
                {sec.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => onOpenChange(false)}
                      className="flex items-start gap-2 p-1.5 rounded-md hover:bg-[#f0f9ff] hover:text-[#0078d4] text-[#1e293b] transition-colors group cursor-pointer"
                    >
                      <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[#64748b] group-hover:text-[#0078d4]" />
                      <div className="min-w-0">
                        <span className="font-semibold block text-xs leading-none">{item.label}</span>
                        <span className="text-[10px] text-[#64748b] mt-0.5 block line-clamp-1">{item.desc}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Dialog>
  );
}
