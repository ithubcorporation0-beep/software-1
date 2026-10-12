import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  archiveCustomer,
  deleteCustomer,
  addCustomerNote,
  createLead,
  getLeads,
  moveLeadStage,
} from "@/lib/crm/server";
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
  requirePermission: (companyId: string, perm: string, user?: any) =>
    mockRequirePermission(companyId, perm, user),
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

describe("CRM Module: Customers & Lead Pipeline", () => {
  const companyA = "00000000-0000-0000-0000-000000000001";
  const companyB = "00000000-0000-0000-0000-000000000002";

  const standardUser = {
    id: "user-123",
    email: "rep@company.com",
    full_name: "Sales Representative",
    is_super_admin: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireUser.mockResolvedValue(standardUser);
    mockRequirePermission.mockResolvedValue({
      membership: { id: "mem-1" },
      role: { code: "manager" },
      permissions: ["crm:view", "crm:create", "crm:edit", "crm:delete"],
    });

    // Default supabase mock returning empty or error to engage resilient store
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: "table pending" } }),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({ data: null, error: { message: "table pending" } }),
          }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: "table pending" } }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: { message: "table pending" } }),
            }),
          }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    });
  });

  describe("1. Customer CRUD & Validations", () => {
    it("creates a customer with valid fields and generates customer code", async () => {
      const res = await createCustomer(companyA, {
        name: "Acme Industrial Corp",
        companyName: "Acme Holdings LLC",
        email: "contact@acme.com",
        phone: "+1-555-0199",
        customerType: "Enterprise",
        status: "Active",
      });

      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();
      expect(res.data?.name).toBe("Acme Industrial Corp");
      expect(res.data?.customer_code).toMatch(/^CUST-\d+$/);
      expect(res.data?.company_id).toBe(companyA);

      // Verify audit log
      expect(mockRecordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: companyA,
          action: "crm.customer_create",
          resource: "customers",
        })
      );
    });

    it("rejects creating customer with invalid email format", async () => {
      const res = await createCustomer(companyA, {
        name: "Invalid Customer",
        email: "not-an-email",
      });

      expect(res.success).toBe(false);
      expect(res.errors?.email).toBeDefined();
    });

    it("prevents creating duplicate customer with identical email in the same company", async () => {
      const uniqueEmail = `duplicate-${Date.now()}@acme.corp`;
      const res1 = await createCustomer(companyA, {
        name: "First Customer",
        email: uniqueEmail,
      });
      expect(res1.success).toBe(true);

      const res2 = await createCustomer(companyA, {
        name: "Second Customer",
        email: uniqueEmail,
      });
      expect(res2.success).toBe(false);
      expect(res2.error).toMatch(/already exists/i);
    });

    it("updates customer profile and records audit trail", async () => {
      const created = await createCustomer(companyA, {
        name: "Original Name",
        email: `update-${Date.now()}@test.com`,
      });

      const customerId = created.data!.id;
      const updated = await updateCustomer(companyA, customerId, {
        name: "Updated Corporate Name",
        companyName: "New Entity LLC",
        customerType: "B2B",
        status: "Active",
      });

      expect(updated.success).toBe(true);
      expect(updated.data?.name).toBe("Updated Corporate Name");
      expect(updated.data?.company_name).toBe("New Entity LLC");
    });

    it("safely archives a customer without deletion", async () => {
      const created = await createCustomer(companyA, {
        name: "Archive Target",
        email: `archive-${Date.now()}@test.com`,
      });

      const res = await archiveCustomer(companyA, created.data!.id);
      expect(res.success).toBe(true);

      const detail = await getCustomerById(companyA, created.data!.id);
      expect(detail?.customer.status).toBe("Archived");
    });

    it("blocks destructive deletion if customer has financial spend", async () => {
      const created = await createCustomer(companyA, {
        name: "Valued Customer",
        email: `spend-${Date.now()}@test.com`,
      });

      // Simulate recorded financial history
      created.data!.total_spend = 15000.0;

      const res = await deleteCustomer(companyA, created.data!.id);
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/Destructive Deletion Blocked/i);
    });

    it("allows deleting customer when total spend is zero", async () => {
      const created = await createCustomer(companyA, {
        name: "Zero Spend Customer",
        email: `zero-${Date.now()}@test.com`,
      });

      const res = await deleteCustomer(companyA, created.data!.id);
      expect(res.success).toBe(true);

      const detail = await getCustomerById(companyA, created.data!.id);
      expect(detail).toBeNull();
    });
  });

  describe("2. Customer Notes & Timeline History", () => {
    it("adds internal note and appends to customer activity history", async () => {
      const created = await createCustomer(companyA, {
        name: "Notes Prospect",
        email: `notes-${Date.now()}@test.com`,
      });

      const noteRes = await addCustomerNote(
        companyA,
        created.data!.id,
        "Confirmed follow-up call with VP of Engineering on Thursday."
      );

      expect(noteRes.success).toBe(true);
      expect(noteRes.data?.content).toContain("VP of Engineering");

      const detail = await getCustomerById(companyA, created.data!.id);
      expect(detail?.notes.length).toBeGreaterThan(0);
      expect(detail?.activities.length).toBeGreaterThan(0);
    });
  });

  describe("3. Lead Kanban Pipeline & Stage Transitions", () => {
    it("creates a lead in the New stage and computes pipeline valuation", async () => {
      const res = await createLead(companyA, {
        name: "Prospect Alice",
        companyName: "Stark Tech",
        source: "Website",
        status: "New",
        expectedValue: 25000,
      });

      expect(res.success).toBe(true);
      expect(res.data?.status).toBe("New");
      expect(res.data?.expected_value).toBe(25000);

      const pipeline = await getLeads(companyA);
      expect(pipeline.totalPipelineValue).toBeGreaterThanOrEqual(25000);
    });

    it("moves lead between pipeline stages and logs stage change audit event", async () => {
      const created = await createLead(companyA, {
        name: "Negotiation Lead",
        companyName: "Wayne Enterprises",
        source: "Referral",
        status: "Qualified",
        expectedValue: 50000,
      });

      const leadId = created.data!.id;

      // Move to Proposal
      const moveRes = await moveLeadStage(companyA, leadId, "Proposal");
      expect(moveRes.success).toBe(true);
      expect(moveRes.data?.status).toBe("Proposal");

      expect(mockRecordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "crm.lead_stage_change",
          resource: "leads",
          details: expect.objectContaining({
            newStatus: "Proposal",
          }),
        })
      );
    });

    it("records lost reason when moving stage to Closed Lost", async () => {
      const created = await createLead(companyA, {
        name: "Lost Prospect",
        source: "Cold Outreach",
        status: "Proposal",
        expectedValue: 12000,
      });

      const moveRes = await moveLeadStage(
        companyA,
        created.data!.id,
        "Lost",
        "Competitor offered 30% discount"
      );

      expect(moveRes.success).toBe(true);
      expect(moveRes.data?.status).toBe("Lost");
      expect(moveRes.data?.lost_reason).toBe("Competitor offered 30% discount");
    });
  });

  describe("4. Multi-Tenant Isolation (Company A vs Company B)", () => {
    it("prevents Company B from viewing Company A customer details", async () => {
      const createdInA = await createCustomer(companyA, {
        name: "Secret Tenant A Customer",
        email: `secret-${Date.now()}@companyA.com`,
      });

      // Query from Company B
      const detailFromB = await getCustomerById(companyB, createdInA.data!.id);
      expect(detailFromB).toBeNull();
    });

    it("fails closed when caller does not possess crm:view permission", async () => {
      mockRequirePermission.mockRejectedValueOnce(
        new ForbiddenError("Access Denied: Missing crm:view")
      );

      await expect(getCustomers(companyA)).rejects.toThrow(ForbiddenError);
    });
  });
});
