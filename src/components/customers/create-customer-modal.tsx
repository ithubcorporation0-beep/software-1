"use client";

import * as React from "react";
import {
  Building2,
  X,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  Info,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Customer } from "@/types/database.types";
import { FbrThreeIndicators } from "@/lib/fbr-types";

export interface CreateCustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  onCustomerCreated?: (customer: Customer) => void;
}

interface FormState {
  companyName: string;
  contactPerson: string;
  email: string;
  mobileNumber: string;
  loginStatus: string;
  customerType: "Retailer" | "WS / Distributor";
  ntnNumber: string;
  cnicNumber: string;
  salesTaxRegType: string;
  salesTaxAtl: string;
  incomeTaxAtl: string;
  paymentTerms: string;
  carriedBy: string;
  strnNumber: string;
  customerCategory: string;
  customerGroup: string;
  openingBalance: string;
  creditLimit: string;
  billingName: string;
  billingAddress: string;
  addressLine2: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  sameAsBilling: boolean;
  shippingName: string;
  shippingAddress: string;
  shippingAddressLine2: string;
  shippingCity: string;
  shippingState: string;
  shippingCountry: string;
  shippingZipCode: string;
}

const INITIAL_FORM_STATE: FormState = {
  companyName: "",
  contactPerson: "",
  email: "",
  mobileNumber: "",
  loginStatus: "Active",
  customerType: "Retailer",
  ntnNumber: "",
  cnicNumber: "",
  salesTaxRegType: "",
  salesTaxAtl: "",
  incomeTaxAtl: "",
  paymentTerms: "",
  carriedBy: "",
  strnNumber: "",
  customerCategory: "",
  customerGroup: "",
  openingBalance: "0",
  creditLimit: "0",
  billingName: "",
  billingAddress: "",
  addressLine2: "",
  city: "",
  state: "",
  country: "Pakistan",
  zipCode: "",
  sameAsBilling: true,
  shippingName: "",
  shippingAddress: "",
  shippingAddressLine2: "",
  shippingCity: "",
  shippingState: "",
  shippingCountry: "Pakistan",
  shippingZipCode: "",
};

