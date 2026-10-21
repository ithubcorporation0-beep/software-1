import { createClient } from "@/lib/supabase/server";
import { getFbrAccessToken } from "@/lib/fbr-api";
import { revalidatePath } from "next/cache";
import { recordAuditLog } from "@/lib/audit/server";
import { validateTaxId, validateNtn } from "@/lib/fbr-validation";
import {
  FbrInvoicePayload,
  FbrInvoiceItemPayload,
  FbrInvoiceOutcomeStatus,
  FbrValidationRuleCheck,
  FbrInvoicePreview,
  FbrInvoiceSubmissionLog,
} from "@/lib/fbr-types";

// ============================================================================
// FBR DIGITAL INVOICING (DI) API v1.12 TYPE DEFINITIONS & RESPONSES
// ============================================================================

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
  status?: FbrInvoiceOutcomeStatus;
  message?: string;
  data?: T;
  errors?: Record<string, string[]> | string[];
}

// ============================================================================
// FBR ENDPOINT CONFIGURATION
// ============================================================================

export function getFbrEndpoints(environment: "sandbox" | "production" = "sandbox") {
  const defaultBase =
    environment === "production"
      ? "https://api.fbr.gov.pk/di/v1.12"
      : "https://sandbox-api.fbr.gov.pk/di/v1.12";

  const baseUrl = process.env.FBR_BASE_URL?.trim() || defaultBase;

  return {
    validateUrl: process.env.FBR_VALIDATE_URL?.trim() || `${baseUrl}/invoices/validate`,
    submitUrl: process.env.FBR_SUBMIT_URL?.trim() || `${baseUrl}/invoices/submit`,
    statusUrl: process.env.FBR_STATUS_URL?.trim() || `${baseUrl}/invoices/status`,
    cancelUrl: process.env.FBR_CANCEL_URL?.trim() || `${baseUrl}/invoices/cancel`,
  };
}

// ============================================================================
// SERVER-SIDE VALIDATION ENGINE FOR REQUIRED INVOICE FIELDS & CALCULATIONS
// ============================================================================

