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

