import { describe, it, expect, beforeEach, vi } from "vitest";
import { submitInvoiceToFbrAction } from "@/lib/fbr-actions";
import { constructFbrInvoicePayload } from "@/lib/fbr-service";
import * as fbrApi from "@/lib/fbr-api";
import * as supabaseServer from "@/lib/supabase/server";

describe("FBR Digital Invoicing Server Action & Service", () => {
  const mockCompanyId = "00000000-0000-0000-0000-000000000001";
  const mockInvoiceId = "11111111-1111-1111-1111-111111111111";

  const mockInvoiceData = {
    id: mockInvoiceId,
    company_id: mockCompanyId,
    invoice_number: "INV-2026-0099",
    customer_id: "cust-1",
    issue_date: "2026-10-20",
    due_date: "2026-11-20",
    subtotal: 10000.0,
    discount_total: 0.0,
    tax_rate: 18.0,
    tax_total: 1800.0,
    grand_total: 11800.0,
    currency: "PKR",
    status: "Sent",
    fbr_status: "PENDING",
    customer: {
      id: "cust-1",
      name: "Acme Industrial Traders",
      tax_number: "7654321-0",
      email: "billing@acme.pk",
      customer_type: "b2b",
    },
    items: [
      {
        id: "item-1",
        product_id: "prod-cloud-server",
        description: "Cloud ERP Server Instance",
        quantity: 2,
        unit_price: 5000.0,
        discount_pct: 0,
        discount_amount: 0,
        tax_pct: 18.0,
        tax_amount: 1800.0,
        line_total: 11800.0,
      },
    ],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.FBR_VALIDATE_URL = "https://mock.fbr.gov.pk/invoices/validate";
    process.env.FBR_SUBMIT_URL = "https://mock.fbr.gov.pk/invoices/submit";
    process.env.FBR_SELLER_NTN = "1234567-8";
  });

  it("constructs compliant FBR DI API v1.12 payload structure", () => {
    const payload = constructFbrInvoicePayload({
      invoice: {
        invoice_number: "INV-2026-0099",
        issue_date: "2026-10-20",
        subtotal: 10000.0,
        tax_rate: 18.0,
        tax_total: 1800.0,
        grand_total: 11800.0,
      },
      customer: {
        name: "Acme Industrial Traders",
        tax_number: "7654321-0",
      },
      items: [
        {
          id: "item-1",
          product_id: "prod-cloud-server",
          description: "Cloud ERP Server Instance",
          quantity: 2,
          unit_price: 5000.0,
          tax_pct: 18.0,
          tax_amount: 1800.0,
          line_total: 11800.0,
          discount_amount: 0,
        },
      ],
      sellerNtn: "1234567-8",
    });

    expect(payload.seller_ntn).toBe("1234567-8");
    expect(payload.buyer_ntn).toBe("7654321-0");
    expect(payload.buyer_name).toBe("Acme Industrial Traders");
    expect(payload.invoice_date).toBe("2026-10-20");
    expect(payload.total_bill_amount).toBe(11800.0);
    expect(payload.items).toHaveLength(1);
    expect(payload.items[0].hs_code).toBe("8471.3020");
    expect(payload.items[0].quantity).toBe(2);
    expect(payload.items[0].unit_price).toBe(5000.0);
    expect(payload.items[0].tax_rate).toBe(18.0);
  });

  it("fails early and returns validation error messages if FBR Validate API rejects payload", async () => {
    vi.spyOn(fbrApi, "getFbrAccessToken").mockResolvedValue("mock_access_token_123");

    // Mock Supabase
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "invoices") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: mockInvoiceData,
                    error: null,
                  }),
                }),
              }),
            }),
            update: mockUpdate,
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            }),
          }),
        };
      }),
    };

    vi.spyOn(supabaseServer, "createClient").mockResolvedValue(mockSupabase as any);

    // Mock fetch for Validate API returning failure
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (url === "https://mock.fbr.gov.pk/invoices/validate") {
        return {
          ok: false,
          status: 422,
          json: async () => ({
            status: "FAIL",
            errors: [
              "Buyer NTN 7654321-0 is suspended in FBR Active Taxpayer List (ATL)",
              "Invalid tax_rate 18.0% for HS Code 8471.3020 under Chapter 84 rules",
            ],
          }),
        };
      }
      throw new Error(`Unexpected endpoint call to ${url}`);
    });

    vi.stubGlobal("fetch", mockFetch);

    const result = await submitInvoiceToFbrAction(mockCompanyId, mockInvoiceId);

    expect(result.success).toBe(false);
    expect(result.message).toContain("Validation Failed");
    expect(result.errors).toContain(
      "Buyer NTN 7654321-0 is suspended in FBR Active Taxpayer List (ATL)"
    );
    // Submit endpoint must NOT have been called
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://mock.fbr.gov.pk/invoices/validate",
      expect.anything()
    );
    // Invoices table must NOT be updated with SUBMITTED status
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("proceeds to Submit API upon successful validation and updates the invoices table with FBR attributes", async () => {
    vi.spyOn(fbrApi, "getFbrAccessToken").mockResolvedValue("mock_valid_token_xyz");

    const mockUpdateEq2 = vi.fn().mockResolvedValue({ error: null });
    const mockUpdateEq1 = vi.fn().mockReturnValue({ eq: mockUpdateEq2 });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq1 });

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "invoices") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: mockInvoiceData,
                    error: null,
                  }),
                }),
              }),
            }),
            update: mockUpdate,
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            }),
          }),
        };
      }),
    };

    vi.spyOn(supabaseServer, "createClient").mockResolvedValue(mockSupabase as any);

    const mockFetch = vi.fn().mockImplementation(async (url: string, init: any) => {
      expect(init.headers.Authorization).toBe("Bearer mock_valid_token_xyz");

      if (url === "https://mock.fbr.gov.pk/invoices/validate") {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            status: "SUCCESS",
            valid: true,
            message: "Validation passed successfully",
          }),
        };
      }

      if (url === "https://mock.fbr.gov.pk/invoices/submit") {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            status: "SUCCESS",
            fbr_irn: "IRN-20261020-99887766",
            fbr_uuid: "uuid-9988-7766-5544",
            fbr_qr_code_data: "IRN-20261020-99887766||1234567-8||7654321-0||11800.00",
            fbr_digital_signature: "MEYCIQCc9A123456789DigitalSignatureString==",
          }),
        };
      }

      throw new Error(`Unexpected request to ${url}`);
    });

    vi.stubGlobal("fetch", mockFetch);

    const result = await submitInvoiceToFbrAction(mockCompanyId, mockInvoiceId);

    // 1. Check overall success
    expect(result.success).toBe(true);
    expect(result.message).toContain("successfully validated and submitted to FBR");
    expect(result.data?.fbr_irn).toBe("IRN-20261020-99887766");
    expect(result.data?.fbr_status).toBe("SUBMITTED");

    // 2. Both Validate and Submit endpoints called in order
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch.mock.calls[0][0]).toBe("https://mock.fbr.gov.pk/invoices/validate");
    expect(mockFetch.mock.calls[1][0]).toBe("https://mock.fbr.gov.pk/invoices/submit");

    // 3. Database updated with required columns and fbr_status = 'SUBMITTED'
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        fbr_irn: "IRN-20261020-99887766",
        fbr_uuid: "uuid-9988-7766-5544",
        fbr_qr_code_data: "IRN-20261020-99887766||1234567-8||7654321-0||11800.00",
        fbr_digital_signature: "MEYCIQCc9A123456789DigitalSignatureString==",
        fbr_status: "SUBMITTED",
      })
    );
  });
});
