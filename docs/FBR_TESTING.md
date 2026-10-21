# FBR Integration & Verification Testing Guide

This guide covers how to execute automated unit and regression tests, simulate sandbox FBR responses, test edge cases, and perform end-to-end manual testing in IT-HUB ERP.

---

## 1. Automated Test Suites

The ERP maintains 30 Vitest test suites (223+ tests) covering authentication, tenancy, invoices, and FBR verification.

### Running FBR Specific Tests
Run the dedicated FBR verification and API suites:
```bash
# Test Pakistani tax identifier validation (CNIC, NTN, STRN)
npm test -- tests/unit/fbr-validation.test.ts

# Test FBR OAuth token caching and expiry handling
npm test -- tests/unit/fbr-api.test.ts

# Test FBR invoice payload construction and server actions
npm test -- tests/unit/fbr-actions.test.ts
```

### Running All Regression Tests
```bash
npm test
```

---

## 2. Key Edge Cases Tested

| Test Case | Input | Expected Result | Verified In |
| :--- | :--- | :--- | :--- |
| **Valid 13-digit CNIC** | `1610154195663` | Passes validation, formats as `16101-5419566-3`, detects KP province, Male | `fbr-validation.test.ts` |
| **Hyphenated CNIC** | `16101-5419566-3` | Passes, strips hyphens cleanly | `fbr-validation.test.ts` |
| **15-digit Invalid CNIC** | `161015419561411` | Fails with explicit error: `Expected 13 digits, but received 15` | `fbr-validation.test.ts` |
| **Letters in Tax ID** | `16101-ABC9566-3` | Fails: `must contain only numeric digits` | `fbr-validation.test.ts` |
| **Valid 7-digit NTN** | `1234567` | Calculates FBR Modulo 11 check digit correctly | `fbr-validation.test.ts` |
| **Invalid NTN Length** | `12345` | Fails: `Expected 7 or 8 digits, but received 5 digits` | `fbr-validation.test.ts` |
| **Retailer Tax Section** | Customer Type = Retailer | Selects Section 236H (0.5% Filer / 1.0% Non-Filer) | `fbr-validation.test.ts` |
| **Wholesaler Tax Section** | Customer Type = WS / Distributor | Selects Section 236G (0.1% Filer / 0.2% Non-Filer) | `fbr-validation.test.ts` |
| **OAuth Token Caching** | Second call within TTL | Returns cached token without redundant network call | `fbr-api.test.ts` |
| **OAuth Expiration Buffer** | Call within 60s of expiry | Refreshes proactively before token drops | `fbr-api.test.ts` |

---

## 3. Manual Testing Procedure (UI Walkthrough)

### Test A: Invalid CNIC Rejection (Regression Test for Screenshot 2)
1. Navigate to `/crm` or `/sales`.
2. Click **Create Customer**.
3. In the **CNIC Number** field, enter `161015419561411` (15 digits).
4. Click **Verify Tax Number**.
5. **Expected Result**:
   - A **Red Error Banner** immediately appears:
     > *"Tax Identifier Format Error: Invalid CNIC length: Expected exactly 13 digits, but received 15 digits (161015419561411)."*
   - The dropdowns automatically set to `Unregistered` / `In-Active`.
   - The system **does not** claim Active FBR status.

### Test B: Valid CNIC Verification (Test for Screenshot 1)
1. In the **CNIC Number** field, enter `1610154195663` (13 digits).
2. Click **Verify Tax Number**.
3. **Expected Result**:
   - The field automatically formats to `16101-5419566-3`.
   - A **Blue Information Banner** appears confirming:
     > *"CNIC Format Validated: 16101-5419566-3 — Khyber Pakhtunkhwa, Male."*
   - Shows official verification channels:
     - `SMS: "ATL 1610154195663" to 9966`
     - Clickable link to `e.fbr.gov.pk`
   - Provides quick buttons: **"✓ Set Active (0.5%)"** and **"✕ Set Non-Filer"**.
   - Clicking either button instantly updates the `Sales Tax ATL` and `Income Tax ATL` dropdowns.

### Test C: Invoice PDF Generation with FBR Banner & QR Code
1. Navigate to `/sales`.
2. Open any existing invoice or create an invoice for a customer.
3. Click the **PDF** download icon.
4. Open the generated PDF:
   - Check the **Official FBR Digital Invoicing Banner** at the top right.
   - Verify the **FBR IRN** and **UUID**.
   - Verify the **1.0" × 1.0" QR Code** is crisp and scannable with a standard mobile QR scanner.