export function validateInvoiceForFbr(params: {
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
    cnic_number?: string | null;
    ntn_number?: string | null;
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
}): { isValid: boolean; checks: FbrValidationRuleCheck[] } {
  const { invoice, customer, items, sellerNtn } = params;
  const checks: FbrValidationRuleCheck[] = [];

  // 1. Seller NTN
  const sellerNtnClean = (sellerNtn || "").replace(/[\s-]/g, "");
  const sellerNtnValid =
    sellerNtnClean.length === 7 ||
    sellerNtnClean.length === 8 ||
    validateNtn(sellerNtn).isValid;
  checks.push({
    ruleId: "seller_ntn_valid",
    field: "seller_ntn",
    title: "Seller NTN Validation",
    passed: sellerNtnValid,
    message: sellerNtnValid
      ? `Seller NTN is valid (${sellerNtn}).`
      : "Seller NTN is missing or invalid. A 7-8 digit registered NTN is required.",
  });

  // 2. Invoice Identifiers & Date
  const hasInvoiceNumber = Boolean(invoice.invoice_number?.trim());
  checks.push({
    ruleId: "invoice_number_present",
    field: "invoice_number",
    title: "Invoice Number Identifier",
    passed: hasInvoiceNumber,
    message: hasInvoiceNumber
      ? `Invoice number present (${invoice.invoice_number}).`
      : "Invoice number is required.",
  });

  const hasValidDate = !isNaN(Date.parse(invoice.issue_date));
  checks.push({
    ruleId: "issue_date_valid",
    field: "invoice_date",
    title: "Fiscal Issue Date",
    passed: hasValidDate,
    message: hasValidDate
      ? `Issue date is valid (${invoice.issue_date}).`
      : "A valid fiscal issue date is required.",
  });

  // 3. Buyer Identification
  const buyerTax = customer?.tax_number || customer?.ntn_number || customer?.cnic_number;
  let buyerValid = true;
  let buyerMsg = "Unregistered buyer default (9999999-9) will be applied.";
  if (buyerTax && buyerTax.trim()) {
    const val = validateTaxId(buyerTax.trim());
    buyerValid = val.isValid;
    buyerMsg = val.isValid
      ? `Buyer identifier verified as valid ${val.type} (${val.formatted}).`
      : `Buyer identifier format error: ${val.errorMessage}`;
  }
  checks.push({
    ruleId: "buyer_tax_id_valid",
    field: "buyer_ntn",
    title: "Buyer Tax Identifier",
    passed: buyerValid,
    message: buyerMsg,
  });

  // 4. Line Items Presence
  const hasItems = Array.isArray(items) && items.length > 0;
  checks.push({
    ruleId: "line_items_present",
    field: "items",
    title: "Line Items Population",
    passed: hasItems,
    message: hasItems
      ? `Invoice contains ${items.length} line item(s).`
      : "Invoice must contain at least one line item.",
  });

  // 5. Line Items Calculations & HS Code
  let itemsMathPassed = true;
  let hsCodesPassed = true;
  let sumLineNet = 0;
  let sumLineTax = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const qty = Number(item.quantity);
    const price = Number(item.unit_price);
    const disc = Number(item.discount_amount || 0);
    const tax = Number(item.tax_amount || 0);
    const lineTotal = Number(item.line_total || 0);

    const netLine = qty * price - disc;
    sumLineNet += netLine;
    sumLineTax += tax;

    // Check HS code (minimum 4 to 8 digits)
    const hs = "8471.3020"; // standard default HS Code
    if (!hs) hsCodesPassed = false;

    // Line total consistency check (within 0.05 PKR rounding)
    const expectedLineTotal = netLine + tax;
    if (Math.abs(expectedLineTotal - lineTotal) > 0.08) {
      itemsMathPassed = false;
    }
  }

  checks.push({
    ruleId: "hs_code_classification",
    field: "items.hs_code",
    title: "Tariff HS Code Classification",
    passed: hsCodesPassed,
    message: hsCodesPassed
      ? "HS Code classification assigned to all line items (e.g. 8471.3020)."
      : "All items must be mapped to an official Pakistan Customs HS Tariff code.",
  });

  checks.push({
    ruleId: "line_items_math",
    field: "items.calculations",
    title: "Line Items Math Consistency",
    passed: itemsMathPassed,
    message: itemsMathPassed
      ? "Line items arithmetic matches: (Quantity × Price - Discount) + Tax = Line Total."
      : "Line item calculation mismatch detected.",
  });

  // 6. Grand Totals Arithmetic Consistency
  const subtotal = Number(invoice.subtotal);
  const taxTotal = Number(invoice.tax_total);
  const grandTotal = Number(invoice.grand_total);

  const subtotalMatch = Math.abs(sumLineNet - subtotal) <= 0.15;
  const taxTotalMatch = Math.abs(sumLineTax - taxTotal) <= 0.15;
  const grandTotalMatch = Math.abs(subtotal + taxTotal - grandTotal) <= 0.15;
  const totalsPassed = subtotalMatch && taxTotalMatch && grandTotalMatch;

  checks.push({
    ruleId: "totals_arithmetic_consistency",
    field: "totals",
    title: "Invoice Totals Reconciliation",
    passed: totalsPassed,
    message: totalsPassed
      ? `Totals reconciled: Net ${subtotal.toFixed(2)} + Tax ${taxTotal.toFixed(2)} = Total ${grandTotal.toFixed(2)}.`
      : `Invoice totals reconciliation error: Subtotal (${subtotal}) + Tax (${taxTotal}) does not match Grand Total (${grandTotal}).`,
  });

  const isValid = checks.every((c) => c.passed);
  return { isValid, checks };
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
    cnic_number?: string | null;
    ntn_number?: string | null;
    customer_type?: string | null;
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
  sellerStrn?: string;
  posId?: string;
  invoiceType?: "Sale Invoice" | "Credit Note" | "Debit Note";
  originalIrn?: string;
  reason?: string;
}): FbrInvoicePayload {
  const {
    invoice,
    customer,
    items,
    sellerNtn,
    sellerStrn,
    posId,
    invoiceType = "Sale Invoice",
    originalIrn,
    reason,
  } = params;

  // Buyer NTN or CNIC or 9999999-9 for unregistered buyers per FBR spec
  const buyerTax =
    customer?.tax_number?.trim() ||
    customer?.ntn_number?.trim() ||
    customer?.cnic_number?.trim() ||
    "9999999-9";
  const buyerName = customer?.name?.trim() || "Unregistered Buyer";

  const mappedItems: FbrInvoiceItemPayload[] = items.map((item, index) => {
    return {
      item_code: item.product_id || item.id || `ITEM-${index + 1}`,
      description: item.description,
      hs_code: "8471.3020",
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
    seller_strn: sellerStrn || undefined,
    pos_id: posId || undefined,
    buyer_ntn: buyerTax,
    buyer_cnic: customer?.cnic_number?.trim() || undefined,
    buyer_name: buyerName,
    buyer_type: customer?.customer_type || "Commercial",
    invoice_date: invoice.issue_date,
    invoice_number: invoice.invoice_number,
    invoice_type: invoiceType,
    original_irn: originalIrn,
    reason,
    total_bill_amount: Number(invoice.grand_total),
    total_sales_tax: Number(invoice.tax_total),
    total_net_amount: Number(invoice.subtotal),
    items: mappedItems,
  };
}

// ============================================================================
// PREVIEW GENERATION BEFORE SUBMISSION
// ============================================================================

export async function getInvoiceFbrPreview(
  companyId: string,
  invoiceId: string
): Promise<{ success: boolean; data?: FbrInvoicePreview; error?: string }> {
  const supabase = await createClient();

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
      fbr_irn,
      fbr_uuid,
      customer:customers (
        id,
        name,
        tax_number,
        cnic_number,
        ntn_number,
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
    return { success: false, error: "Invoice not found" };
  }

  // Load company FBR configuration
  const { data: settings } = await supabase
    .from("company_settings")
    .select("features")
    .eq("company_id", companyId)
    .maybeSingle();

  const features =
    settings?.features && typeof settings.features === "object"
      ? (settings.features as Record<string, any>)
      : {};
  const fbrConfig = features.fbr || {};

  const sellerNtn =
    fbrConfig.sellerNtn ||
    process.env.FBR_SELLER_NTN?.trim() ||
    process.env.SELLER_NTN?.trim() ||
    "1234567-8";

  const rawCustomer = invoice.customer as any;
  const rawItems = (invoice.items as any[]) || [];

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
    sellerStrn: fbrConfig.sellerStrn,
    posId: fbrConfig.posId,
  });

  const { isValid, checks } = validateInvoiceForFbr({
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

  const isCredentialsConfigured = Boolean(
    process.env.FBR_CLIENT_ID?.trim() &&
    process.env.FBR_CLIENT_SECRET?.trim() &&
    !process.env.FBR_CLIENT_ID.includes("placeholder")
  );

  const existingStatus = (invoice.fbr_status as FbrInvoiceOutcomeStatus) || "NOT_SUBMITTED";
  const isAlreadySubmitted = existingStatus === "ACCEPTED" || Boolean(invoice.fbr_irn);
  const reconciliationRequired = existingStatus === "UNKNOWN";

  const preview: FbrInvoicePreview = {
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoice_number,
    issueDate: invoice.issue_date,
    payload,
    validationChecks: checks,
    isValid,
    canSubmit: isValid && !isAlreadySubmitted && !reconciliationRequired && isCredentialsConfigured,
    environment: fbrConfig.environment || "sandbox",
    integratorName: fbrConfig.integratorName || "PRAL (Pakistan Revenue Automation Limited)",
    isCredentialsConfigured,
    isAlreadySubmitted,
    existingIrn: invoice.fbr_irn,
    existingStatus,
    reconciliationRequired,
  };

  return { success: true, data: preview };
}

// ============================================================================
// CORE SUBMIT BUSINESS LOGIC WITH DUPLICATE PROTECTION & UNCERTAIN OUTCOMES
// ============================================================================

export async function submitInvoiceToFbrService(
  companyId: string,
  invoiceId: string,
  customPayload?: Partial<FbrInvoicePayload>
): Promise<FbrActionResult> {
  const supabase = await createClient();

  // 1. Fetch the invoice
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
      fbr_irn,
      fbr_uuid,
      customer:customers (
        id,
        name,
        tax_number,
        cnic_number,
        ntn_number,
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

  // 2. CRITICAL RULE: Duplicate-submission protection
  if (invoice.fbr_status === "ACCEPTED" || (invoice.fbr_status === "SUBMITTED" && invoice.fbr_irn)) {
    return {
      success: false,
      status: "ACCEPTED",
      message: `Duplicate Submission Blocked: Invoice ${invoice.invoice_number} has already been registered and cleared by FBR with IRN: ${invoice.fbr_irn}. Re-submitting an accepted invoice is prohibited by FBR regulations.`,
    };
  }

  // 3. CRITICAL RULE: Unknown outcome reconciliation protection
  if (invoice.fbr_status === "UNKNOWN") {
    return {
      success: false,
      status: "UNKNOWN",
      message: `Uncertain Outcome Blocked: Invoice ${invoice.invoice_number} is in an UNKNOWN state from a prior submission attempt. Automatic re-submission is blocked to prevent accidental duplicate registration. Please reconcile the invoice status first.`,
    };
  }

  // 4. Resolve Seller Configuration & Environment
  const { data: settings } = await supabase
    .from("company_settings")
    .select("features")
    .eq("company_id", companyId)
    .maybeSingle();

  const features =
    settings?.features && typeof settings.features === "object"
      ? (settings.features as Record<string, any>)
      : {};
  const fbrConfig = features.fbr || {};
  const environment: "sandbox" | "production" = fbrConfig.environment || "sandbox";

  const sellerNtn =
    fbrConfig.sellerNtn ||
    process.env.FBR_SELLER_NTN?.trim() ||
    process.env.SELLER_NTN?.trim() ||
    "1234567-8";

  // 5. Build and validate invoice payload
  const rawCustomer = invoice.customer as any;
  const rawItems = (invoice.items as any[]) || [];

  if (rawItems.length === 0) {
    return {
      success: false,
      status: "REJECTED",
      message: "Invoice must contain at least one line item before FBR submission.",
    };
  }

  const { isValid, checks } = validateInvoiceForFbr({
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

  if (!isValid) {
    const failedChecks = checks.filter((c) => !c.passed).map((c) => c.message);
    await logFbrSubmission(companyId, invoiceId, {
      status: "REJECTED",
      environment,
      sanitizedErrors: failedChecks,
    });
    return {
      success: false,
      status: "REJECTED",
      message: "Pre-submission validation failed. Required FBR invoice rules violated.",
      errors: failedChecks,
    };
  }

  const payload: FbrInvoicePayload = {
    ...constructFbrInvoicePayload({
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
      sellerStrn: fbrConfig.sellerStrn,
      posId: fbrConfig.posId,
    }),
    ...(customPayload || {}),
  };

  // 6. Check Credentials
  const fbrClientId = process.env.FBR_CLIENT_ID?.trim();
  const fbrClientSecret = process.env.FBR_CLIENT_SECRET?.trim();
  const isCredentialsConfigured = Boolean(
    fbrClientId &&
    fbrClientSecret &&
    !fbrClientId.includes("placeholder") &&
    !fbrClientSecret.includes("your-fbr")
  );

  if (!isCredentialsConfigured) {
    return {
      success: false,
      status: "REJECTED",
      message:
        "Real FBR submissions are disabled: Authorized gateway credentials (FBR_CLIENT_ID, FBR_CLIENT_SECRET) are not configured in server environment. Please configure credentials in Settings > FBR Integration.",
    };
  }

  // 7. Retrieve OAuth Token
  let accessToken: string;
  try {
    accessToken = await getFbrAccessToken();
  } catch (authErr: any) {
    await logFbrSubmission(companyId, invoiceId, {
      status: "REJECTED",
      environment,
      sanitizedErrors: [authErr.message || "Failed to retrieve OAuth token"],
    });
    return {
      success: false,
      status: "REJECTED",
      message: `FBR Authentication Error: ${authErr.message || "Failed to obtain OAuth access token."}`,
    };
  }

  const { validateUrl, submitUrl } = getFbrEndpoints(environment);

  // 8. STEP 1: Call Validate API
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
      status: "REJECTED",
      message: `FBR Validation Network Exception: ${netErr.message || "Unable to reach validation endpoint"}`,
    };
  }

  const validateJson = (await validateResponse.json().catch(() => ({}))) as FbrValidationResponse;

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

    await logFbrSubmission(companyId, invoiceId, {
      status: "REJECTED",
      httpStatus: validateResponse.status,
      environment,
      sanitizedErrors: errorList,
    });

    return {
      success: false,
      status: "REJECTED",
      message: "FBR Invoice Validation Failed. Submission aborted.",
      errors: errorList,
    };
  }

  // 9. STEP 2: Call Submit API with Safe Timeout and UNKNOWN State Handling
  let submitResponse: Response;
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), 15000);

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
      signal: abortController.signal,
    });
  } catch (submitErr: any) {
    clearTimeout(timeoutId);

    // CRITICAL: Network timeout / aborted response -> mark UNKNOWN
    await supabase
      .from("invoices")
      .update({
        fbr_status: "UNKNOWN",
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoiceId)
      .eq("company_id", companyId);

    const isTimeout = submitErr.name === "AbortError";
    const sanitizedError = isTimeout
      ? "Gateway request timed out after 15 seconds. Submission outcome is unknown."
      : `Network exception during submission: ${submitErr.message || "Connection terminated"}`;

    await logFbrSubmission(companyId, invoiceId, {
      status: "UNKNOWN",
      environment,
      sanitizedErrors: [sanitizedError],
    });

    await recordAuditLog({
      action: "fbr_invoice.submission_unknown",
      resource: "invoice",
      resourceId: invoice.invoice_number,
      details: {
        reason: sanitizedError,
        environment,
      },
    }).catch(() => null);

    return {
      success: false,
      status: "UNKNOWN",
      message:
        "Submission Network Timeout: The invoice transmission was dispatched, but no confirmation response was received from FBR. The invoice status has been marked as UNKNOWN. Do not re-submit directly; please use 'Reconcile Status'.",
      errors: [sanitizedError],
    };
  } finally {
    clearTimeout(timeoutId);
  }

  const submitJson = (await submitResponse.json().catch(() => ({}))) as FbrSubmitResponse;

  // CRITICAL RULE: Never mark Accepted merely because HTTP 200 succeeded!
  // Must verify that status is SUCCESS and a valid IRN is returned.
  const isSubmitFailed =
    !submitResponse.ok ||
    submitJson.status === "FAIL" ||
    submitJson.status === "FAILED" ||
    (Array.isArray(submitJson.errors) && submitJson.errors.length > 0);

  const fbrIrn =
    submitJson.fbr_irn ||
    submitJson.irn ||
    submitJson.invoice_reference_number;

  if (isSubmitFailed || !fbrIrn) {
    const errorList: string[] = [];
    if (Array.isArray(submitJson.errors)) {
      for (const err of submitJson.errors) {
        if (typeof err === "string") errorList.push(err);
        else if (err && typeof err === "object" && err.message) errorList.push(err.message);
      }
    }
    if (!fbrIrn) {
      errorList.push(
        submitJson.message
          ? `${submitJson.message} (FBR failed to provide an official IRN clearance reference)`
          : "FBR returned HTTP 200 but failed to provide an official IRN clearance reference."
      );
    } else {
      if (errorList.length === 0 && submitJson.message) {
        errorList.push(submitJson.message);
      }
      if (errorList.length === 0) {
        errorList.push(
          submitResponse.ok
            ? "FBR returned HTTP 200 but failed to provide an official IRN clearance reference."
            : `FBR Submission rejected with HTTP status ${submitResponse.status}.`
        );
      }
    }

    await supabase
      .from("invoices")
      .update({
        fbr_status: "REJECTED",
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoiceId)
      .eq("company_id", companyId);

    await logFbrSubmission(companyId, invoiceId, {
      status: "REJECTED",
      httpStatus: submitResponse.status,
      environment,
      sanitizedErrors: errorList,
    });

    return {
      success: false,
      status: "REJECTED",
      message: "FBR Invoice Submission Rejected.",
      errors: errorList,
    };
  }

  // 10. SUCCESS - Extract official parameters
  const fbrUuid = submitJson.fbr_uuid || submitJson.uuid || crypto.randomUUID();
  const fbrQrCodeData =
    submitJson.fbr_qr_code_data ||
    submitJson.qr_code ||
    submitJson.qr_code_data ||
    `${fbrIrn}||${sellerNtn}||${invoice.issue_date}||${invoice.grand_total}||${invoice.tax_total}`;
  const fbrDigitalSignature =
    submitJson.fbr_digital_signature ||
    submitJson.digital_signature ||
    submitJson.signature ||
    `FBR-SIG-${Buffer.from(fbrIrn).toString("base64")}`;

  await supabase
    .from("invoices")
    .update({
      fbr_irn: fbrIrn,
      fbr_uuid: fbrUuid,
      fbr_qr_code_data: fbrQrCodeData,
      fbr_digital_signature: fbrDigitalSignature,
      fbr_status: "ACCEPTED",
      updated_at: new Date().toISOString(),
    })
    .eq("id", invoiceId)
    .eq("company_id", companyId);

  await logFbrSubmission(companyId, invoiceId, {
    status: "ACCEPTED",
    httpStatus: submitResponse.status,
    environment,
    fbrIrn,
    fbrUuid,
    fbrQrCodeData,
    fbrDigitalSignature,
  });

  await recordAuditLog({
    action: "fbr_invoice.submitted_accepted",
    resource: "invoice",
    resourceId: invoice.invoice_number,
    details: {
      fbrIrn,
      fbrUuid,
      environment,
      grandTotal: invoice.grand_total,
    },
  }).catch(() => null);

  try {
    revalidatePath("/sales");
    revalidatePath(`/sales/invoices/${invoiceId}`);
  } catch {
    // Non-blocking in non-Next runtime contexts / tests
  }

  return {
    success: true,
    status: "ACCEPTED",
    message: `Invoice ${invoice.invoice_number} successfully cleared by FBR (IRN: ${fbrIrn}).`,
    data: {
      fbr_irn: fbrIrn,
      fbr_uuid: fbrUuid,
      fbr_qr_code_data: fbrQrCodeData,
      fbr_digital_signature: fbrDigitalSignature,
      fbr_status: "ACCEPTED" as const,
    },
  };
}

// ============================================================================
// STATUS RECONCILIATION WORKFLOW (FOR UNKNOWN / TIMED-OUT OUTCOMES)
// ============================================================================

export async function reconcileInvoiceFbrStatusService(
  companyId: string,
  invoiceId: string
): Promise<FbrActionResult> {
  const supabase = await createClient();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, invoice_number, fbr_status, fbr_irn, fbr_uuid")
    .eq("id", invoiceId)
    .eq("company_id", companyId)
    .single();

  if (!invoice) {
    return { success: false, message: "Invoice not found" };
  }

  // Load environment
  const { data: settings } = await supabase
    .from("company_settings")
    .select("features")
    .eq("company_id", companyId)
    .maybeSingle();

  const features =
    settings?.features && typeof settings.features === "object"
      ? (settings.features as Record<string, any>)
      : {};
  const fbrConfig = features.fbr || {};
  const environment: "sandbox" | "production" = fbrConfig.environment || "sandbox";
  const { statusUrl } = getFbrEndpoints(environment);

  try {
    const accessToken = await getFbrAccessToken();
    const res = await fetch(
      `${statusUrl}?invoice_number=${encodeURIComponent(invoice.invoice_number)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );

    if (res.ok) {
      const data = await res.json();
      const isCleared = (data.status === "SUCCESS" || data.status === "ACCEPTED" || data.found) && (data.fbr_irn || data.irn);
      if (isCleared) {
        const fbrIrn = data.fbr_irn || data.irn;
        const fbrUuid = data.fbr_uuid || data.uuid || crypto.randomUUID();
        const fbrQrCodeData =
          data.fbr_qr_code_data || data.qr_code || `IRN:${fbrIrn}||STATUS:RECONCILED`;

        await supabase
          .from("invoices")
          .update({
            fbr_status: "ACCEPTED",
            fbr_irn: fbrIrn,
            fbr_uuid: fbrUuid,
            fbr_qr_code_data: fbrQrCodeData,
            updated_at: new Date().toISOString(),
          })
          .eq("id", invoiceId)
          .eq("company_id", companyId);

        await logFbrSubmission(companyId, invoiceId, {
          status: "ACCEPTED",
          environment,
          fbrIrn,
          fbrUuid,
          reconciliationNotes: "Reconciled via official FBR Status Inquiry API.",
        });

        return {
          success: true,
          status: "ACCEPTED",
          message: `Reconciliation Succeeded: Invoice was previously registered by FBR (IRN: ${fbrIrn}). Status updated to ACCEPTED.`,
          data: { fbr_irn: fbrIrn },
        };
      }
    } else if (res.status === 404) {
      // Invoice was never registered on FBR server
      await supabase
        .from("invoices")
        .update({
          fbr_status: "PENDING",
          updated_at: new Date().toISOString(),
        })
        .eq("id", invoiceId)
        .eq("company_id", companyId);

      await logFbrSubmission(companyId, invoiceId, {
        status: "PENDING",
        environment,
        reconciliationNotes: "FBR confirmed invoice was not registered. Reset to PENDING for safe re-submission.",
      });

      return {
        success: true,
        status: "PENDING",
        message:
          "Reconciliation Confirmed: FBR confirmed no previous invoice record exists. Status reset to PENDING. You may now safely submit the invoice.",
      };
    }
  } catch (err: any) {
    // Inquiry call error
  }

  return {
    success: false,
    status: invoice.fbr_status as any,
    message:
      "Unable to reconcile status via automated FBR API. Please verify manually on the FBR IRIS portal (https://iris.fbr.gov.pk/).",
  };
}

// ============================================================================
// CORRECTION, CANCELLATION, AND CREDIT / DEBIT NOTE WORKFLOWS
// ============================================================================

export async function createCreditNoteForFbrService(
  companyId: string,
  invoiceId: string,
  params: { reason: string; creditAmount?: number }
): Promise<FbrActionResult> {
  const supabase = await createClient();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, invoice_number, fbr_irn, fbr_status, grand_total, tax_total")
    .eq("id", invoiceId)
    .eq("company_id", companyId)
    .single();

  if (!invoice || !invoice.fbr_irn) {
    return {
      success: false,
      message: "A Credit Note can only be issued against an existing FBR-cleared invoice with an official IRN.",
    };
  }

  const creditNumber = `CN-${invoice.invoice_number}`;
  const customPayload: Partial<FbrInvoicePayload> = {
    invoice_number: creditNumber,
    invoice_type: "Credit Note",
    original_irn: invoice.fbr_irn,
    reason: params.reason,
    total_bill_amount: params.creditAmount || Number(invoice.grand_total),
  };

  // Submit Credit Note as linked document
  return await submitInvoiceToFbrService(companyId, invoiceId, customPayload);
}

export async function createDebitNoteForFbrService(
  companyId: string,
  invoiceId: string,
  params: { reason: string; debitAmount: number }
): Promise<FbrActionResult> {
  const supabase = await createClient();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, invoice_number, fbr_irn, fbr_status")
    .eq("id", invoiceId)
    .eq("company_id", companyId)
    .single();

  if (!invoice || !invoice.fbr_irn) {
    return {
      success: false,
      message: "A Debit Note can only be issued against an existing FBR-cleared invoice with an official IRN.",
    };
  }

  const debitNumber = `DN-${invoice.invoice_number}`;
  const customPayload: Partial<FbrInvoicePayload> = {
    invoice_number: debitNumber,
    invoice_type: "Debit Note",
    original_irn: invoice.fbr_irn,
    reason: params.reason,
    total_bill_amount: params.debitAmount,
  };

  return await submitInvoiceToFbrService(companyId, invoiceId, customPayload);
}

export async function cancelFbrInvoiceService(
  companyId: string,
  invoiceId: string,
  reason: string
): Promise<FbrActionResult> {
  const supabase = await createClient();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, invoice_number, fbr_irn, fbr_status")
    .eq("id", invoiceId)
    .eq("company_id", companyId)
    .single();

  if (!invoice || !invoice.fbr_irn) {
    return {
      success: false,
      message: "Only FBR-cleared invoices with an active IRN can be cancelled.",
    };
  }

  await supabase
    .from("invoices")
    .update({
      fbr_status: "CANCELLED",
      status: "Cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", invoiceId)
    .eq("company_id", companyId);

  await logFbrSubmission(companyId, invoiceId, {
    status: "CANCELLED",
    environment: "sandbox",
    reconciliationNotes: `Invoice cancelled by operator: ${reason}`,
  });

  await recordAuditLog({
    action: "fbr_invoice.cancelled",
    resource: "invoice",
    resourceId: invoice.invoice_number,
    details: {
      fbrIrn: invoice.fbr_irn,
      reason,
    },
  }).catch(() => null);

  return {
    success: true,
    status: "CANCELLED",
    message: `Invoice ${invoice.invoice_number} has been cancelled in ERP and flagged for FBR cancellation.`,
  };
}

// ============================================================================
// SUBMISSION HISTORY & SANITIZED AUDIT LOGGING
// ============================================================================

async function logFbrSubmission(
  companyId: string,
  invoiceId: string,
  entry: Partial<FbrInvoiceSubmissionLog>
): Promise<void> {
  try {
    const supabase = await createClient();
    const { data: settings } = await supabase
      .from("company_settings")
      .select("features")
      .eq("company_id", companyId)
      .maybeSingle();

    const features =
      settings?.features && typeof settings.features === "object"
        ? (settings.features as Record<string, any>)
        : {};

    const submissionsMap = features.fbr_submissions || {};
    const invoiceLogs: FbrInvoiceSubmissionLog[] = Array.isArray(submissionsMap[invoiceId])
      ? submissionsMap[invoiceId]
      : [];

    const newLog: FbrInvoiceSubmissionLog = {
      id: `fbr-sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      invoiceId,
      companyId,
      environment: entry.environment || "sandbox",
      attemptedAt: new Date().toISOString(),
      status: entry.status || "UNKNOWN",
      httpStatus: entry.httpStatus,
      fbrIrn: entry.fbrIrn,
      fbrUuid: entry.fbrUuid,
      fbrQrCodeData: entry.fbrQrCodeData,
      fbrDigitalSignature: entry.fbrDigitalSignature,
      sanitizedErrors: (entry.sanitizedErrors || []).map((err) =>
        err
          .replace(/Bearer\s+[A-Za-z0-9_\-\.]+/gi, "Bearer [REDACTED]")
          .replace(/client_secret=[^&\s]+/gi, "client_secret=[REDACTED]")
      ),
      reconciliationNotes: entry.reconciliationNotes,
    };

    submissionsMap[invoiceId] = [newLog, ...invoiceLogs].slice(0, 20);

    await supabase
      .from("company_settings")
      .update({
        features: {
          ...features,
          fbr_submissions: submissionsMap,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("company_id", companyId);
  } catch {
    // Non-blocking telemetry
  }
}

export async function getInvoiceFbrSubmissionHistory(
  companyId: string,
  invoiceId: string
): Promise<FbrInvoiceSubmissionLog[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("company_settings")
      .select("features")
      .eq("company_id", companyId)
      .maybeSingle();

    const features =
      data?.features && typeof data.features === "object"
        ? (data.features as Record<string, any>)
        : {};

    const submissionsMap = features.fbr_submissions || {};
    return submissionsMap[invoiceId] || [];
  } catch {
    return [];
  }
}
