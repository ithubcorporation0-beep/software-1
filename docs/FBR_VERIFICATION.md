# FBR Taxpayer & Active Taxpayer List (ATL) Verification

This document specifies the verification architecture for Pakistani tax identifiers (CNIC and NTN) and the **Active Taxpayer List (ATL)** compliance rules implemented in IT-HUB ERP.

---

## 1. Statutory Background: Filer vs Non-Filer Rates

Under the Income Tax Ordinance 2001 (as amended by Finance Acts):
- **Active Filer**: Registered on the FBR Active Taxpayers List (ATL) with up-to-date income tax returns.
- **Non-Filer**: Not found on ATL or delinquent in return submissions. Non-filers are subject to **100% higher withholding tax penalties (2× rates)**.

### Statutory Rates Applicable in ERP:
| Customer Category | Governing Section | Active Filer Rate | Non-Filer Rate |
| :--- | :---: | :---: | :---: |
| **Retailer** | Section 236H | **0.5%** | **1.0%** |
| **Wholesaler / Distributor** | Section 236G | **0.1%** | **0.2%** |

---

## 2. Tax Identifier Format Specifications

The ERP strictly enforces NADRA and FBR syntax standards in [`src/lib/fbr-validation.ts`](file:///e:/new%20data/erp%20software/src/lib/fbr-validation.ts):

### A. Pakistani CNIC (Individuals & Sole Proprietors)
- **Length**: Exactly **13 numeric digits**.
- **Format**: `XXXXX-XXXXXXX-X` or `XXXXXXXXXXXXX`.
- **Structural Analysis**:
  - **Digit 1 (Province Code)**:
    - `1` = Khyber Pakhtunkhwa
    - `2` = FATA / Merged Districts
    - `3` = Punjab
    - `4` = Sindh
    - `5` = Balochistan
    - `6` = Islamabad Capital Territory
    - `7` = Gilgit-Baltistan / AJK
  - **Digits 1–5**: Administrative division and district code.
  - **Digits 6–12**: Family tree sequence number.
  - **Digit 13 (Gender Check)**:
    - Odd (`1, 3, 5, 7, 9`) = Male
    - Even (`2, 4, 6, 8`) = Female
- **Rejection Criteria**: Any string with characters, spaces, or length $\ne 13$ (e.g. 15-digit numbers like `161015419561411`) is **immediately rejected with a red alert**.

### B. FBR NTN (Corporate & Partnership Entities)
- **Length**: **7 or 8 numeric digits**.
- **Format**: `XXXXXXX-X` or `XXXXXXX`.
- **Modulo 11 Checksum Algorithm**:
  - Base: 7 digits ($d_1 d_2 d_3 d_4 d_5 d_6 d_7$)
  - Weights: $[8, 7, 6, 5, 4, 3, 2]$
  - $\text{Sum} = \sum_{i=1}^{7} (d_i \times w_i)$
  - $\text{Remainder} = \text{Sum} \pmod{11}$
  - $\text{Check Digit} = (11 - \text{Remainder}) \pmod{11}$

---

## 3. Verification Architecture & Request Flow

Taxpayer verification is managed server-side via [`/api/fbr/verify-taxpayer`](file:///e:/new%20data/erp%20software/src/app/api/fbr/verify-taxpayer/route.ts):

```mermaid
flowchart TD
    A[User Enters Tax Number in Modal] --> B[Format Validation Engine]
    B -->|Invalid Length or Chars| C[Immediate Format Error - Red Banner]
    B -->|Valid 13-digit CNIC or 7-8 digit NTN| D{FBR Gateway Configured in .env?}
    D -->|Yes| E[Call FBR OAuth Token Service]
    E --> F[Query Live FBR ATL Web Service]
    F -->|Active Filer| G[Active Filer Verified - Emerald Banner]
    F -->|Non-Filer| H[Non-Filer Warning - Amber Banner]
    D -->|No Live Credentials| I[Check Local ERP Customer Records]
    I -->|Existing Verified Record| J[Verified from ERP Cache]
    I -->|No Local Record| K[Format Confirmed + Official Verification Guide]
    K --> L[SMS 9966 & e.fbr.gov.pk Links]
    K --> M[One-Click Active / Non-Filer Assignment Buttons]
```

---

## 4. The Three FBR Verification Indicators (UNAZ Design)

In strict accordance with Pakistan tax law and matching the UNAZ specification, taxpayer verification tracks **three distinct statutory dimensions**:

1. **Sales Tax Reg Type**
   - **Statuses**: `Registered`, `Unregistered`, `Exempt`, `Zero Rated`, `Wholesaler / Retailer`, `Pending`, `Unable to Verify`
   - **Significance**: Indicates whether the entity is registered for Federal Sales Tax under the Sales Tax Act, 1990, holds an active STRN, or is exempt.

2. **Sales Tax ATL**
   - **Statuses**: `Verified Active`, `Verified Inactive`, `Exempt`, `Pending`, `Unable to Verify`
   - **Significance**: Confirms whether the entity has filed current sales tax returns (Annexure C/I) and is in good standing on the Sales Tax Active Taxpayer List.
   - **Official Info**: [FBR Sales Tax ATL Information](https://www.fbr.gov.pk/atl-sales-tax/163223)

3. **Income Tax ATL**
   - **Statuses**: `Verified Active`, `Verified Inactive`, `Pending`, `Unable to Verify`
   - **Significance**: Determines withholding tax liability under Sections 236H (Retailer: 0.5% vs 1.0%) and 236G (Wholesaler: 0.1% vs 0.2%).
   - **Official Info**: [FBR Income Tax ATL Information](https://www.fbr.gov.pk/categ/active-taxpayer-list-income-tax/51147/30859/71169)

---

## 5. Official Verification Portals & Methods

Because FBR does not offer an open, unauthenticated public REST API without licensed PRAL credentials, the ERP provides direct access to official verification methods:

### 1. Official FBR Verification Portals
- **IRIS 2.0 Registration & Verification Portal**:
  [https://iris.fbr.gov.pk/](https://iris.fbr.gov.pk/)
- **FBR Income Tax ATL Directory**:
  [https://www.fbr.gov.pk/categ/active-taxpayer-list-income-tax/51147/30859/71169](https://www.fbr.gov.pk/categ/active-taxpayer-list-income-tax/51147/30859/71169)
- **FBR Sales Tax ATL Directory**:
  [https://www.fbr.gov.pk/atl-sales-tax/163223](https://www.fbr.gov.pk/atl-sales-tax/163223)
- **e-FBR Online Verification**:
  [https://e.fbr.gov.pk/](https://e.fbr.gov.pk/)

### 2. Official FBR SMS Service (Instant Verification)
- **Income Tax ATL (CNIC)**:
  ```
  Send SMS: ATL <13-digit-CNIC> to 9966
  Example: ATL 1610154195663
  ```
- **Income Tax ATL (NTN)**:
  ```
  Send SMS: ATL <7-digit-NTN> to 9966
  Example: ATL 1234567
  ```
- **Sales Tax Status (STRN/NTN)**:
  ```
  Send SMS: ST <STRN/NTN> to 9966
  Example: ST 1234567
  ```
- The FBR cellular gateway replies within 10–30 seconds with the active filer status and taxpayer name.

---

## 6. UI States in Customer Registration Modal & Verification Console

| Scenario | UI Indicator | Action Required |
| :--- | :--- | :--- |
| **Invalid Format** (e.g. `161015419561411`) | 🔴 **Red Banner**: Error explaining 15 digits entered instead of 13. Indicators marked `Unable to Verify`. | Correct the CNIC/NTN number |
| **Live FBR Verified Active** | 🟢 **Emerald Banner**: Official FBR record confirmed. All 3 indicators marked `Registered` / `Active`. | Auto-sets dropdowns (0.5% rate) |
| **Live FBR Non-Filer** | 🟡 **Amber Banner**: Taxpayer listed as Inactive. Indicators marked `Inactive`. | Auto-sets dropdowns (1.0% penalty) |
| **Valid Format (Pending Gateway)** | 🔵 **Blue Banner**: Format confirmed, 3 indicators marked `Pending`. Direct links to IRIS, Income Tax ATL, and Sales Tax ATL provided. | User clicks **"✓ Set Active"** or **"✕ Set Non-Filer"** |
