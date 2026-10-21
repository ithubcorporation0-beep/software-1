import { describe, it, expect } from "vitest";
import { validateCnic, validateNtn, validateTaxId, calculateNtnCheckDigit } from "@/lib/fbr-validation";
import { verifyFbrTaxpayer } from "@/lib/fbr-taxpayer-service";

describe("Pakistani Tax Identifier & FBR Validation Suite", () => {
  describe("CNIC Validation (NADRA 13-digit standard)", () => {
    it("validates and formats a valid 13-digit CNIC (1610154195663)", () => {
      const result = validateCnic("1610154195663");
      expect(result.isValid).toBe(true);
      expect(result.type).toBe("CNIC");
      expect(result.formatted).toBe("16101-5419566-3");
      expect(result.province).toBe("Khyber Pakhtunkhwa");
      expect(result.gender).toBe("Male");
      expect(result.errorMessage).toBeUndefined();
    });

    it("accepts already hyphenated valid CNIC (16101-5419566-3)", () => {
      const result = validateCnic("16101-5419566-3");
      expect(result.isValid).toBe(true);
      expect(result.cleaned).toBe("1610154195663");
      expect(result.formatted).toBe("16101-5419566-3");
    });

    it("rejects an invalid 15-digit number (161015419561411) with descriptive error", () => {
      const result = validateCnic("161015419561411");
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain("Expected exactly 13 digits, but received 15 digits");
    });

    it("rejects non-numeric characters", () => {
      const result = validateCnic("16101-ABC9566-3");
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain("must contain only numeric digits");
    });
  });

  describe("NTN Validation (FBR Modulo 11 check)", () => {
    it("computes check digit for 7-digit base", () => {
      const check = calculateNtnCheckDigit("1234567");
      expect(typeof check).toBe("number");
    });

    it("rejects non 7-or-8 digit NTNs", () => {
      const result = validateNtn("12345");
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain("Expected 7 or 8 digits");
    });
  });

  describe("Universal Tax ID Classifier (validateTaxId)", () => {
    it("classifies 13 digits as CNIC", () => {
      const res = validateTaxId("1610154195663");
      expect(res.type).toBe("CNIC");
      expect(res.isValid).toBe(true);
    });

    it("rejects random 15-digit string as invalid", () => {
      const res = validateTaxId("161015419561411");
      expect(res.isValid).toBe(false);
      expect(res.errorMessage).toContain("Invalid Tax ID format: Entered 15 digits");
    });
  });

  describe("FBR Taxpayer Service (verifyFbrTaxpayer)", () => {
    it("returns immediate error on invalid 15-digit input without false active claims", async () => {
      const res = await verifyFbrTaxpayer("161015419561411", "Retailer");
      expect(res.success).toBe(false);
      expect(res.validFormat).toBe(false);
      expect(res.atlStatus).toBe("Unregistered");
      expect(res.message).toContain("15 digits");
    });

    it("identifies valid format and provides official SMS/Portal fallback when gateway unconfigured", async () => {
      const res = await verifyFbrTaxpayer("1610154195663", "Retailer");
      expect(res.validFormat).toBe(true);
      expect(res.idType).toBe("CNIC");
      expect(res.formattedId).toBe("16101-5419566-3");
      expect(res.officialVerification.smsInstruction).toContain("9966");
      expect(res.taxSection).toBe("Section 236H");
      expect(res.activeRate).toContain("0.5%");
    });
  });
});
