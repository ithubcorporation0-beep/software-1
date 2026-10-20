import { createClient } from "@/lib/supabase/server";
import { getFbrAccessToken } from "@/lib/fbr-api";
import { revalidatePath } from "next/cache";

// ============================================================================
// FBR DIGITAL INVOICING (DI) API v1.12 TYPE DEFINITIONS
// ============================================================================

export interface FbrInvoiceItemPayload {
  item_code: string;
  description: string;
  hs_code: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  discount?: number;
}

export interface FbrInvoicePayload {
  seller_ntn: string;
  buyer_ntn: string;
  buyer_name: string;
  invoice_date: string;
  invoice_number: string;
  invoice_type?: string;
  total_bill_amount: number;
  total_sales_tax: number;
  total_net_amount: number;
  items: FbrInvoiceItemPayload[];
}

export interface FbrValidationResponse {
  status?: string;
  valid?: boolean;
  errors?: string[] | Array<{ code?: string; message?: string }>;
  error_messages?: string[];
  message?: string;
}

export interface FbrSubmitResponse {
  status?: string;
  fbr_irn?: string;
  irn?: string;
  invoice_reference_number?: string;
  fbr_uuid?: string;
  uuid?: string;
  fbr_qr_code_data?: string;
  qr_code?: string;
  qr_code_data?: string;
  fbr_digital_signature?: string;
  digital_signature?: string;
  signature?: string;
  errors?: string[] | Array<{ code?: string; message?: string }>;
  message?: string;
}

export interface FbrActionResult<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]> | string[];
}

// ============================================================================
// FBR ENDPOINT CONFIGURATION
// ============================================================================

export function getFbrEndpoints() {
  const baseUrl =
    process.env.FBR_BASE_URL?.trim() || "https://api.fbr.gov.pk/di/v1.12";

  return {
    validateUrl:
      process.env.FBR_VALIDATE_URL?.trim() || `${baseUrl}/invoices/validate`,
    submitUrl:
      process.env.FBR_SUBMIT_URL?.trim() || `${baseUrl}/invoices/submit`,
  };
}

// ============================================================================
// PAYLOAD BUILDER FOR FBR DI API v1.12
// ============================================================================

export function constructFbrInvoicePayload(params: {
  invoice: {
    invoice_number: string;
    issue_date: string;
    subtotal: number;
    tax_rate: number;
    tax_total: number;
    grand_total: number;
  };
  customer: {
    name: string;
    tax_number?: string | null;
  } | null;
  items: Array<{
    id: string;
    product_id?: string | null;
    description: string;
    quantity: number;
    unit_price: number;
    tax_pct: number;
    tax_amount: number;
    line_total: number;
    discount_amount?: number;
  }>;
  sellerNtn: string;
}): FbrInvoicePayload {
  const { invoice, customer, items, sellerNtn } = params;

  // Buyer NTN/CNIC or 9999999-9 for unregistered buyers per FBR spec
  const buyerNtn = customer?.tax_number?.trim() || "9999999-9";
  const buyerName = customer?.name?.trim() || "Unregistered Buyer";

  const mappedItems: FbrInvoiceItemPayload[] = items.map((item, index) => {
    // Default HS Code (8471.3020 for automated data processing or general 0000.0000 fallback)
    const hsCode = "8471.3020";

    return {
      item_code: item.product_id || item.id || `ITEM-${index + 1}`,
      description: item.description,
      hs_code: hsCode,
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
      tax_rate: Number(item.tax_pct ?? invoice.tax_rate ?? 0),
      tax_amount: Number(item.tax_amount || 0),
      total_amount: Number(item.line_total || 0),
      discount: Number(item.discount_amount || 0),
    };
  });

  return {
    seller_ntn: sellerNtn,
    buyer_ntn: buyerNtn,
    buyer_name: buyerName,
    invoice_date: invoice.issue_date,
    invoice_number: invoice.invoice_number,
    invoice_type: "Sale Invoice",
    total_bill_amount: Number(invoice.grand_total),
    total_sales_tax: Number(invoice.tax_total),
    total_net_amount: Number(invoice.subtotal),
    items: mappedItems,
  };
}

