import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getCustomerGroups,
  createCustomerGroup,
  updateCustomerGroup,
  deleteCustomerGroup,
  getCustomerCategories,
  createCustomerCategory,
  updateCustomerCategory,
  deleteCustomerCategory,
  toggleCustomerStatus,
  bulkDeleteCustomers,
  exportCustomersToCsv,
  importCustomersFromCsv,
} from "@/lib/crm/customer-settings";
import {
  createCustomer,
  getCustomers,
  getCustomerById,
  resetMemoryCRMStore,
} from "@/lib/crm/server";
import { POST as verifyTaxNumberRoute } from "@/app/api/verify-tax-number/route";

const { ForbiddenError, mockRequireUser, mockRequirePermission, mockRecordAuditLog } = vi.hoisted(() => {
  class ForbiddenError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "ForbiddenError";
    }
  }
  return {
    ForbiddenError,
    mockRequireUser: vi.fn(),
    mockRequirePermission: vi.fn(),
    mockRecordAuditLog: vi.fn(),
  };
});

vi.mock("@/lib/auth/server", () => ({
  ForbiddenError,
  requireUser: () => mockRequireUser(),
  getCurrentUser: () => mockRequireUser(),
  requirePermission: (companyId: string, perm: string, user?: any) =>
    mockRequirePermission(companyId, perm, user),
  requireCompanyMembership: (companyId: string, user?: any) =>
    mockRequirePermission(companyId, "crm:view", user),
}));

vi.mock("@/lib/audit/server", () => ({
  recordAuditLog: (...args: any[]) => mockRecordAuditLog(...args),
}));

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockImplementation(async () => ({
    from: mockFrom,
  })),
}));

const TEST_COMPANY_ID = "00000000-0000-0000-0000-000000000001";

const standardUser = {
  id: "user-123",
  email: "admin@ubiz.site",
  full_name: "UNAZ Admin",
  is_super_admin: false,
};

