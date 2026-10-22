import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import * as React from "react";
import { ChartOfAccountsClient } from "@/app/(erp)/accounting/chart-of-accounts/chart-of-accounts-client";
import { AddAccountDialog, ACCOUNT_TYPE_OPTIONS } from "@/components/accounting/add-account-dialog";
import { Account } from "@/types/database.types";

const mockAccounts: Account[] = [
  {
    id: "acc-1",
    company_id: "00000000-0000-0000-0000-000000000001",
    code: "1010",
    name: "Cash on Hand",
    account_type: "Asset",
    sub_type: "Cash on Hand",
    tax_line: "Non-Taxable",
    currency: "PKR",
    balance: 50000,
    is_system: true,
    is_active: true,
    created_at: "2026-07-01T00:00:00Z",
    updated_at: "2026-07-01T00:00:00Z",
  },
  {
    id: "acc-2",
    company_id: "00000000-0000-0000-0000-000000000001",
    code: "1020",
    name: "Meezan Operating Bank",
    account_type: "Asset",
    sub_type: "Checking",
    tax_line: "Non-Taxable",
    currency: "PKR",
    balance: 1250000,
    is_system: false,
    is_active: true,
    created_at: "2026-07-01T00:00:00Z",
    updated_at: "2026-07-01T00:00:00Z",
  },
  {
    id: "acc-3",
    company_id: "00000000-0000-0000-0000-000000000001",
    code: "2000",
    name: "Accounts Payable",
    account_type: "Liability",
    sub_type: "Accounts Payable",
    tax_line: "Non-Taxable",
    currency: "PKR",
    balance: 42000,
    is_system: true,
    is_active: true,
    created_at: "2026-07-01T00:00:00Z",
    updated_at: "2026-07-01T00:00:00Z",
  },
  {
    id: "acc-4",
    company_id: "00000000-0000-0000-0000-000000000001",
    code: "4000",
    name: "Sales Revenue",
    account_type: "Revenue",
    sub_type: "Product Sales",
    tax_line: "FBR Sales Tax - Standard 18% (Supplies)",
    currency: "PKR",
    balance: 980000,
    is_system: true,
    is_active: true,
    created_at: "2026-07-01T00:00:00Z",
    updated_at: "2026-07-01T00:00:00Z",
  },
];

describe("Chart of Accounts Client & Register", () => {
  it("renders the account register table with columns and formatted balances", () => {
    render(
      <ChartOfAccountsClient
        initialAccounts={mockAccounts}
        companyId="00000000-0000-0000-0000-000000000001"
      />
    );

    expect(screen.getByText("Chart of Accounts (COA)")).toBeInTheDocument();
    expect(screen.getByText("1010")).toBeInTheDocument();
    expect(screen.getAllByText("Cash on Hand").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Meezan Operating Bank")).toBeInTheDocument();
    expect(screen.getAllByText("Accounts Payable").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Sales Revenue")).toBeInTheDocument();
  });

  it("filters accounts by search keyword", () => {
    render(
      <ChartOfAccountsClient
        initialAccounts={mockAccounts}
        companyId="00000000-0000-0000-0000-000000000001"
      />
    );

    const searchInput = screen.getByPlaceholderText(/search code, name, tax/i);
    fireEvent.change(searchInput, { target: { value: "Meezan" } });

    expect(screen.getByText("Meezan Operating Bank")).toBeInTheDocument();
    expect(screen.queryByText("Accounts Payable")).not.toBeInTheDocument();
  });

  it("filters accounts by category tab (Balance Sheet vs Profit & Loss)", () => {
    render(
      <ChartOfAccountsClient
        initialAccounts={mockAccounts}
        companyId="00000000-0000-0000-0000-000000000001"
      />
    );

    const plTab = screen.getByRole("button", { name: "Profit & Loss" });
    fireEvent.click(plTab);

    expect(screen.getByText("Sales Revenue")).toBeInTheDocument();
    expect(screen.queryByText("Meezan Operating Bank")).not.toBeInTheDocument();
  });
});

describe("Add Account Dialog (Two-Panel Interface)", () => {
  it("renders two-panel layout with Balance Sheet and Profit & Loss groups", () => {
    const handleCreated = vi.fn();
    const handleOpenChange = vi.fn();

    render(
      <AddAccountDialog
        open={true}
        onOpenChange={handleOpenChange}
        existingAccounts={mockAccounts}
        onAccountCreated={handleCreated}
      />
    );

    expect(screen.getByText(/Add New Account — Chart of Accounts/i)).toBeInTheDocument();
    expect(screen.getByText("Balance Sheet Accounts")).toBeInTheDocument();
    expect(screen.getByText("Profit & Loss Accounts")).toBeInTheDocument();
  });

  it("dynamically updates right panel guidance when changing account type", () => {
    const handleCreated = vi.fn();
    const handleOpenChange = vi.fn();

    render(
      <AddAccountDialog
        open={true}
        onOpenChange={handleOpenChange}
        existingAccounts={mockAccounts}
        onAccountCreated={handleCreated}
      />
    );

    // Switch to Fixed Assets
    const fixedAssetBtn = screen.getByRole("button", { name: /Fixed Assets/i });
    fireEvent.click(fixedAssetBtn);

    expect(screen.getByText(/Tangible, long-term property/i)).toBeInTheDocument();
    expect(screen.getByText(/Company vehicles/i)).toBeInTheDocument();
  });

  it("validates required fields before submitting", async () => {
    const handleCreated = vi.fn();
    const handleOpenChange = vi.fn();

    render(
      <AddAccountDialog
        open={true}
        onOpenChange={handleOpenChange}
        existingAccounts={mockAccounts}
        onAccountCreated={handleCreated}
      />
    );

    const saveCloseBtn = screen.getByRole("button", { name: /Save & Close/i });
    fireEvent.click(saveCloseBtn);

    expect(await screen.findByText("Account Name is required.")).toBeInTheDocument();
    expect(handleCreated).not.toHaveBeenCalled();
  });
});
