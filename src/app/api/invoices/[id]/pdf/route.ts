import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateInvoicePdfBuffer } from "@/lib/pdf/invoice-pdf-generator";
import type { Invoice, Customer, InvoiceItem } from "@/types/database.types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<Response> {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Invoice ID is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 1. Fetch invoice and relations with explicit columns (Strictly Never SELECT *)
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select(`
        id,
        company_id,
        invoice_number,
        customer_id,
        issue_date,
        due_date,
        status,
        subtotal,
        discount_type,
        discount_value,
        discount_total,
        tax_rate,
        tax_total,
        grand_total,
        amount_paid,
        amount_due,
        currency,
        notes,
        terms,
        fbr_irn,
        fbr_uuid,
        fbr_qr_code_data,
        fbr_digital_signature,
        fbr_status,
        created_at,
        updated_at,
        customer:customers (
          id,
          name,
          company_name,
          tax_number,
          email,
          phone,
          address
        ),
        items:invoice_items (
          id,
          product_id,
          description,
          quantity,
          unit_price,
          discount_pct,
          discount_amount,
          tax_pct,
          tax_amount,
          line_total,
          sort_order
        )
      `)
      .eq("id", id)
      .maybeSingle();

    if (invoiceError) {
      return NextResponse.json(
        { error: `Database query failed: ${invoiceError.message}` },
        { status: 500 }
      );
    }

    if (!invoice) {
      return NextResponse.json(
        { error: `Invoice with ID '${id}' not found.` },
        { status: 404 }
      );
    }

    // 2. Fetch Company details & Settings for Seller NTN and Address
    const companyId = invoice.company_id;

    const { data: companyRecord } = await supabase
      .from("companies")
      .select("id, name")
      .eq("id", companyId)
      .maybeSingle();

    const { data: settingsRecord } = await supabase
      .from("company_settings")
      .select("features, currency")
      .eq("company_id", companyId)
      .maybeSingle();

    const features =
      settingsRecord?.features && typeof settingsRecord.features === "object"
        ? (settingsRecord.features as Record<string, any>)
        : {};

    const companyInfo = {
      name: companyRecord?.name || "IT-HUB Global Technologies Corp",
      address: features.address || "Corporate Office, Commercial Plaza, Islamabad, Pakistan",
      phone: features.phone || "+92 (51) 111-222-333",
      email: features.email || "finance@ithub-enterprise.com",
      taxInformation: features.taxInformation || process.env.FBR_SELLER_NTN || "1234567-8",
      currency: invoice.currency || settingsRecord?.currency || "PKR",
    };

    // 3. Generate Server-Side PDF with FBR mandatory components (IRN, 1.0"x1.0" QR, FBR Logo)
    const pdfBuffer = await generateInvoicePdfBuffer({
      invoice: invoice as unknown as Invoice & {
        customer?: Customer | null;
        items?: InvoiceItem[];
      },
      company: companyInfo,
    });

    // 4. Return compliant PDF binary response
    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="invoice-${invoice.invoice_number}.pdf"`,
        "Content-Length": String(pdfBuffer.length),
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
        "X-FBR-IRN": invoice.fbr_irn || "PENDING",
        "X-FBR-Status": invoice.fbr_status || "PENDING",
      },
    });

  } catch (err: any) {
    return NextResponse.json(
      {
        error: "Failed to generate invoice PDF",
        details: err?.message || String(err),
      },
      { status: 500 }
    );
  }
}