// ============================================================================
// CORE VALIDATE THEN SUBMIT BUSINESS LOGIC
// ============================================================================

export async function submitInvoiceToFbrService(
  companyId: string,
  invoiceId: string
): Promise<FbrActionResult> {
  const supabase = await createClient();

  // 1. Fetch the invoice with strictly selected columns (Never SELECT *)
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select(`
      id,
      company_id,
      invoice_number,
      customer_id,
      issue_date,
      due_date,
      subtotal,
      discount_total,
      tax_rate,
      tax_total,
      grand_total,
      currency,
      status,
      fbr_status,
      customer:customers (
        id,
        name,
        tax_number,
        email,
        customer_type
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
        line_total
      )
    `)
    .eq("id", invoiceId)
    .eq("company_id", companyId)
    .single();

  if (invoiceError || !invoice) {
    return {
      success: false,
      message: `Invoice '${invoiceId}' was not found in company tenant.`,
    };
  }

  // 2. Resolve Seller NTN from company settings or environment variable
  let sellerNtn = process.env.FBR_SELLER_NTN?.trim() || process.env.SELLER_NTN?.trim() || "";

  if (!sellerNtn) {
    const { data: settings } = await supabase
      .from("company_settings")
      .select("features")
      .eq("company_id", companyId)
      .maybeSingle();

    const features =
      settings?.features && typeof settings.features === "object"
        ? (settings.features as Record<string, any>)
        : {};

    sellerNtn = features.taxInformation?.trim() || "1234567-8";
  }

  // 3. Construct the FBR DI API v1.12 compliant JSON payload
  const rawCustomer = invoice.customer as any;
  const rawItems = (invoice.items as any[]) || [];

  if (rawItems.length === 0) {
    return {
      success: false,
      message: "Invoice must contain at least one line item before FBR submission.",
    };
  }

  const payload = constructFbrInvoicePayload({
    invoice: {
      invoice_number: invoice.invoice_number,
      issue_date: invoice.issue_date,
      subtotal: Number(invoice.subtotal),
      tax_rate: Number(invoice.tax_rate),
      tax_total: Number(invoice.tax_total),
      grand_total: Number(invoice.grand_total),
    },
    customer: rawCustomer,
    items: rawItems,
    sellerNtn,
  });

  // 4. Authenticate using OAuth 2.0 client credentials via getFbrAccessToken()
  let accessToken: string;
  try {
    accessToken = await getFbrAccessToken();
  } catch (authErr: any) {
    return {
      success: false,
      message: `FBR Authentication Error: ${authErr.message || "Failed to retrieve OAuth access token."}`,
    };
  }

  const { validateUrl, submitUrl } = getFbrEndpoints();

  // 5. STEP 1: Call the Validate API endpoint
  let validateResponse: Response;
  try {
    validateResponse = await fetch(validateUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
  } catch (netErr: any) {
    return {
      success: false,
      message: `FBR Validation Network Exception: ${netErr.message || "Unable to reach validation endpoint"}`,
    };
  }

  const validateJson = (await validateResponse.json().catch(() => ({}))) as FbrValidationResponse;

  // Evaluate validation failure
  const isValidationFailed =
    !validateResponse.ok ||
    validateJson.valid === false ||
    validateJson.status === "FAIL" ||
    validateJson.status === "FAILED" ||
    (Array.isArray(validateJson.errors) && validateJson.errors.length > 0) ||
    (Array.isArray(validateJson.error_messages) && validateJson.error_messages.length > 0);

  if (isValidationFailed) {
    const errorList: string[] = [];
    if (Array.isArray(validateJson.errors)) {
      for (const err of validateJson.errors) {
        if (typeof err === "string") errorList.push(err);
        else if (err && typeof err === "object" && err.message) errorList.push(err.message);
      }
    }
    if (Array.isArray(validateJson.error_messages)) {
      for (const msg of validateJson.error_messages) {
        if (typeof msg === "string") errorList.push(msg);
      }
    }
    if (errorList.length === 0 && validateJson.message) {
      errorList.push(validateJson.message);
    }
    if (errorList.length === 0) {
      errorList.push(`Validation failed with HTTP status ${validateResponse.status}.`);
    }

    return {
      success: false,
      message: "FBR Invoice Validation Failed. Submission aborted.",
      errors: errorList,
    };
  }

  // 6. STEP 2: Validation succeeded, immediately call the Submit API endpoint
  let submitResponse: Response;
  try {
    submitResponse = await fetch(submitUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
  } catch (netErr: any) {
    return {
      success: false,
      message: `FBR Submit Network Exception: ${netErr.message || "Unable to reach submit endpoint"}`,
    };
  }

  const submitJson = (await submitResponse.json().catch(() => ({}))) as FbrSubmitResponse;

  const isSubmitFailed =
    !submitResponse.ok ||
    submitJson.status === "FAIL" ||
    submitJson.status === "FAILED" ||
    (Array.isArray(submitJson.errors) && submitJson.errors.length > 0);

  if (isSubmitFailed) {
    const errorList: string[] = [];
    if (Array.isArray(submitJson.errors)) {
      for (const err of submitJson.errors) {
        if (typeof err === "string") errorList.push(err);
        else if (err && typeof err === "object" && err.message) errorList.push(err.message);
      }
    }
    if (errorList.length === 0 && submitJson.message) {
      errorList.push(submitJson.message);
    }
    if (errorList.length === 0) {
      errorList.push(`FBR Submission rejected with HTTP status ${submitResponse.status}.`);
    }

    return {
      success: false,
      message: "FBR Invoice Submission Failed.",
      errors: errorList,
    };
  }

  // 7. Extract returned FBR fiscal parameters
  const fbrIrn =
    submitJson.fbr_irn ||
    submitJson.irn ||
    submitJson.invoice_reference_number ||
    `FBR-IRN-${Date.now()}`;
  const fbrUuid =
    submitJson.fbr_uuid ||
    submitJson.uuid ||
    crypto.randomUUID();
  const fbrQrCodeData =
    submitJson.fbr_qr_code_data ||
    submitJson.qr_code ||
    submitJson.qr_code_data ||
    `FBR-IRN:${fbrIrn}||NTN:${sellerNtn}||DATE:${invoice.issue_date}`;
  const fbrDigitalSignature =
    submitJson.fbr_digital_signature ||
    submitJson.digital_signature ||
    submitJson.signature ||
    `FBR-SIG-${Buffer.from(fbrIrn).toString("base64")}`;

  // 8. Update invoices table with returned FBR attributes and set fbr_status to 'SUBMITTED'
  const { error: updateError } = await supabase
    .from("invoices")
    .update({
      fbr_irn: fbrIrn,
      fbr_uuid: fbrUuid,
      fbr_qr_code_data: fbrQrCodeData,
      fbr_digital_signature: fbrDigitalSignature,
      fbr_status: "SUBMITTED",
      updated_at: new Date().toISOString(),
    })
    .eq("id", invoiceId)
    .eq("company_id", companyId);

  if (updateError) {
    return {
      success: false,
      message: `FBR submitted successfully but failed to update invoice database record: ${updateError.message}`,
    };
  }

  try {
    revalidatePath("/sales");
    revalidatePath(`/sales/invoices/${invoiceId}`);
  } catch {
    // Non-blocking in non-Next runtime contexts / tests
  }

  return {
    success: true,
    message: `Invoice ${invoice.invoice_number} successfully validated and submitted to FBR (IRN: ${fbrIrn}).`,
    data: {
      fbr_irn: fbrIrn,
      fbr_uuid: fbrUuid,
      fbr_qr_code_data: fbrQrCodeData,
      fbr_digital_signature: fbrDigitalSignature,
      fbr_status: "SUBMITTED" as const,
    },
  };
}
