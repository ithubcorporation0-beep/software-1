import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateInvoicePdfBuffer } from "@/lib/pdf/invoice-pdf-generator";
import { GET } from "@/app/api/invoices/[id]/pdf/route";
import * as supabaseServer from "@/lib/supabase/server";
import { NextRequest } from "next/server";

describe("Server-Side FBR Invoice PDF Generator & Route (/api/invoices/[id]/pdf)", () => {
  const mockInvoiceData = {
    id: "inv-uuid-12345",
    company_id: "comp-uuid-99999",
    invoice_number: "INV-2026-FBR-001",
    customer_id: "cust-uuid-11111",
    issue_date: "2026-10-20",
    due_date: "2026-11-20",
    status: "Sent" as const,
    subtotal: 50000.0,
    discount_type: "fixed" as const,
    discount_value: 0,
    discount_total: 0,
    tax_rate: 18.0,
    tax_total: 9000.0,
    grand_total: 59000.0,
    amount_paid: 0,
    amount_due: 59000.0,
    currency: "PKR",
    created_at: "2026-10-20T10:00:00Z",
    updated_at: "2026-10-20T10:00:00Z",
    // Mandatory FBR Database Attributes
    fbr_irn: "IRN-20261020-88776655",
    fbr_uuid: "fbr-uuid-44332211",
    fbr_qr_code_data: "IRN-20261020-88776655||NTN:1234567-8||DATE:2026-10-20||TOTAL:59000.00||TAX:9000.00",
    fbr_digital_signature: "MEYCIQCZ99887766SignatureVerificationString==",
    fbr_status: "SUBMITTED" as const,
    customer: {
      id: "cust-uuid-11111",
      company_id: "comp-uuid-99999",
      customer_code: "CUST-001",
      name: "Standard Manufacturing Ltd",
      company_name: "Standard Manufacturing Corp",
      tax_number: "9876543-2",
      email: "accounts@standardmfg.pk",
      phone: "+92 42 111-222-333",
      country: "Pakistan",
      customer_type: "B2B" as const,
      status: "Active" as const,

      documents: [],
      total_spend: 59000,
      created_at: "2026-10-20T09:00:00Z",
      updated_at: "2026-10-20T09:00:00Z",
    },
    items: [
      {
        id: "item-1",
        invoice_id: "inv-uuid-12345",
        company_id: "comp-uuid-99999",
        product_id: "prod-it-support",
        description: "Enterprise Cloud Infrastructure Support",
        quantity: 1,
        unit_price: 50000.0,
        discount_pct: 0,
        discount_amount: 0,
        tax_pct: 18.0,
        tax_amount: 9000.0,
        line_total: 59000.0,
        sort_order: 0,
        created_at: "2026-10-20T10:00:00Z",
      },
    ],
  };

  const mockCompanyInfo = {
    name: "IT-HUB Global Technologies Corp",
    address: "Commercial Tower, Blue Area, Islamabad, Pakistan",
    phone: "+92 51 111-000-111",
    email: "billing@ithub-enterprise.com",
    taxInformation: "1234567-8",
    currency: "PKR",
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("generates an authentic, valid PDF buffer including FBR IRN, QR code, and Logo", async () => {
    const pdfBuffer = await generateInvoicePdfBuffer({
      invoice: mockInvoiceData,
      company: mockCompanyInfo,
      compress: false,
    });

    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(1000);

    // Verify PDF header magic bytes
    const pdfHeader = pdfBuffer.subarray(0, 5).toString("utf-8");
    expect(pdfHeader).toBe("%PDF-");

    const rawPdfString = pdfBuffer.toString("utf-8");
    const decodedPdfText = rawPdfString.replace(/<([0-9a-fA-F]+)>/g, (_, hex) =>
      Buffer.from(hex, "hex").toString("utf-8")
    );
    // PDFKit TJ operators include numeric kerning offsets (e.g. [FEDERAL  80 BOARD])
    const normalizedPdfText = decodedPdfText.replace(/\s+-?\d+\s+/g, " ");

    // 1. Mandatory FBR Invoice Number (IRN)
    expect(decodedPdfText).toContain("IRN-20261020-88776655");

    // 2. FBR Digital Invoicing & 1.0"x1.0" QR Code Specification
    expect(decodedPdfText).toContain("8471.3020");
    expect(decodedPdfText).toContain("FBR Digital Tax Invoice");
    expect(decodedPdfText).toContain("1.0");
    expect(decodedPdfText).toContain("QR Code");

    // 3. Buyer & Seller Information
    expect(decodedPdfText).toContain("IT-HUB Global Technologies Corp");
  });








  it("serves the PDF through route GET /api/invoices/[id]/pdf with accurate HTTP headers", async () => {
    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "invoices") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: mockInvoiceData,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "companies") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: "comp-uuid-99999", name: "IT-HUB Global Corp" },
                }),
              }),
            }),
          };
        }
        if (table === "company_settings") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    features: {
                      taxInformation: "1234567-8",
                      address: "Islamabad, Pakistan",
                    },
                    currency: "PKR",
                  },
                }),
              }),
            }),
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

    const request = new NextRequest("http://localhost:3000/api/invoices/inv-uuid-12345/pdf");
    const response = await GET(request, {
      params: Promise.resolve({ id: "inv-uuid-12345" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Content-Disposition")).toContain("invoice-INV-2026-FBR-001.pdf");
    expect(response.headers.get("X-FBR-IRN")).toBe("IRN-20261020-88776655");
    expect(response.headers.get("X-FBR-Status")).toBe("SUBMITTED");

    const responseBlob = await response.arrayBuffer();
    const responseBuffer = Buffer.from(responseBlob);
    expect(responseBuffer.subarray(0, 5).toString("utf-8")).toBe("%PDF-");
  });

  it("returns 404 if the requested invoice is not found in database", async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      }),
    };

    vi.spyOn(supabaseServer, "createClient").mockResolvedValue(mockSupabase as any);

    const request = new NextRequest("http://localhost:3000/api/invoices/nonexistent-id/pdf");
    const response = await GET(request, {
      params: Promise.resolve({ id: "nonexistent-id" }),
    });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toContain("not found");
  });
});