export function CreateCustomerModal({
  open,
  onOpenChange,
  companyId,
  onCustomerCreated,
}: CreateCustomerModalProps) {
  const [formData, setFormData] = React.useState<FormState>(INITIAL_FORM_STATE);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successNotice, setSuccessNotice] = React.useState<string | null>(null);

  // FBR Tax Verification State
  const [isVerifyingTax, setIsVerifyingTax] = React.useState(false);
  const [taxVerificationResult, setTaxVerificationResult] = React.useState<{
    verified: boolean;
    validFormat: boolean;
    idType?: "CNIC" | "NTN" | "STRN" | "UNKNOWN";
    rawId?: string;
    formattedId?: string;
    isFiler?: boolean;
    atlStatus?: "Active" | "Inactive" | "Unregistered" | "Pending";
    fbrGatewayConfigured?: boolean;
    verifiedOnline?: boolean;
    province?: string;
    gender?: "Male" | "Female";
    businessName?: string;
    message: string;
    detail?: string;
    taxSection?: string;
    activeRate?: string;
    nonFilerRate?: string;
    indicators?: FbrThreeIndicators;
    officialVerification?: {
      smsInstruction: string;
      portalUrl: string;
      irisUrl: string;
      incomeTaxAtlUrl?: string;
      salesTaxAtlUrl?: string;
    };
  } | null>(null);

  // Reset form when modal opens
  React.useEffect(() => {
    if (open) {
      setErrorMessage(null);
      setSuccessNotice(null);
      setTaxVerificationResult(null);
    }
  }, [open]);

  // Handle ESC key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    };
    if (open) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onOpenChange]);

  const handleChange = (
    field: keyof FormState,
    value: string | "Retailer" | "WS / Distributor"
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errorMessage) setErrorMessage(null);
  };

  // Quick setter for Active Filer vs Non-Filer status
  const setAtlStatusQuick = (status: "Active" | "In-Active") => {
    setFormData((prev) => ({
      ...prev,
      salesTaxAtl: status,
      incomeTaxAtl: status,
      salesTaxRegType: status === "Active" ? "Registered" : "Unregistered",
    }));
    if (taxVerificationResult) {
      setTaxVerificationResult({
        ...taxVerificationResult,
        verified: status === "Active",
        isFiler: status === "Active",
        atlStatus: status === "Active" ? "Active" : "Inactive",
        indicators: {
          salesTaxRegType: {
            status: status === "Active" ? "Registered" : "Unregistered",
            details: status === "Active" ? "Manual status: Registered" : "Manual status: Unregistered",
          },
          salesTaxAtl: {
            status: status === "Active" ? "Verified Active" : "Verified Inactive",
            details: status === "Active" ? "Manual status: Active" : "Manual status: Inactive",
          },
          incomeTaxAtl: {
            status: status === "Active" ? "Verified Active" : "Verified Inactive",
            isFiler: status === "Active",
            details: status === "Active" ? "Manual status: Active Filer" : "Manual status: Inactive Non-Filer",
          },
        },
        message:
          status === "Active"
            ? `Status set to Active Filer. Standard ${
                formData.customerType === "Retailer" ? "236H (0.5%)" : "236G (0.1%)"
              } tax rate applied.`
            : `Status set to In-Active / Non-Filer. Penalty rate ${
                formData.customerType === "Retailer" ? "236H (1.0%)" : "236G (0.2%)"
              } applied.`,
      });
    }
  };

  const handleVerifyTax = async () => {
    const taxNum = formData.cnicNumber.trim() || formData.ntnNumber.trim();
    if (!taxNum) {
      setTaxVerificationResult({
        verified: false,
        validFormat: false,
        message: "Please enter a CNIC Number (13 digits) or NTN Number (7-8 digits) to verify against FBR ATL.",
        detail: "Example CNIC: 16101-5419566-3 | Example NTN: 1234567-8",
      });
      return;
    }

    setIsVerifyingTax(true);
    setTaxVerificationResult(null);

    try {
      const res = await fetch("/api/fbr/verify-taxpayer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taxNumber: taxNum,
          customerType: formData.customerType,
          companyId,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to verify tax number");
      }

      const data = json.data;

      // Automatically format and place identifier in the correct field
      if (data.validFormat && data.formattedId) {
        if (data.idType === "CNIC") {
          setFormData((prev) => ({
            ...prev,
            cnicNumber: data.formattedId,
            // If the user typed their 13-digit CNIC into the NTN box, clear it from NTN
            ntnNumber: prev.ntnNumber.replace(/[\s-]/g, "") === data.rawId.replace(/[\s-]/g, "") ? "" : prev.ntnNumber,
          }));
        } else if (data.idType === "NTN") {
          setFormData((prev) => ({
            ...prev,
            ntnNumber: data.formattedId,
          }));
        }
      }

      if (data.validFormat && data.indicators) {
        const ind = data.indicators;
        if (data.verificationSource === "AUTOMATED_GATEWAY" || data.verifiedOnline) {
          setFormData((prev) => ({
            ...prev,
            salesTaxRegType:
              ind.salesTaxRegType.status === "Registered"
                ? "Registered"
                : ind.salesTaxRegType.status === "Unregistered"
                ? "Unregistered"
                : ind.salesTaxRegType.status === "Exempt"
                ? "Exempt"
                : prev.salesTaxRegType || "Registered",
            salesTaxAtl:
              ind.salesTaxAtl.status === "Verified Active"
                ? "Active"
                : ind.salesTaxAtl.status === "Verified Inactive"
                ? "In-Active"
                : ind.salesTaxAtl.status === "Exempt"
                ? "Exempt"
                : "Active",
            incomeTaxAtl:
              ind.incomeTaxAtl.status === "Verified Active"
                ? "Active"
                : ind.incomeTaxAtl.status === "Verified Inactive"
                ? "In-Active"
                : "Active",
          }));
        }
      } else if (data.validFormat && data.verificationSource === "AUTOMATED_GATEWAY") {
        if (data.isFiler) {
          setFormData((prev) => ({
            ...prev,
            salesTaxAtl: "Active",
            incomeTaxAtl: "Active",
            salesTaxRegType: prev.salesTaxRegType || "Registered",
          }));
        } else {
          setFormData((prev) => ({
            ...prev,
            salesTaxAtl: "In-Active",
            incomeTaxAtl: "In-Active",
            salesTaxRegType: prev.salesTaxRegType || "Unregistered",
          }));
        }
      } else if (!data.validFormat) {
        setFormData((prev) => ({
          ...prev,
          salesTaxAtl: "",
          incomeTaxAtl: "",
          salesTaxRegType: "Unregistered",
        }));
      }

      setTaxVerificationResult(data);
    } catch (err: any) {
      setTaxVerificationResult({
        verified: false,
        validFormat: false,
        message: err.message || "Unable to complete tax number verification.",
        detail: "Please check your network connection and verify identifier format.",
      });
    } finally {
      setIsVerifyingTax(false);
    }
  };

  const submitCustomer = async (andNew: boolean) => {
    const name = formData.contactPerson.trim() || formData.companyName.trim();
    if (!name && !formData.companyName.trim()) {
      setErrorMessage("Please enter either a Company Name or Contact Person.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessNotice(null);

    try {
      const payload = {
        companyId,
        name: name || "Valued Client",
        companyName: formData.companyName.trim() || undefined,
        contactPerson: formData.contactPerson.trim() || undefined,
        email: formData.email.trim() || undefined,
        phone: formData.mobileNumber.trim() || undefined,
        mobileNumber: formData.mobileNumber.trim() || undefined,
        loginStatus: formData.loginStatus,
        customerType: formData.customerType,
        ntnNumber: formData.ntnNumber.trim() || undefined,
        cnicNumber: formData.cnicNumber.trim() || undefined,
        taxNumber: formData.ntnNumber.trim() || formData.cnicNumber.trim() || undefined,
        salesTaxRegType: formData.salesTaxRegType || undefined,
        salesTaxAtl: formData.salesTaxAtl || undefined,
        incomeTaxAtl: formData.incomeTaxAtl || undefined,
        paymentTerms: formData.paymentTerms.trim() || undefined,
        carriedBy: formData.carriedBy.trim() || undefined,
        strnNumber: formData.strnNumber.trim() || undefined,
        customerCategory: formData.customerCategory || undefined,
        customerGroup: formData.customerGroup || undefined,
        openingBalance: parseFloat(formData.openingBalance) || 0,
        creditLimit: parseFloat(formData.creditLimit) || 0,
        billingName: formData.billingName.trim() || undefined,
        billingAddress: formData.billingAddress.trim() || undefined,
        addressLine2: formData.addressLine2.trim() || undefined,
        city: formData.city.trim() || undefined,
        state: formData.state || undefined,
        country: formData.country.trim() || "Pakistan",
        zipCode: formData.zipCode.trim() || undefined,
        sameAsBilling: formData.sameAsBilling,
        shippingName: (formData.sameAsBilling ? formData.billingName : formData.shippingName).trim() || undefined,
        shippingAddress: (formData.sameAsBilling ? formData.billingAddress : formData.shippingAddress).trim() || undefined,
        shippingAddressLine2: (formData.sameAsBilling ? formData.addressLine2 : formData.shippingAddressLine2).trim() || undefined,
        shippingCity: (formData.sameAsBilling ? formData.city : formData.shippingCity).trim() || undefined,
        shippingState: formData.sameAsBilling ? formData.state : formData.shippingState || undefined,
        shippingCountry: (formData.sameAsBilling ? formData.country : formData.shippingCountry).trim() || "Pakistan",
        shippingZipCode: (formData.sameAsBilling ? formData.zipCode : formData.shippingZipCode).trim() || undefined,
        status: formData.loginStatus === "Inactive" ? "Inactive" : "Active",
      };

      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create customer record.");
      }

      if (onCustomerCreated && data.data) {
        onCustomerCreated(data.data);
      }

      if (andNew) {
        setFormData({
          ...INITIAL_FORM_STATE,
          customerType: formData.customerType,
          country: formData.country,
        });
        setTaxVerificationResult(null);
        setSuccessNotice(`Customer "${formData.companyName || formData.contactPerson}" registered successfully! Enter next customer.`);
      } else {
        onOpenChange(false);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  React.useEffect(() => {
    if (!open) {
      setErrorMessage(null);
      setSuccessNotice(null);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div className="relative z-50 w-full max-w-4xl rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in-0 zoom-in-95 duration-150">
        {/* Header (Exact match to Image 2) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-950">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-950/70 dark:text-blue-400 dark:border-blue-900/50">
              <Building2 className="h-4 w-4" />
            </div>
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 tracking-tight">
              Create Customer
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-md p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-900 transition-colors"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 text-xs sm:text-sm">
          {/* Notification Alert */}
          {errorMessage && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/80 p-3 text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="text-xs font-medium">{errorMessage}</div>
            </div>
          )}
          {successNotice && (
            <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="text-xs font-medium">{successNotice}</div>
            </div>
          )}

          {/* Row 1: Company Name & Contact Person */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <input
                type="text"
                placeholder="Company Name"
                value={formData.companyName}
                onChange={(e) => handleChange("companyName", e.target.value)}
                className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
            <div className="space-y-1">
              <input
                type="text"
                placeholder="Contact Person"
                value={formData.contactPerson}
                onChange={(e) => handleChange("contactPerson", e.target.value)}
                className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
          </div>

          {/* Row 2: Email & Mobile Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
            <div className="space-y-1">
              <input
                type="tel"
                placeholder="Mobile Number"
                value={formData.mobileNumber}
                onChange={(e) => handleChange("mobileNumber", e.target.value)}
                className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
              <p className="text-[11px] text-gray-400 dark:text-zinc-500 pl-0.5">
                Format: +[country code][phone number]
              </p>
            </div>
          </div>

          {/* Row 3: Login Status */}
          <div className="relative">
            <select
              value={formData.loginStatus}
              onChange={(e) => handleChange("loginStatus", e.target.value)}
              className="w-full appearance-none rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Pending">Pending Verification</option>
              <option value="Suspended">Suspended</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>

          {/* Row 4: Customer Type (Switch Box - Exact Match to Image 2) */}
          <div className="rounded-xl border border-gray-200 dark:border-zinc-800 p-4 bg-white dark:bg-zinc-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div>
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Customer Type
              </div>
              <div className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                Retailer uses 236H rates. Wholesale / Distributor uses 236G rates.
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-auto">
              <span
                onClick={() => handleChange("customerType", "Retailer")}
                className={cn(
                  "text-xs sm:text-sm font-medium cursor-pointer transition-colors",
                  formData.customerType === "Retailer"
                    ? "text-gray-900 dark:text-gray-100 font-semibold"
                    : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                )}
              >
                Retailer
              </span>

              {/* Toggle Switch */}
              <button
                type="button"
                role="switch"
                aria-checked={formData.customerType === "WS / Distributor"}
                onClick={() =>
                  handleChange(
                    "customerType",
                    formData.customerType === "Retailer"
                      ? "WS / Distributor"
                      : "Retailer"
                  )
                }
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500/30",
                  formData.customerType === "WS / Distributor"
                    ? "bg-blue-600"
                    : "bg-gray-200 dark:bg-zinc-700"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
                    formData.customerType === "WS / Distributor"
                      ? "translate-x-5"
                      : "translate-x-0"
                  )}
                />
              </button>

              <span
                onClick={() => handleChange("customerType", "WS / Distributor")}
                className={cn(
                  "text-xs sm:text-sm font-medium cursor-pointer transition-colors",
                  formData.customerType === "WS / Distributor"
                    ? "text-gray-900 dark:text-gray-100 font-semibold"
                    : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                )}
              >
                WS / Distributor
              </span>
            </div>
          </div>

          {/* Row 5: NTN Number, CNIC Number, Verify Tax Number button */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            <div className="sm:col-span-5">
              <input
                type="text"
                placeholder="NTN Number"
                value={formData.ntnNumber}
                onChange={(e) => handleChange("ntnNumber", e.target.value)}
                className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
            <div className="sm:col-span-4">
              <input
                type="text"
                placeholder="CNIC Number"
                value={formData.cnicNumber}
                onChange={(e) => handleChange("cnicNumber", e.target.value)}
                className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
            <div className="sm:col-span-3">
              <button
                type="button"
                onClick={handleVerifyTax}
                disabled={isVerifyingTax}
                className="h-[42px] w-full rounded-lg bg-[#ef4444] hover:bg-[#dc2626] active:bg-[#b91c1c] text-white font-semibold text-xs sm:text-sm shadow-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-70 cursor-pointer"
              >
                {isVerifyingTax ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <span>Verify Tax Number</span>
                )}
              </button>
            </div>
          </div>

          {/* FBR Verification Feedback */}
          {taxVerificationResult && (
            <div
              className={cn(
                "rounded-xl border p-4 text-xs transition-all animate-in fade-in-50 space-y-2.5",
                !taxVerificationResult.validFormat
                  ? "border-red-300 bg-red-50/90 text-red-900 dark:border-red-900/70 dark:bg-red-950/50 dark:text-red-200"
                  : taxVerificationResult.verifiedOnline && taxVerificationResult.isFiler
                  ? "border-emerald-300 bg-emerald-50/90 text-emerald-900 dark:border-emerald-900/70 dark:bg-emerald-950/50 dark:text-emerald-200"
                  : taxVerificationResult.verifiedOnline && !taxVerificationResult.isFiler
                  ? "border-amber-300 bg-amber-50/90 text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/50 dark:text-amber-200"
                  : "border-blue-200 bg-blue-50/80 text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200"
              )}
            >
              <div className="flex items-start gap-2.5">
                {!taxVerificationResult.validFormat ? (
                  <AlertCircle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
                ) : taxVerificationResult.verifiedOnline && taxVerificationResult.isFiler ? (
                  <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                ) : taxVerificationResult.verifiedOnline && !taxVerificationResult.isFiler ? (
                  <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                ) : (
                  <Info className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-sm">
                      {!taxVerificationResult.validFormat
                        ? "Tax Identifier Format Error"
                        : taxVerificationResult.verifiedOnline && taxVerificationResult.isFiler
                        ? "FBR Active Taxpayer (ATL) Verified Live"
                        : taxVerificationResult.verifiedOnline && !taxVerificationResult.isFiler
                        ? "FBR Inactive / Non-Filer Record"
                        : `${taxVerificationResult.idType || "Tax ID"} Format Validated`}
                    </p>
                    {taxVerificationResult.formattedId && (
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-black/5 dark:bg-white/10 font-semibold">
                        {taxVerificationResult.formattedId}
                      </span>
                    )}
                  </div>

                  <p className="mt-1 font-medium">{taxVerificationResult.message}</p>
                  {taxVerificationResult.detail && (
                    <p className="mt-1 text-xs opacity-90 leading-relaxed">
                      {taxVerificationResult.detail}
                    </p>
                  )}
                </div>
              </div>

              {/* 3 Indicators as shown in UNAZ */}
              {taxVerificationResult.indicators && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-black/5 dark:border-white/10">
                  <div className="rounded-lg bg-white/70 dark:bg-black/30 p-2.5 border border-black/5 dark:border-white/5 space-y-1">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                      1. Sales Tax Reg Type
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={cn(
                          "inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold",
                          taxVerificationResult.indicators.salesTaxRegType.status === "Registered"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : taxVerificationResult.indicators.salesTaxRegType.status === "Unregistered"
                            ? "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300"
                            : "bg-black/5 dark:bg-white/10"
                        )}
                      >
                        {taxVerificationResult.indicators.salesTaxRegType.status}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-lg bg-white/70 dark:bg-black/30 p-2.5 border border-black/5 dark:border-white/5 space-y-1">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                      2. Sales Tax ATL
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={cn(
                          "inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold",
                          taxVerificationResult.indicators.salesTaxAtl.status === "Verified Active"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : taxVerificationResult.indicators.salesTaxAtl.status === "Verified Inactive"
                            ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                            : "bg-black/5 dark:bg-white/10"
                        )}
                      >
                        {taxVerificationResult.indicators.salesTaxAtl.status}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-lg bg-white/70 dark:bg-black/30 p-2.5 border border-black/5 dark:border-white/5 space-y-1">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                      3. Income Tax ATL
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={cn(
                          "inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold",
                          taxVerificationResult.indicators.incomeTaxAtl.status === "Verified Active"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : taxVerificationResult.indicators.incomeTaxAtl.status === "Verified Inactive"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            : "bg-black/5 dark:bg-white/10"
                        )}
                      >
                        {taxVerificationResult.indicators.incomeTaxAtl.status}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Format is valid, but live FBR gateway is not configured in environment */}
              {taxVerificationResult.validFormat && !taxVerificationResult.verifiedOnline && (
                <div className="pt-2 border-t border-blue-200/60 dark:border-blue-900/60 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="text-[11px] text-blue-800 dark:text-blue-300 font-mono">
                      {taxVerificationResult.officialVerification?.smsInstruction}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                      <a
                        href={taxVerificationResult.officialVerification?.irisUrl || "https://iris.fbr.gov.pk/"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white dark:bg-zinc-800 text-blue-700 dark:text-blue-300 hover:text-blue-800 border border-blue-200 dark:border-zinc-700 text-xs font-medium transition-colors"
                        title="IRIS Verification Portal"
                      >
                        <span>IRIS Portal</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>

                      <a
                        href={taxVerificationResult.officialVerification?.incomeTaxAtlUrl || "https://www.fbr.gov.pk/categ/active-taxpayer-list-income-tax/51147/30859/71169"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white dark:bg-zinc-800 text-blue-700 dark:text-blue-300 hover:text-blue-800 border border-blue-200 dark:border-zinc-700 text-xs font-medium transition-colors"
                        title="Income Tax ATL List Info"
                      >
                        <span>Income Tax ATL</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>

                      <a
                        href={taxVerificationResult.officialVerification?.salesTaxAtlUrl || "https://www.fbr.gov.pk/atl-sales-tax/163223"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white dark:bg-zinc-800 text-blue-700 dark:text-blue-300 hover:text-blue-800 border border-blue-200 dark:border-zinc-700 text-xs font-medium transition-colors"
                        title="Sales Tax Active Taxpayer List"
                      >
                        <span>Sales Tax ATL</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-blue-200/40 dark:border-blue-900/40">
                    <button
                      type="button"
                      onClick={() => setAtlStatusQuick("Active")}
                      className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                      ✓ Set Active (0.5%)
                    </button>

                    <button
                      type="button"
                      onClick={() => setAtlStatusQuick("In-Active")}
                      className="px-2.5 py-1 rounded bg-zinc-700 hover:bg-zinc-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                      ✕ Set Non-Filer
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Row 6: Sales Tax Reg Type, Sales Tax ATL, Income Tax ATL */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <select
                value={formData.salesTaxRegType}
                onChange={(e) => handleChange("salesTaxRegType", e.target.value)}
                className="w-full appearance-none rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
              >
                <option value="">Sales Tax Reg Type</option>
                <option value="Registered">Registered</option>
                <option value="Unregistered">Unregistered</option>
                <option value="Exempt">Exempt</option>
                <option value="Zero Rated">Zero Rated</option>
                <option value="Wholesaler / Retailer">Wholesaler / Retailer</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>

            <div className="relative">
              <select
                value={formData.salesTaxAtl}
                onChange={(e) => handleChange("salesTaxAtl", e.target.value)}
                className="w-full appearance-none rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
              >
                <option value="">Sales Tax ATL</option>
                <option value="Active">Active</option>
                <option value="In-Active">In-Active</option>
                <option value="Exempt">Exempt</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>

            <div className="relative">
              <select
                value={formData.incomeTaxAtl}
                onChange={(e) => handleChange("incomeTaxAtl", e.target.value)}
                className="w-full appearance-none rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
              >
                <option value="">Income Tax ATL</option>
                <option value="Active">Active</option>
                <option value="In-Active">In-Active</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
          </div>

          {/* Row 7: Payment Terms, Carried By, STRN Number, Customer Category */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <input
                type="text"
                placeholder="Payment Terms"
                value={formData.paymentTerms}
                onChange={(e) => handleChange("paymentTerms", e.target.value)}
                className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="Carried By"
                value={formData.carriedBy}
                onChange={(e) => handleChange("carriedBy", e.target.value)}
                className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="STRN Number"
                value={formData.strnNumber}
                onChange={(e) => handleChange("strnNumber", e.target.value)}
                className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
            <div className="relative">
              <select
                value={formData.customerCategory}
                onChange={(e) => handleChange("customerCategory", e.target.value)}
                className="w-full appearance-none rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
              >
                <option value="">Customer Category</option>
                <option value="Corporate">Corporate</option>
                <option value="Commercial">Commercial</option>
                <option value="Retail">Retail</option>
                <option value="Distributor">Distributor</option>
                <option value="Key Accounts">Key Accounts</option>
                <option value="Export">Export</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
          </div>

          {/* Row 8: Customer Group */}
          <div className="relative">
            <select
              value={formData.customerGroup}
              onChange={(e) => handleChange("customerGroup", e.target.value)}
              className="w-full appearance-none rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
            >
              <option value="">Customer Group</option>
              <option value="General">General</option>
              <option value="Tier 1 Accounts">Tier 1 Accounts</option>
              <option value="Tier 2 Accounts">Tier 2 Accounts</option>
              <option value="Islamabad Region">Islamabad Region</option>
              <option value="Karachi Region">Karachi Region</option>
              <option value="Lahore Region">Lahore Region</option>
              <option value="Rawalpindi Region">Rawalpindi Region</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>

          {/* Row 9: Opening Balance & Credit Limit (Notched Outline Floating Labels) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="relative rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 pt-2.5 pb-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
              <span className="absolute -top-2.5 left-3 bg-white dark:bg-zinc-900 px-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 select-none">
                Opening Balance
              </span>
              <input
                type="number"
                value={formData.openingBalance}
                onChange={(e) => handleChange("openingBalance", e.target.value)}
                className="w-full bg-transparent text-sm text-gray-900 dark:text-gray-100 focus:outline-none"
              />
            </div>

            <div className="relative rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 pt-2.5 pb-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
              <span className="absolute -top-2.5 left-3 bg-white dark:bg-zinc-900 px-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 select-none">
                Credit Limit
              </span>
              <input
                type="number"
                value={formData.creditLimit}
                onChange={(e) => handleChange("creditLimit", e.target.value)}
                className="w-full bg-transparent text-sm text-gray-900 dark:text-gray-100 focus:outline-none"
              />
            </div>
          </div>

          {/* Row 10: Billing Name */}
          <div>
            <input
              type="text"
              placeholder="Billing Name"
              value={formData.billingName}
              onChange={(e) => handleChange("billingName", e.target.value)}
              className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>

          {/* Row 11: Billing Address */}
          <div>
            <input
              type="text"
              placeholder="Billing Address"
              value={formData.billingAddress}
              onChange={(e) => handleChange("billingAddress", e.target.value)}
              className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>

          {/* Row 12: Address Line 2 */}
          <div>
            <input
              type="text"
              placeholder="Address Line 2"
              value={formData.addressLine2}
              onChange={(e) => handleChange("addressLine2", e.target.value)}
              className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>

          {/* Row 13: City & State */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <input
                type="text"
                placeholder="City"
                value={formData.city}
                onChange={(e) => handleChange("city", e.target.value)}
                className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
            <div className="relative">
              <select
                value={formData.state}
                onChange={(e) => handleChange("state", e.target.value)}
                className="w-full appearance-none rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
              >
                <option value="">State</option>
                <option value="Islamabad Capital Territory">Islamabad Capital Territory</option>
                <option value="Punjab">Punjab</option>
                <option value="Sindh">Sindh</option>
                <option value="Khyber Pakhtunkhwa">Khyber Pakhtunkhwa</option>
                <option value="Balochistan">Balochistan</option>
                <option value="Gilgit-Baltistan">Gilgit-Baltistan</option>
                <option value="Azad Jammu & Kashmir">Azad Jammu & Kashmir</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
          </div>

          {/* Row 14: Country & Zip Code */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="relative rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 pt-2.5 pb-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
              <span className="absolute -top-2.5 left-3 bg-white dark:bg-zinc-900 px-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 select-none">
                Country
              </span>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => handleChange("country", e.target.value)}
                className="w-full bg-transparent text-sm text-gray-900 dark:text-gray-100 focus:outline-none"
              />
            </div>

            <div>
              <input
                type="text"
                placeholder="Zip Code"
                value={formData.zipCode}
                onChange={(e) => handleChange("zipCode", e.target.value)}
                className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
          </div>

          {/* Shipping Address Same as Billing Checkbox */}
          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.sameAsBilling}
                onChange={(e) => setFormData((prev) => ({ ...prev, sameAsBilling: e.target.checked }))}
                className="rounded border-gray-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500/20 cursor-pointer"
              />
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Shipping address same as billing
              </span>
            </label>
          </div>

          {/* Conditional Shipping Address Block */}
          {!formData.sameAsBilling && (
            <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-zinc-800 animate-in fade-in duration-150">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Shipping Address
              </h4>
              <div>
                <input
                  type="text"
                  placeholder="Shipping Name"
                  value={formData.shippingName}
                  onChange={(e) => handleChange("shippingName", e.target.value)}
                  className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Shipping Address"
                  value={formData.shippingAddress}
                  onChange={(e) => handleChange("shippingAddress", e.target.value)}
                  className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="City"
                  value={formData.shippingCity}
                  onChange={(e) => handleChange("shippingCity", e.target.value)}
                  className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
                <input
                  type="text"
                  placeholder="Zip Code"
                  value={formData.shippingZipCode}
                  onChange={(e) => handleChange("shippingZipCode", e.target.value)}
                  className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer (Exact match to Image 2 & 3: Cancel, Create & New, Create) */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-950">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-5 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => submitCustomer(true)}
            disabled={isSubmitting}
            className="rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 px-5 py-2 text-sm font-medium text-gray-800 dark:text-gray-200 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <span>Create & New</span>
          </button>
          <button
            type="button"
            onClick={() => submitCustomer(false)}
            disabled={isSubmitting}
            className="rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] active:bg-[#1e40af] px-6 py-2 text-sm font-semibold text-white transition-colors shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <span>Create</span>
          </button>
        </div>
      </div>
    </div>
  );
}