describe("UNAZ ERP Customer Management & Verification Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireUser.mockResolvedValue(standardUser);
    mockRequirePermission.mockResolvedValue({
      membership: { id: "mem-1" },
      role: { code: "manager" },
      permissions: ["crm:view", "crm:create", "crm:edit", "crm:delete"],
    });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: "table pending" } }),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    });
    resetMemoryCRMStore();
  });

  describe("Customer Groups Management (UNAZ Parity)", () => {
    it("returns pre-seeded customer groups with calculated customer counts", async () => {
      const groups = await getCustomerGroups(TEST_COMPANY_ID);
      expect(groups.length).toBeGreaterThanOrEqual(4);
      expect(groups.some((g) => g.name === "General")).toBe(true);
      expect(groups.some((g) => g.name === "Wholesale Traders")).toBe(true);
      expect(groups.every((g) => typeof g.customer_count === "number")).toBe(true);
    });

    it("creates a new customer group and prevents duplicates", async () => {
      const res = await createCustomerGroup(TEST_COMPANY_ID, {
        name: "Key Corporate Accounts",
        description: "Special trade terms and delayed invoicing",
      });
      expect(res.success).toBe(true);
      expect(res.data?.name).toBe("Key Corporate Accounts");

      // Attempt duplicate
      const dup = await createCustomerGroup(TEST_COMPANY_ID, {
        name: "Key Corporate Accounts",
      });
      expect(dup.success).toBe(false);
      expect(dup.error).toContain("already exists");
    });

    it("updates existing customer group details", async () => {
      const created = await createCustomerGroup(TEST_COMPANY_ID, {
        name: "Specialty Retailers",
        description: "Initial description",
      });
      expect(created.success).toBe(true);

      const updated = await updateCustomerGroup(TEST_COMPANY_ID, created.data!.id, {
        name: "Specialty Retailers & Boutique",
        description: "Updated description",
      });
      expect(updated.success).toBe(true);
      expect(updated.data?.name).toBe("Specialty Retailers & Boutique");
    });
  });

  describe("Customer Categories Management (UNAZ Parity)", () => {
    it("returns pre-seeded customer categories with calculated customer counts", async () => {
      const cats = await getCustomerCategories(TEST_COMPANY_ID);
      expect(cats.length).toBeGreaterThanOrEqual(4);
      expect(cats.some((c) => c.name === "Tier 1 Priority")).toBe(true);
      expect(cats.some((c) => c.name === "Standard Commercial")).toBe(true);
      expect(cats.every((c) => typeof c.customer_count === "number")).toBe(true);
    });

    it("creates a new customer category and prevents duplicates", async () => {
      const res = await createCustomerCategory(TEST_COMPANY_ID, {
        name: "Institutional Buyers",
        description: "Colleges and healthcare organizations",
      });
      expect(res.success).toBe(true);
      expect(res.data?.name).toBe("Institutional Buyers");

      const dup = await createCustomerCategory(TEST_COMPANY_ID, {
        name: "Institutional Buyers",
      });
      expect(dup.success).toBe(false);
      expect(dup.error).toContain("already exists");
    });
  });

  describe("Customer Status Toggle & Bulk Actions", () => {
    it("toggles customer status between Active and Inactive/Disabled", async () => {
      const cust = await createCustomer(TEST_COMPANY_ID, {
        name: "Status Test Client",
        status: "Active",
      });
      expect(cust.success).toBe(true);
      const customerId = cust.data!.id;

      // Toggle to Inactive / Disabled
      const res1 = await toggleCustomerStatus(TEST_COMPANY_ID, customerId, "Disabled");
      expect(res1.success).toBe(true);
      expect(res1.newStatus).toBe("Inactive");

      // Toggle back to Active
      const res2 = await toggleCustomerStatus(TEST_COMPANY_ID, customerId, "Active");
      expect(res2.success).toBe(true);
      expect(res2.newStatus).toBe("Active");
    });

    it("bulk deletes selected customers", async () => {
      const c1 = await createCustomer(TEST_COMPANY_ID, { name: "Client A" });
      const c2 = await createCustomer(TEST_COMPANY_ID, { name: "Client B" });
      expect(c1.success).toBe(true);
      expect(c2.success).toBe(true);

      const bulkRes = await bulkDeleteCustomers(TEST_COMPANY_ID, [c1.data!.id, c2.data!.id]);
      expect(bulkRes.success).toBe(true);
      expect(bulkRes.deletedCount).toBe(2);
    });
  });

  describe("Customer CSV Export & Import (UNAZ Specification)", () => {
    it("exports customer data to CSV with all statutory UNAZ columns", async () => {
      await createCustomer(TEST_COMPANY_ID, {
        name: "Khyber Trading Co",
        companyName: "Khyber Trading",
        contactPerson: "Gul Khan",
        email: "gul@khyber.pk",
        mobileNumber: "03331234567",
        customerType: "Retailer",
        ntnNumber: "1234567-8",
        cnicNumber: "16101-5419566-3",
        salesTaxRegType: "Registered",
        salesTaxAtl: "Active",
        incomeTaxAtl: "Active",
        customerCategory: "Standard Commercial",
        customerGroup: "Wholesale Traders",
        openingBalance: 25000,
        creditLimit: 500000,
        paymentTerms: "Net 30",
        carriedBy: "Ahmed Raza",
        billingAddress: "Shop 12, Karkhano Market",
        city: "Peshawar",
        state: "Khyber Pakhtunkhwa",
        country: "Pakistan",
      });

      const csv = await exportCustomersToCsv(TEST_COMPANY_ID);
      expect(csv).toContain("Customer Code");
      expect(csv).toContain("Company Name");
      expect(csv).toContain("Sales Tax Reg Type");
      expect(csv).toContain("Sales Tax ATL");
      expect(csv).toContain("Income Tax ATL");
      expect(csv).toContain("Khyber Trading");
      expect(csv).toContain("16101-5419566-3");
      expect(csv).toContain("1234567-8");
    });

    it("parses and tests CSV import without committing", async () => {
      const csv = `Customer Code,Company Name,Contact Person,Email,Mobile No,Customer Type,NTN Number,CNIC Number,STRN Number,Sales Tax Reg Type,Sales Tax ATL,Income Tax ATL,Customer Category,Customer Group,Opening Balance,Credit Limit,Payment Terms,Carried By,Billing Address,City,State,Zip Code,Country,Status
CUST-901,"Sindh Agro Chemical","Rashid Khan","rashid@sindhagro.pk","03112223334","Retailer","3214567-9","42101-1234567-1","","Registered","Active","Active","General","General",50000,1000000,"Net 15","Ali Haider","Site Area","Karachi","Sindh","75000","Pakistan","Active"`;

      const testRes = await importCustomersFromCsv(TEST_COMPANY_ID, csv, false);
      expect(testRes.validRows).toBe(1);
      expect(testRes.errorRows.length).toBe(0);
      expect(testRes.insertedCount).toBe(0); // Test only, no commit
    });

    it("commits CSV import and registers new customers", async () => {
      const csv = `Customer Code,Company Name,Contact Person,Email,Mobile No,Customer Type,NTN Number,CNIC Number,STRN Number,Sales Tax Reg Type,Sales Tax ATL,Income Tax ATL,Customer Category,Customer Group,Opening Balance,Credit Limit,Payment Terms,Carried By,Billing Address,City,State,Zip Code,Country,Status
CUST-902,"Balochistan Mineral Corp","Nasir Baloch","nasir@bmc.pk","03451112223","WS / Distributor","9876543-2","54400-9876543-1","","Registered","Active","Active","Tier 1 Priority","Corporate Accounts",100000,5000000,"Net 30","Qasim Jan","Spiny Road","Quetta","Balochistan","87300","Pakistan","Active"`;

      const commitRes = await importCustomersFromCsv(TEST_COMPANY_ID, csv, true);
      expect(commitRes.validRows).toBe(1);
      expect(commitRes.insertedCount).toBe(1);

      const custs = await getCustomers(TEST_COMPANY_ID, { search: "Balochistan Mineral" });
      expect(custs.total).toBe(1);
      expect(custs.data[0].company_name).toBe("Balochistan Mineral Corp");
      expect(custs.data[0].customer_group).toBe("Corporate Accounts");
    });
  });

  describe("UNAZ Tax Verification API Endpoint (/api/verify-tax-number)", () => {
    it("handles tax verification and returns registration_type, sales_tax_atl_status, and income_tax_atl_status", async () => {
      const req = new Request("http://localhost:3000/api/verify-tax-number", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cnic_number: "16101-5419566-3",
          trade_category: "Retailer",
        }),
      });

      const res = await verifyTaxNumberRoute(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.registration_type).toBeDefined();
      expect(json.sales_tax_atl_status).toBeDefined();
      expect(json.income_tax_atl_status).toBeDefined();
    });
  });

  describe("Shipping Address and Advance Balance Support", () => {
    it("preserves shipping address and advance balance during creation and retrieval", async () => {
      const created = await createCustomer(TEST_COMPANY_ID, {
        name: "Faisalabad Fabrics",
        companyName: "Faisalabad Fabrics Ltd",
        billingName: "Accounts Dept",
        billingAddress: "Millat Road, Factory Area",
        city: "Faisalabad",
        state: "Punjab",
        shippingName: "Dispatch Warehouse 3",
        shippingAddress: "Jhang Road, Gate 2",
        shippingCity: "Faisalabad",
        shippingState: "Punjab",
        shippingCountry: "Pakistan",
        shippingZipCode: "38000",
        sameAsBilling: false,
        advanceBalance: 75000,
        openingBalance: 12000,
      });

      expect(created.success).toBe(true);
      expect(created.data?.shipping_name).toBe("Dispatch Warehouse 3");
      expect(created.data?.shipping_address).toBe("Jhang Road, Gate 2");
      expect(created.data?.advance_balance).toBe(75000);

      const fetched = await getCustomerById(TEST_COMPANY_ID, created.data!.id);
      expect(fetched).not.toBeNull();
      expect(fetched?.customer.shipping_name).toBe("Dispatch Warehouse 3");
      expect(fetched?.customer.advance_balance).toBe(75000);
    });
  });

  describe("UNAZ Customer Payments, Batch Clearance & Customer Ledger", () => {
    it("starts with empty customer payments list without demo seed data", async () => {
      const { getCustomerPayments, resetMemoryPaymentsStore } = await import("@/lib/crm/customer-payments");
      resetMemoryPaymentsStore();
      const payments = await getCustomerPayments(TEST_COMPANY_ID);
      expect(payments.length).toBe(0);
    });

    it("creates a customer payment and updates customer balances", async () => {
      const { createCustomerPayment, getCustomerPayments } = await import("@/lib/crm/customer-payments");
      const res = await createCustomerPayment(TEST_COMPANY_ID, {
        customer_id: "c-1",
        customer_name: "Gul Muhammad Traders",
        payment_date: "2026-06-26",
        payment_method: "Bank Transfer",
        payment_amount: 50000,
        reference_number: "TRX-998877",
        notes: "Advance payment clearance",
      });

      expect(res.success).toBe(true);
      expect(res.data?.payment_number).toMatch(/^CP-/);
      expect(res.data?.payment_amount).toBe(50000);

      const all = await getCustomerPayments(TEST_COMPANY_ID, { search: "TRX-998877" });
      expect(all.length).toBe(1);
    });

    it("processes batch payments across multiple invoices/dues", async () => {
      const { recordBatchPayments } = await import("@/lib/crm/customer-payments");
      const res = await recordBatchPayments(TEST_COMPANY_ID, [
        {
          customer_id: "c-1",
          customer_name: "Gul Muhammad Traders",
          amount: 25000,
          reference: "INV-2026-001",
        },
        {
          customer_id: "c-2",
          customer_name: "Dr Naseem Akhtar",
          amount: 35000,
          reference: "INV-2026-002",
        },
      ]);

      expect(res.success).toBe(true);
      expect(res.processedCount).toBe(2);
    });

    it("computes customer ledger running debit, credit, and net balances", async () => {
      const { getCustomerLedger } = await import("@/lib/crm/customer-payments");
      const ledger = await getCustomerLedger(TEST_COMPANY_ID, "c-1");

      expect(ledger.entries.length).toBeGreaterThanOrEqual(1);
      expect(typeof ledger.totalDebit).toBe("number");
      expect(typeof ledger.totalCredit).toBe("number");
      expect(typeof ledger.closingBalance).toBe("number");
      expect(ledger.entries.every((e) => typeof e.balance === "number")).toBe(true);
    });
  });
});
