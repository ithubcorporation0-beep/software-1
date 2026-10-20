"use server";

import { submitInvoiceToFbrService, type FbrActionResult } from "@/lib/fbr-service";

/**
 * Server Action: Submits an invoice to the FBR (Federal Board of Revenue) Pakistan Digital Invoicing system.
 *
 * Implements strict two-step verification:
 * 1. Validates the invoice payload with the FBR Validate API endpoint.
 *    If validation fails, returns the exact error messages to the user without submitting.
 * 2. If validation succeeds, immediately calls the FBR Submit API endpoint.
 * 3. Upon successful submission response, updates the database record with:
 *    - fbr_irn (Invoice Reference Number)
 *    - fbr_uuid
 *    - fbr_qr_code_data
 *    - fbr_digital_signature
 *    - fbr_status = 'SUBMITTED'
 *
 * Adheres strictly to Multi-Tenant isolation and never uses `SELECT *`.
 */
export async function submitInvoiceToFbrAction(
  companyId: string,
  invoiceId: string
): Promise<FbrActionResult> {
  try {
    if (!companyId || !invoiceId) {
      return {
        success: false,
        message: "Missing required parameters: companyId and invoiceId must be provided.",
      };
    }

    return await submitInvoiceToFbrService(companyId, invoiceId);
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || "An unexpected error occurred during FBR invoice submission.",
    };
  }
}
