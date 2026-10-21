export type FbrOnboardingStatus =
  | "Not Configured"
  | "Awaiting Provider"
  | "Awaiting Credentials"
  | "Sandbox Not Tested"
  | "Sandbox Connected"
  | "Production Pending Approval"
  | "Production Connected"
  | "Connection Error";

export interface FbrCompanyConfig {
  enabled: boolean;
  environment: "sandbox" | "production";
  integratorName: string;
  sellerNtn: string;
  sellerStrn: string;
  posId?: string;
  enableDigitalInvoicing: boolean;
  enableTaxpayerVerification: boolean;
  onboardingStatus: FbrOnboardingStatus;
  lastTestedAt?: string | null;
  lastTestStatus?: "SUCCESS" | "FAILED" | null;
  lastTestMessage?: string | null;
  recentErrors?: Array<{ timestamp: string; message: string }>;
}

export interface FbrCredentialsStatus {
  hasClientId: boolean;
  maskedClientId: string;
  hasClientSecret: boolean;
  hasSellerNtn: boolean;
  tokenUrl: string;
  validateUrl: string;
  submitUrl: string;
  inquiryUrl: string;
}

export interface FbrIntegrationOverview {
  config: FbrCompanyConfig;
  credentialsStatus: FbrCredentialsStatus;
  effectiveStatus: FbrOnboardingStatus;
}

export const DEFAULT_FBR_CONFIG: FbrCompanyConfig = {
  enabled: false,
  environment: "sandbox",
  integratorName: "PRAL (Pakistan Revenue Automation Limited)",
  sellerNtn: "",
  sellerStrn: "",
  posId: "",
  enableDigitalInvoicing: true,
  enableTaxpayerVerification: true,
  onboardingStatus: "Not Configured",
  lastTestedAt: null,
  lastTestStatus: null,
  lastTestMessage: null,
  recentErrors: [],
};

export const DEFAULT_FBR_CREDENTIALS_STATUS: FbrCredentialsStatus = {
  hasClientId: false,
  maskedClientId: "Not Configured",
  hasClientSecret: false,
  hasSellerNtn: false,
  tokenUrl: "https://api.fbr.gov.pk/oauth2/token",
  validateUrl: "https://api.fbr.gov.pk/invoices/validate",
  submitUrl: "https://api.fbr.gov.pk/invoices/submit",
  inquiryUrl: "https://api.fbr.gov.pk/taxpayer/atl-inquiry",
};

export const DEFAULT_FBR_OVERVIEW: FbrIntegrationOverview = {
  config: DEFAULT_FBR_CONFIG,
  credentialsStatus: DEFAULT_FBR_CREDENTIALS_STATUS,
  effectiveStatus: "Not Configured",
};

export type TaxpayerVerificationSource =
  | "AUTOMATED_GATEWAY"
  | "MANUAL_PORTAL"
  | "MANUAL_SMS"
  | "FORMAT_VALIDATED_ONLY";

export type TaxpayerAtlStatus =
  | "Active"
  | "Inactive"
  | "Format Validated (ATL Unverified)"
  | "Format Error"
  | "API Connection Error";

export type SalesTaxRegTypeStatus =
  | "Registered"
  | "Unregistered"
  | "Exempt"
  | "Not Found"
  | "Pending"
  | "Unable to Verify";

export type SalesTaxAtlStatus =
  | "Verified Active"
  | "Verified Inactive"
  | "Exempt"
  | "Not Registered"
  | "Not Found"
  | "Pending"
  | "Unable to Verify";

export type IncomeTaxAtlStatus =
  | "Verified Active"
  | "Verified Inactive"
  | "Not Registered"
  | "Not Found"
  | "Pending"
  | "Unable to Verify";

export interface FbrThreeIndicators {
  salesTaxRegType: {
    status: SalesTaxRegTypeStatus;
    strn?: string;
    category?: string;
    details?: string;
  };
  salesTaxAtl: {
    status: SalesTaxAtlStatus;
    details?: string;
  };
  incomeTaxAtl: {
    status: IncomeTaxAtlStatus;
    isFiler: boolean;
    details?: string;
  };
}

export interface TaxpayerVerificationRecord {
  id: string;
  companyId: string;
  idType: "CNIC" | "NTN" | "STRN" | "UNKNOWN";
  rawIdentifier: string;
  formattedIdentifier: string;
  maskedIdentifier: string;
  validFormat: boolean;
  status: TaxpayerAtlStatus;
  isFiler: boolean;
  indicators?: FbrThreeIndicators;
  source: TaxpayerVerificationSource;
  verifiedAt: string;
  verifiedBy?: string;
  referenceNumber?: string;
  notes?: string;
  taxpayerName?: string;
  province?: string;
  gender?: "Male" | "Female";
  taxSection?: string;
  activeRate?: string;
  nonFilerRate?: string;
  officialLinks?: {
    portalUrl: string;
    irisUrl: string;
    smsInstruction: string;
  };
}

// ============================================================================
// DIGITAL INVOICING (DI v1.12) SPECIFICATIONS & SUBMISSION LIFECYCLE
// ============================================================================

export type FbrInvoiceOutcomeStatus =
  | "ACCEPTED"
  | "REJECTED"
  | "PENDING"
  | "UNKNOWN"
  | "CANCELLED"
  | "NOT_SUBMITTED";

export interface FbrValidationRuleCheck {
  ruleId: string;
  field: string;
  title: string;
  passed: boolean;
  message: string;
}

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
  seller_strn?: string;
  pos_id?: string;
  buyer_ntn: string;
  buyer_cnic?: string;
  buyer_name: string;
  buyer_type?: string;
  invoice_date: string;
  invoice_number: string;
  invoice_type: "Sale Invoice" | "Credit Note" | "Debit Note";
  original_irn?: string;
  reason?: string;
  total_bill_amount: number;
  total_sales_tax: number;
  total_net_amount: number;
  items: FbrInvoiceItemPayload[];
}

export interface FbrInvoicePreview {
  invoiceId: string;
  invoiceNumber: string;
  issueDate: string;
  payload: FbrInvoicePayload;
  validationChecks: FbrValidationRuleCheck[];
  isValid: boolean;
  canSubmit: boolean;
  environment: "sandbox" | "production";
  integratorName: string;
  isCredentialsConfigured: boolean;
  isAlreadySubmitted: boolean;
  existingIrn?: string | null;
  existingStatus?: FbrInvoiceOutcomeStatus;
  reconciliationRequired: boolean;
}

export interface FbrInvoiceSubmissionLog {
  id: string;
  invoiceId: string;
  companyId: string;
  environment: "sandbox" | "production";
  attemptedAt: string;
  status: FbrInvoiceOutcomeStatus;
  httpStatus?: number;
  fbrIrn?: string | null;
  fbrUuid?: string | null;
  fbrQrCodeData?: string | null;
  fbrDigitalSignature?: string | null;
  sanitizedErrors?: string[];
  reconciliationNotes?: string;
}


