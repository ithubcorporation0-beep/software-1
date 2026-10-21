import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  TaxpayerVerificationInterface,
  resolveSalesTaxRegState,
  resolveSalesTaxAtlState,
  resolveIncomeTaxAtlState,
  getStatusBadgeClass,
} from "@/components/taxpayer/taxpayer-verification-interface";
import * as settingsActions from "@/app/(erp)/settings/actions";
import { FbrTaxpayerVerificationResult } from "@/lib/fbr-taxpayer-service";

vi.mock("@/app/(erp)/settings/actions", () => ({
  verifyTaxpayerAction: vi.fn(),
  recordManualTaxpayerVerificationAction: vi.fn(),
  getTaxpayerVerificationHistoryAction: vi.fn().mockResolvedValue({ success: true, data: [] }),
}));

describe("Taxpayer Verification User Interface Suite", () => {
  const mockCompanyId = "00000000-0000-0000-0000-000000000001";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(settingsActions.getTaxpayerVerificationHistoryAction).mockResolvedValue({
      success: true,
      data: [],
    });
  });

  describe("Independent State Resolvers", () => {
    it("resolves Sales Tax Reg Type states accurately without inference", () => {
      expect(resolveSalesTaxRegState("Registered", true)).toBe("Registered");
      expect(resolveSalesTaxRegState("Unregistered", true)).toBe("Not Registered");
      expect(resolveSalesTaxRegState("Not Registered", true)).toBe("Not Registered");
      expect(resolveSalesTaxRegState("Unable to Verify", true)).toBe("Unable to Verify");
      expect(resolveSalesTaxRegState("Pending", true)).toBe("Pending Authorization");
      expect(resolveSalesTaxRegState("Pending", false)).toBe("Manual Verification Required");
      expect(resolveSalesTaxRegState("Manual Verification Required", false)).toBe("Manual Verification Required");
    });

    it("resolves Sales Tax ATL states accurately without inference", () => {
      expect(resolveSalesTaxAtlState("Verified Active", true)).toBe("Verified Active");
      expect(resolveSalesTaxAtlState("Verified Inactive", true)).toBe("Verified Inactive");
      expect(resolveSalesTaxAtlState("Not Registered", true)).toBe("Not Registered");
      expect(resolveSalesTaxAtlState("Unable to Verify", true)).toBe("Unable to Verify");
      expect(resolveSalesTaxAtlState("Pending", true)).toBe("Pending Authorization");
      expect(resolveSalesTaxAtlState("Pending", false)).toBe("Manual Verification Required");
    });

    it("resolves Income Tax ATL states accurately without inference", () => {
      expect(resolveIncomeTaxAtlState("Verified Active", true)).toBe("Verified Active");
      expect(resolveIncomeTaxAtlState("Verified Inactive", true)).toBe("Verified Inactive");
      expect(resolveIncomeTaxAtlState("Not Registered", true)).toBe("Not Registered");
      expect(resolveIncomeTaxAtlState("Unable to Verify", true)).toBe("Unable to Verify");
      expect(resolveIncomeTaxAtlState("Pending", true)).toBe("Pending Authorization");
      expect(resolveIncomeTaxAtlState("Pending", false)).toBe("Manual Verification Required");
    });

    it("assigns appropriate badge color tokens to all clear states", () => {
      expect(getStatusBadgeClass("Verified Active")).toContain("emerald");
      expect(getStatusBadgeClass("Registered")).toContain("emerald");
      expect(getStatusBadgeClass("Verified Inactive")).toContain("rose");
      expect(getStatusBadgeClass("Not Registered")).toContain("zinc");
      expect(getStatusBadgeClass("Unable to Verify")).toContain("red");
      expect(getStatusBadgeClass("Pending Authorization")).toContain("blue");
      expect(getStatusBadgeClass("Manual Verification Required")).toContain("amber");
    });
  });

  describe("UI Component Rendering & Three Separate Result Cards", () => {
    const mockVerifiedActiveResult: FbrTaxpayerVerificationResult = {
      success: true,
      validFormat: true,
      idType: "NTN",
      rawId: "7654321-8",
      formattedId: "7654321-8",
      maskedId: "765432*-*",
      isFiler: true,
      atlStatus: "Active",
      indicators: {
        salesTaxRegType: {
          status: "Registered",
          strn: "0102030405060",
          category: "Wholesaler / Distributor",
          details: "Registered Sales Tax Entity on FBR IRIS database.",
        },
        salesTaxAtl: {
          status: "Verified Active",
          details: "Monthly sales tax returns verified compliant.",
        },
        incomeTaxAtl: {
          status: "Verified Active",
          isFiler: true,
          details: "Active Filer on ATL database under Section 236G.",
        },
      },
      verificationSource: "AUTOMATED_GATEWAY",
      fbrGatewayConfigured: true,
      verifiedOnline: true,
      verifiedAt: "2026-10-21T10:00:00.000Z",
      businessName: "PAK PHARMA DISTRIBUTORS",
      taxSection: "Section 236G",
      activeRate: "0.1%",
      nonFilerRate: "0.2%",
      message: "Taxpayer verified active.",
      officialVerification: {
        smsInstruction: 'SMS "ATL 7654321" to 9966',
        portalUrl: "https://e.fbr.gov.pk/esbn/Service.aspx?PID=TaxpayerVerification",
        irisUrl: "https://iris.fbr.gov.pk/",
        incomeTaxAtlUrl: "https://www.fbr.gov.pk/categ/active-taxpayer-list-income-tax/51147/30859/71169",
        salesTaxAtlUrl: "https://www.fbr.gov.pk/atl-sales-tax/163223",
      },
    };

    it("renders the verification interface and statutory compliance notice", () => {
      render(<TaxpayerVerificationInterface companyId={mockCompanyId} />);

      expect(screen.getByText(/FBR Taxpayer Verification Console/i)).toBeInTheDocument();
      expect(screen.getByText(/FBR Statutory Compliance Notice/i)).toBeInTheDocument();
      expect(screen.getByText(/Format validity is NOT proof of Active Filer status/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Enter 13-digit CNIC or 7-8 digit NTN/i)).toBeInTheDocument();
    });

    it("displays three separate result cards after successful taxpayer verification query", async () => {
      vi.mocked(settingsActions.verifyTaxpayerAction).mockResolvedValue({
        success: true,
        data: mockVerifiedActiveResult,
      });
      vi.mocked(settingsActions.getTaxpayerVerificationHistoryAction).mockResolvedValue({
        success: true,
        data: [],
      });

      render(<TaxpayerVerificationInterface companyId={mockCompanyId} />);

      const input = screen.getByPlaceholderText(/Enter 13-digit CNIC or 7-8 digit NTN/i);
      fireEvent.change(input, { target: { value: "7654321-8" } });
      expect(input).toHaveValue("7654321-8");

      const queryBtn = screen.getByRole("button", { name: /Query FBR Gateway/i });
      expect(queryBtn).not.toBeDisabled();
      fireEvent.click(queryBtn);

      await waitFor(() => {
        // 1. Sales Tax Reg Type Card
        expect(screen.getByRole("heading", { name: "Sales Tax Reg Type" })).toBeInTheDocument();
        expect(screen.getByText(/STRN: 0102030405060/i)).toBeInTheDocument();
        expect(screen.getByText(/Category: Wholesaler \/ Distributor/i)).toBeInTheDocument();

        // 2. Sales Tax ATL Card
        expect(screen.getByRole("heading", { name: "Sales Tax ATL" })).toBeInTheDocument();
        expect(screen.getByText(/Active Sales Tax Return Filer/i)).toBeInTheDocument();

        // 3. Income Tax ATL Card
        expect(screen.getByRole("heading", { name: "Income Tax ATL" })).toBeInTheDocument();
        expect(screen.getByText(/Active Filer \(ATL Active\)/i)).toBeInTheDocument();

        // Verification Source and Time shown
        const sources = screen.getAllByText(/Automated PRAL Gateway/i);
        expect(sources.length).toBeGreaterThanOrEqual(3);
      });
    });

    it("renders clear states: Registered, Verified Inactive, and Unable to Verify independently", async () => {
      const mockMixedResult: FbrTaxpayerVerificationResult = {
        ...mockVerifiedActiveResult,
        indicators: {
          salesTaxRegType: {
            status: "Registered",
            strn: "0102030405060",
            details: "Registered on IRIS",
          },
          salesTaxAtl: {
            status: "Verified Inactive",
            details: "Monthly sales tax return delinquent.",
          },
          incomeTaxAtl: {
            status: "Unable to Verify",
            isFiler: false,
            details: "Rate limit reached on income tax gateway.",
          },
        },
      };

      vi.mocked(settingsActions.verifyTaxpayerAction).mockResolvedValue({
        success: true,
        data: mockMixedResult,
      });
      vi.mocked(settingsActions.getTaxpayerVerificationHistoryAction).mockResolvedValue({
        success: true,
        data: [],
      });

      render(<TaxpayerVerificationInterface companyId={mockCompanyId} />);

      const input = screen.getByPlaceholderText(/Enter 13-digit CNIC or 7-8 digit NTN/i);
      fireEvent.change(input, { target: { value: "7654321-8" } });

      const queryBtn = screen.getByRole("button", { name: /Query FBR Gateway/i });
      fireEvent.click(queryBtn);

      await waitFor(() => {
        // Assert individual distinct states are present and not conflated
        expect(screen.getAllByText("Registered").length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText("Verified Inactive").length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText("Unable to Verify").length).toBeGreaterThanOrEqual(1);
      });
    });

    it("displays 'Manual Verification Required' and official portals when gateway is unconfigured", async () => {
      const mockUnconfiguredResult: FbrTaxpayerVerificationResult = {
        ...mockVerifiedActiveResult,
        fbrGatewayConfigured: false,
        verificationSource: "FORMAT_VALIDATED_ONLY",
        indicators: {
          salesTaxRegType: {
            status: "Pending",
            details: "Awaiting live registration inquiry via FBR IRIS Portal.",
          },
          salesTaxAtl: {
            status: "Pending",
            details: "Pending official inquiry via FBR Sales Tax ATL portal.",
          },
          incomeTaxAtl: {
            status: "Pending",
            isFiler: false,
            details: "Pending official inquiry via FBR Income Tax ATL portal.",
          },
        },
      };

      vi.mocked(settingsActions.verifyTaxpayerAction).mockResolvedValue({
        success: true,
        data: mockUnconfiguredResult,
      });
      vi.mocked(settingsActions.getTaxpayerVerificationHistoryAction).mockResolvedValue({
        success: true,
        data: [],
      });

      render(<TaxpayerVerificationInterface companyId={mockCompanyId} />);

      const input = screen.getByPlaceholderText(/Enter 13-digit CNIC or 7-8 digit NTN/i);
      fireEvent.change(input, { target: { value: "7654321-8" } });

      const queryBtn = screen.getByRole("button", { name: /Query FBR Gateway/i });
      fireEvent.click(queryBtn);

      await waitFor(() => {
        // Check for "Manual Verification Required" states across cards
        const badges = screen.getAllByText("Manual Verification Required");
        expect(badges.length).toBe(3);

        // Check for official links
        expect(screen.getAllByText(/FBR IRIS Portal/i).length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText(/Sales Tax ATL List/i).length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText(/Income Tax ATL Portal/i).length).toBeGreaterThanOrEqual(1);
      });
    });
  });
});
