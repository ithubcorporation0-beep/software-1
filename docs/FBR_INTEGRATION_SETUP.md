# FBR Digital Invoicing & Integration Setup Guide

This guide explains how to connect IT-HUB ERP to the **Federal Board of Revenue (FBR)** of Pakistan for official electronic tax invoicing and Active Taxpayer List (ATL) verification via **PRAL (Pakistan Revenue Automation Limited)**.

---

## 1. Overview of FBR Digital Invoicing in Pakistan

Under Sales Tax Act 1990 and SRO 1525(I)/2023, registered businesses in Pakistan must integrate with the FBR Digital Invoicing System (v1.12) to:
1. Validate fiscal tax invoices in real time.
2. Obtain an **Official FBR Invoice Reference Number (IRN)** and **Fiscal UUID**.
3. Render a standardized **25×25 module QR code** (1.0″ × 1.0″) on every tax invoice.
4. Verify buyer tax status on the **Active Taxpayer List (ATL)** to apply statutory withholding tax under **Section 236G** (Wholesalers) or **Section 236H** (Retailers).

---

## 2. Provider Onboarding Process (PRAL & FBR IRIS)

### Step 1: Corporate Taxpayer Registration on IRIS
- Your business must be actively registered for Sales Tax and Income Tax on the [FBR IRIS Portal](https://iris.fbr.gov.pk/).
- Confirm your **7-digit NTN** and **13-digit STRN (Sales Tax Registration Number)** are active.

### Step 2: Digital Invoicing Sandbox Access Request
1. Submit an application through your IRIS portal or coordinate with your designated PRAL representative.
2. Request API credentials for the **FBR Digital Invoicing Sandbox / Staging Environment**.
3. You will receive:
   - **`FBR_CLIENT_ID`**: OAuth 2.0 Client Identifier.
   - **`FBR_CLIENT_SECRET`**: OAuth 2.0 Client Secret (keep confidential).
   - **Sandbox API Base URL**: Typically `https://sandbox-api.fbr.gov.pk/` or PRAL staging URL.
   - **Seller NTN**: Your registered company NTN.

### Step 3: Sandbox Testing & Certification
- Test invoice payload construction, HS code classification, and IRN retrieval.
- Generate sample PDF invoices bearing the certified FBR QR code.
- Submit the test invoice batch to PRAL for clearance certification.

### Step 4: Production Credentials Issuance
- Upon certification, PRAL issues your production OAuth credentials and white-lists your production server IP addresses (or Vercel outgoing IP addresses via proxies if required).

---

## 3. Required Environment Variables

All FBR variables are **server-side only**. They must **never** be prefixed with `NEXT_PUBLIC_` to prevent leaking private credentials to the browser.

| Variable Name | Environment | Required | Description |
| :--- | :--- | :---: | :--- |
| `FBR_CLIENT_ID` | Dev / Staging / Prod | Yes | OAuth 2.0 Client ID issued by PRAL |
| `FBR_CLIENT_SECRET` | Dev / Staging / Prod | Yes | OAuth 2.0 Client Secret |
| `FBR_TOKEN_URL` | Dev / Staging / Prod | Yes | Token endpoint (`https://api.fbr.gov.pk/oauth2/token`) |
| `FBR_VALIDATE_URL` | Dev / Staging / Prod | Yes | Pre-submission validation endpoint |
| `FBR_SUBMIT_URL` | Dev / Staging / Prod | Yes | Real-time invoice clearance endpoint |
| `FBR_SELLER_NTN` | Dev / Staging / Prod | Yes | Your company's 7-digit NTN (e.g. `1234567-8`) |
| `FBR_ATL_INQUIRY_URL` | Dev / Staging / Prod | Optional | Live ATL lookup endpoint (when granted by PRAL) |

---

## 4. Local Development Setup

1. Copy `.env.example` to `.env.local` if you haven't already:
   ```bash
   cp .env.example .env.local
   ```
2. Configure your test/sandbox credentials:
   ```env
   FBR_CLIENT_ID="your_pral_sandbox_client_id"
   FBR_CLIENT_SECRET="your_pral_sandbox_client_secret"
   FBR_TOKEN_URL="https://sandbox-api.fbr.gov.pk/oauth2/token"
   FBR_VALIDATE_URL="https://sandbox-api.fbr.gov.pk/invoices/validate"
   FBR_SUBMIT_URL="https://sandbox-api.fbr.gov.pk/invoices/submit"
   FBR_SELLER_NTN="1234567-8"
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

---

## 5. Vercel Production Deployment

1. Navigate to your project on the [Vercel Dashboard](https://vercel.com).
2. Go to **Settings** > **Environment Variables**.
3. Add the exact variable names listed in Section 3 for the **Production** and **Preview** environments.
4. Trigger a redeploy:
   - Either push a commit to `main`, or
   - Go to **Deployments** > Click **•••** on latest deployment > **Redeploy**.

---

## 6. Current Implementation Status & Remaining Blockers

### What Is Already Complete in the ERP:
- Full database schema with `fbr_*` columns, indexes, and document sequences.
- Strict NADRA CNIC format validation (13 digits, province, gender check).
- FBR NTN Modulo 11 checksum calculation.
- Automated token caching (`src/lib/fbr-api.ts`) with expiry management.
- FBR DI v1.12 payload construction (`src/lib/fbr-service.ts`).
- Server-side PDF generation with official emerald green banner and 1.0" × 1.0" QR code.

### Remaining Blockers Before Live Fiscal Submissions:
1. **Live PRAL Credentials**: Currently waiting for official FBR/PRAL client registration and sandbox credentials.
2. **Seller Registered NTN**: Your organization's NTN must be configured in `FBR_SELLER_NTN`.
3. **Public IP Whitelisting**: If PRAL enforces IP whitelisting for your account, an egress proxy (or fixed IP route) must be configured between Vercel serverless functions and PRAL servers.
