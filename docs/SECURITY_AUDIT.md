# 🛡️ IT-HUB ERP — Comprehensive Application Security Audit & Risk Assessment

**Date:** October 15, 2026  
**Auditor:** Application Security Engineering  
**Scope:** Multi-Tenant Enterprise Resource Planning (Next.js 16 App Router, TypeScript, Supabase PostgreSQL, Vercel)  
**Standard:** OWASP Top 10 (2021/2026), Multi-Tenant SaaS Isolation Guidelines, PRD Security Standards

---

## Executive Summary

This security audit conducted an in-depth, code-level analysis of the **IT-HUB ERP** multi-tenant platform across 11 critical security domains:
1. Tenant Isolation & IDOR
2. Authentication & Session Management
3. Authorization & Privilege Escalation
4. Input & Output Handling (XSS, Formula Injection, Open Redirects)
5. File Storage & MIME Validation
6. Secrets, Cryptography & Security Headers
7. Abuse Prevention & Rate Limiting
8. Business Logic & Separation of Duties
9. Audit Logging & Anomaly Detection
10. Dependencies & Supply Chain Integrity
11. Database Row-Level Security (RLS)

### Severity Breakdown
| Severity | Count | Status |
| :--- | :---: | :---: |
| 🔴 **Critical** | 3 | Open (Remediation in Phase 2) |
| 🟠 **High** | 12 | Open (Remediation in Phase 2) |
| 🟡 **Medium** | 6 | Open (Remediation in Phase 2) |
| 🟢 **Low** | 2 | Open (Remediation in Phase 2) |
| **Total Findings** | **23** | **Scheduled for Immediate Fix** |

---

## Detailed Audit Findings by Security Domain

---

### Domain 1: Tenant Isolation & Multi-Tenancy

#### Finding 1.1: Uninvited Registration Automatically Grants Membership in Primary Tenant
- **Severity:** 🔴 **Critical**
- **File Path:** [`src/app/(auth)/register/actions.ts`](file:///e:/new%20data/erp%20software/src/app/(auth)/register/actions.ts#L105-L120)
- **Plain English Explanation:** When any random person on the internet registers an account without filling in a company name, the server silently assigns them an active `Employee` membership inside your default company (`00000000-0000-0000-0000-000000000001`).
- **How an Attacker Could Abuse It:** An external stranger can go to `/register`, enter their own email and password, leave the company name blank, and immediately log in with verified access to view internal company staff directories, inventory catalogs, projects, and sales data.
- **The Exact Fix:** Remove the auto-assignment fallback. When registering without an invitation or verified organization, the user must be placed in a non-member pending onboarding state or required to provision their own dedicated organization subject to Super Admin approval.

#### Finding 1.2: Hardcoded Default Company ID & Swallowed Access Checks in Detail Pages
- **Severity:** 🟠 **High**
- **File Paths:**
  - [`src/app/(erp)/sales/invoices/[id]/page.tsx`](file:///e:/new%20data/erp%20software/src/app/(erp)/sales/invoices/[id]/page.tsx#L19-L25)
  - [`src/app/(erp)/crm/customers/[id]/page.tsx`](file:///e:/new%20data/erp%20software/src/app/(erp)/crm/customers/[id]/page.tsx#L17-L23)
- **Plain English Explanation:** The invoice detail and customer detail pages hardcode `companyId = "00000000-0000-0000-0000-000000000001"` and catch permission errors without stopping page execution (`catch { // Falls closed }`). 
- **How an Attacker Could Abuse It:** 
  1. Legitimate users in Company B cannot view their own invoices or customers because the server checks against Company A.
  2. If an authenticated user from Company B visits a Company A URL, the caught error does not abort early, leaking execution state or confusing tenant boundary checks.
- **The Exact Fix:** Dynamically resolve the active tenant from the authenticated user's verified session (`await getCurrentUser()`, `getUserMemberships()`). Stop request execution immediately with `redirect("/login")` or `notFound()` if tenant membership is invalid.

#### Finding 1.3: Unscoped Fallback in Global Search API
- **Severity:** 🟠 **High**
- **File Path:** [`src/app/api/search/route.ts`](file:///e:/new%20data/erp%20software/src/app/api/search/route.ts#L26-L30)
- **Plain English Explanation:** The global search route defaults `companyId` to `DEFAULT_COMPANY_ID` if the client does not specify it in the URL query parameters.
- **How an Attacker Could Abuse It:** If a user belongs to multiple organizations or is solely a member of a non-default organization, search either crashes with a 403 Forbidden or evaluates against the wrong tenant context.
- **The Exact Fix:** Require explicit, session-verified `companyId` resolved from the user's active company membership, never falling back to a hardcoded tenant ID.

#### Finding 1.4: Missing Customer-Portal Self-Isolation Guard
- **Severity:** 🟠 **High**
- **File Paths:**
  - [`src/lib/sales/server.ts`](file:///e:/new%20data/erp%20software/src/lib/sales/server.ts#L1072-L1087)
  - [`src/lib/crm/server.ts`](file:///e:/new%20data/erp%20software/src/lib/crm/server.ts#L128-L139)
- **Plain English Explanation:** According to the Permissions Specification, users with the `customer` role must only ever see their own orders, quotes, and profile ("Self Only"). The query functions `getInvoices` and `getCustomers` do not enforce `customer_id == caller.customer_id` when called by a customer portal account.
- **How an Attacker Could Abuse It:** A client logging into the customer portal could view other companies' or customers' sales invoices and quotes.
- **The Exact Fix:** Enforce a server-side check in `getInvoices` and `getCustomers`: if the authenticated user's role is `customer`, automatically inject a mandatory filter restricting data to their linked `customer_id`.

---

### Domain 2: Authentication & Sessions

#### Finding 2.1: Hardcoded Super Admin Backdoor Passwords in Source Code
- **Severity:** 🔴 **Critical**
- **File Path:** [`src/lib/auth/admin-session.ts`](file:///e:/new%20data/erp%20software/src/lib/auth/admin-session.ts#L5-L27)
- **Plain English Explanation:** The source code contains hardcoded default passwords `["Admin@123", "admin123"]`. In `isValidAdminPassword()`, anyone typing either of these passwords is automatically recognized as an administrator.
- **How an Attacker Could Abuse It:** Anyone visiting `/login` or sending a POST to `/api/auth/login` with any email address and the password `"admin123"` or `"Admin@123"` is immediately granted full Super Admin access to every tenant's data.
- **The Exact Fix:** Completely remove `DEFAULT_ADMIN_PASSWORDS`. Require `ADMIN_PASSWORD` in `.env.local` to be cryptographically hashed or set as a high-entropy secret, and disable the bypass in production environments.

#### Finding 2.2: Hardcoded Fallback Secret Key for Administrative Cookie Signing
- **Severity:** 🔴 **Critical**
- **File Path:** [`src/lib/auth/admin-session.ts`](file:///e:/new%20data/erp%20software/src/lib/auth/admin-session.ts#L9-L15)
- **Plain English Explanation:** If the environment variable `ADMIN_SESSION_SECRET` is unset, the application falls back to a hardcoded string: `"it-hub-erp-secure-secret-key-2026-pkr-admin"`.
- **How an Attacker Could Abuse It:** An attacker reading the source code can forge a HMAC-SHA256 session cookie (`erp_admin_session`) and grant themselves permanent Super Administrator access without even touching the login page.
- **The Exact Fix:** Remove the hardcoded string fallback. If `ADMIN_SESSION_SECRET` is missing in production, fail closed by throwing a configuration error immediately on startup.

#### Finding 2.3: Non-Constant-Time Signature Comparison (Timing Attack)
- **Severity:** 🟠 **High**
- **File Path:** [`src/lib/auth/admin-session.ts`](file:///e:/new%20data/erp%20software/src/lib/auth/admin-session.ts#L55-L60)
- **Plain English Explanation:** The admin cookie verification checks signatures using `signature !== expectedSignature`. Standard string inequality stops at the first mismatching byte, revealing how many characters of a forged signature were correct based on tiny time differences (measured in microseconds).
- **How an Attacker Could Abuse It:** An attacker can send thousands of forged cookie signatures and measure server response times to guess the valid signature byte by byte.
- **The Exact Fix:** Replace standard string comparison with Node.js built-in `crypto.timingSafeEqual()`.

#### Finding 2.4: Email Verification Bypassed on User Registration
- **Severity:** 🟠 **High**
- **File Path:** [`src/app/(auth)/register/actions.ts`](file:///e:/new%20data/erp%20software/src/app/(auth)/register/actions.ts#L35)
- **Plain English Explanation:** When a user registers, the code instructs the database: `email_confirm: true`. This immediately marks the email as verified without sending a confirmation email.
- **How an Attacker Could Abuse It:** An attacker can register using someone else's email (e.g. `cfo@company.com`) and lock out the real owner or impersonate them before the victim can register.
- **The Exact Fix:** Do not auto-confirm emails for public self-registration. Require email verification link confirmation before activating tenant privileges.

#### Finding 2.5: Weak Password Length and Missing Complexity Policy
- **Severity:** 🟠 **High**
- **File Path:** [`src/app/(auth)/register/actions.ts`](file:///e:/new%20data/erp%20software/src/app/(auth)/register/actions.ts#L25-L27)
- **Plain English Explanation:** The only password check is `if (password.length < 6)`. Six characters can be cracked in seconds using standard password-cracking software.
- **How an Attacker Could Abuse It:** Attackers can register or brute-force accounts with trivial passwords like `123456` or `secret`.
- **The Exact Fix:** Enforce a minimum length of 10 characters with at least one uppercase letter, one lowercase letter, one number, and one symbol.

#### Finding 2.6: Missing Brute-Force Lockout on Authentication Endpoints
- **Severity:** 🟠 **High**
- **File Paths:**
  - [`src/app/api/auth/login/route.ts`](file:///e:/new%20data/erp%20software/src/app/api/auth/login/route.ts)
  - [`src/app/(auth)/login/actions.ts`](file:///e:/new%20data/erp%20software/src/app/(auth)/login/actions.ts)
  - [`src/app/(auth)/forgot-password/actions.ts`](file:///e:/new%20data/erp%20software/src/app/(auth)/forgot-password/actions.ts)
- **Plain English Explanation:** There is no counter to track how many times a user or IP address fails to log in. An attacker can make millions of login attempts without being blocked.
- **How an Attacker Could Abuse It:** Automated dictionary attacks and credential-stuffing tools can run continuously against the login endpoints until valid credentials are discovered.
- **The Exact Fix:** Implement an in-memory or Redis-backed rate limiter that temporarily locks an account or IP address for 15 minutes after 5 consecutive failed attempts.

---

### Domain 3: Authorization & Privilege Escalation

#### Finding 3.1: Global Edge Proxy Completely Bypasses Authentication on `/api/*` Routes
- **Severity:** 🟠 **High**
- **File Path:** [`src/proxy.ts`](file:///e:/new%20data/erp%20software/src/proxy.ts#L26-L34)
- **Plain English Explanation:** The proxy middleware checks `pathname.startsWith("/api")` and considers all API routes public, letting them pass without verifying authentication cookies.
- **How an Attacker Could Abuse It:** If a developer creates any new route handler under `/api/` and forgets to manually call `requireUser()`, that route will be completely open to unauthenticated attackers.
- **The Exact Fix:** Explicitly whitelist only public API routes (`/api/auth/login`, `/api/auth/logout`, `/api/health`). Require authenticated sessions by default on all other API routes.

#### Finding 3.2: Horizontal & Vertical Privilege Escalation in User Role Management
- **Severity:** 🟠 **High**
- **File Path:** [`src/lib/users/server.ts`](file:///e:/new%20data/erp%20software/src/lib/users/server.ts#L299-L303)
- **Plain English Explanation:** In `updateMemberRole()`, the server only blocks assigning the `super_admin` role. If a non-admin user has `users:edit` permission (e.g. an HR Manager or Custom Role), they can promote any user (including themselves) to full company `Admin`.
- **How an Attacker Could Abuse It:** A compromised staff account with user editing rights can escalate their own account to `Admin` and take over the company.
- **The Exact Fix:** Prohibit users from editing their own role. Prevent any non-Admin from assigning the `Admin` role. Require that the assigning user's role rank is strictly higher than the role being granted.

#### Finding 3.3: Multi-Factor Authentication (MFA) Not Required for High-Privilege Roles
- **Severity:** 🟡 **Medium**
- **File Path:** [`src/lib/auth/server.ts`](file:///e:/new%20data/erp%20software/src/lib/auth/server.ts)
- **Plain English Explanation:** Administrative accounts (`super_admin`, `admin`, `accountant`) can log in with a single password factor.
- **How an Attacker Could Abuse It:** If an administrator's password is leaked or phished, the attacker immediately gains total access with no second layer of defense.
- **The Exact Fix:** Add TOTP / MFA verification flags for Admin and Accountant accounts, requiring second-factor verification on sensitive operations.

---

### Domain 4: Input & Output Security (XSS, Formula Injection, Open Redirects)

#### Finding 4.1: CSV & Spreadsheet Formula Injection (CWE-1236) in All Export Engines
- **Severity:** 🟠 **High**
- **File Paths:**
  - [`src/lib/reports/server.ts`](file:///e:/new%20data/erp%20software/src/lib/reports/server.ts#L252-L264)
  - [`src/lib/payroll/server.ts`](file:///e:/new%20data/erp%20software/src/lib/payroll/server.ts#L1272-L1305)
  - [`src/lib/finance/server.ts`](file:///e:/new%20data/erp%20software/src/lib/finance/server.ts#L1911-L1945)
  - [`src/lib/hr/server.ts`](file:///e:/new%20data/erp%20software/src/lib/hr/server.ts#L1107-L1126)
- **Plain English Explanation:** When generating CSV exports for sales, finance, payroll, or attendance, text fields are placed directly into CSV cells without checking for spreadsheet formula characters (`=`, `+`, `-`, `@`, `\t`, `\r`).
- **How an Attacker Could Abuse It:** An attacker sets a customer name, employee title, or invoice note to `=cmd|'/C calc'!A0` or `=SUM(A1:A100)`. When a manager or accountant opens the exported CSV file in Microsoft Excel or Google Sheets, the spreadsheet software automatically executes the command on their computer or sends private data to an attacker's server.
- **The Exact Fix:** Create a central CSV escaping utility that checks if the first character of any cell is `=`, `+`, `-`, `@`, `\t`, or `\r`. If so, prepend a single quote (`'`) to force the spreadsheet application to treat it as inert plain text.

#### Finding 4.2: Open Redirect Vulnerability on Login
- **Severity:** 🟠 **High**
- **File Path:** [`src/app/(auth)/login/actions.ts`](file:///e:/new%20data/erp%20software/src/app/(auth)/login/actions.ts#L21-L55)
- **Plain English Explanation:** The login action reads `redirectTo` directly from the user's form submission and blindly redirects the browser to that URL: `redirect(redirectTo)`.
- **How an Attacker Could Abuse It:** An attacker crafts a phishing link: `https://your-erp.com/login?redirectTo=https://evil-phishing-site.com`. The user logs into the real ERP, but is immediately redirected to the fake site to steal session tokens or install malware.
- **The Exact Fix:** Validate that `redirectTo` is a relative URL (starts with a single `/` and does NOT start with `//` or contain a protocol like `http://` or `https://`).

#### Finding 4.3: Unbounded Numeric Inputs in Transactions
- **Severity:** 🟡 **Medium**
- **File Paths:**
  - [`src/lib/sales/server.ts`](file:///e:/new%20data/erp%20software/src/lib/sales/server.ts#L240)
  - [`src/lib/crm/server.ts`](file:///e:/new%20data/erp%20software/src/lib/crm/server.ts#L60)
- **Plain English Explanation:** Several financial input schemas accept any positive number without an upper maximum limit (`z.coerce.number().positive()`).
- **How an Attacker Could Abuse It:** Entering `1e30` or enormous numbers can cause database integer/decimal overflows, JavaScript floating-point errors (`NaN`), or break report calculations.
- **The Exact Fix:** Constrain all monetary amount inputs with a strict upper limit (e.g. `z.number().min(0.01).max(999_999_999.99)`).

---

### Domain 5: File Storage & Receipt Upload Security

#### Finding 5.1: File Size, MIME Type, and Protocol Bypass in Receipt Uploads
- **Severity:** 🟠 **High**
- **File Path:** [`src/lib/finance/server.ts`](file:///e:/new%20data/erp%20software/src/lib/finance/server.ts#L73-L98)
- **Plain English Explanation:** In `validateReceiptMetadata()`, size and MIME type checks are only performed if the client provides those fields. If an attacker submits a receipt without specifying `size` or `mimeType`, validation passes. Furthermore, `receiptUrl` is not validated for dangerous protocols like `javascript:`.
- **How an Attacker Could Abuse It:** An attacker can submit an executable (`.exe` or `.sh`) or a `javascript:alert(1)` link as a receipt, causing Stored Cross-Site Scripting (XSS) when an accountant clicks "View Receipt".
- **The Exact Fix:** Require `size` and `mimeType` to be mandatory fields. Validate that `receiptUrl` starts with `https://` and points only to trusted storage domains.

---

### Domain 6: Secrets, Configuration & Cryptography

#### Finding 6.1: Missing Content Security Policy (CSP) Headers
- **Severity:** 🟠 **High**
- **File Path:** [`next.config.mjs`](file:///e:/new%20data/erp%20software/next.config.mjs#L21-L53)
- **Plain English Explanation:** While HSTS and X-Frame-Options are configured, `Content-Security-Policy` (CSP) is completely missing from the HTTP security headers.
- **How an Attacker Could Abuse It:** If any cross-site scripting vulnerability exists, the browser will execute inline scripts and send data to third-party domains without restriction.
- **The Exact Fix:** Add a strict Content-Security-Policy header in `next.config.mjs` restricting script, object, frame, and connect sources.

#### Finding 6.2: Missing Production Environment Secret Validator
- **Severity:** 🟡 **Medium**
- **File Path:** [`src/lib/supabase/admin.ts`](file:///e:/new%20data/erp%20software/src/lib/supabase/admin.ts#L16-L20)
- **Plain English Explanation:** There is no startup validation schema that asserts all production secrets exist, are high entropy, and are not placeholders.
- **How an Attacker Could Abuse It:** The application can run in production with default secrets or placeholder API keys, leaving administrative APIs wide open.
- **The Exact Fix:** Create a boot-time environment schema validator with Zod that halts server start if any required secret is missing or insecure.

---

### Domain 7: Abuse Prevention & Rate Limiting

#### Finding 7.1: Zero Rate Limiting Across All Application Endpoints
- **Severity:** 🟠 **High**
- **File Paths:**
  - Login: [`src/app/api/auth/login/route.ts`](file:///e:/new%20data/erp%20software/src/app/api/auth/login/route.ts)
  - Register: [`src/app/(auth)/register/actions.ts`](file:///e:/new%20data/erp%20software/src/app/(auth)/register/actions.ts)
  - Password Reset: [`src/app/(auth)/forgot-password/actions.ts`](file:///e:/new%20data/erp%20software/src/app/(auth)/forgot-password/actions.ts)
  - Search: [`src/app/api/search/route.ts`](file:///e:/new%20data/erp%20software/src/app/api/search/route.ts)
- **Plain English Explanation:** No rate limits exist in the codebase. A single user or script can send thousands of requests per second without being throttled.
- **How an Attacker Could Abuse It:** Denial of service (DoS), server resource exhaustion, automated database enumeration, and email spamming via password reset forms.
- **The Exact Fix:** Deploy a central sliding-window rate limiting utility that limits requests by IP and action type.

---

### Domain 8: Business Logic & Separation of Duties

#### Finding 8.1: Lack of Self-Approval Prevention in Leave Requests
- **Severity:** 🟠 **High**
- **File Path:** [`src/lib/hr/server.ts`](file:///e:/new%20data/erp%20software/src/lib/hr/server.ts#L990-L1028)
- **Plain English Explanation:** In `reviewLeaveRequest()`, there is no check preventing an approver from approving their own leave request. While expenses prevent self-approval, leave requests omit this safeguard.
- **How an Attacker Could Abuse It:** An HR Manager or team leader can submit unlimited PTO or leave and immediately approve it themselves without managerial oversight.
- **The Exact Fix:** Enforce separation of duties: if `leave.employee_id` corresponds to the reviewing user, throw a `SeparationOfDutiesError`.

#### Finding 8.2: Sensitive Payroll Bank Details and CNIC Unmasked
- **Severity:** 🟠 **High**
- **File Paths:**
  - [`src/lib/payroll/server.ts`](file:///e:/new%20data/erp%20software/src/lib/payroll/server.ts#L549-L570)
  - [`src/lib/hr/server.ts`](file:///e:/new%20data/erp%20software/src/lib/hr/server.ts#L48-L63)
- **Plain English Explanation:** When fetching payroll runs via `getPayrollRunById()`, all employees' bank accounts and titles are returned in full without requiring the specific `employees:view_sensitive` permission.
- **How an Attacker Could Abuse It:** Anyone with standard view access to payroll can inspect the bank account numbers, titles, and national IDs of all corporate staff.
- **The Exact Fix:** Require `employees:view_sensitive` to view full bank details; otherwise, mask account numbers (e.g. `••••••••1234`).

#### Finding 8.3: Inventory Stock-Out Race Condition under Concurrent Requests
- **Severity:** 🟡 **Medium**
- **File Path:** [`src/lib/inventory/server.ts`](file:///e:/new%20data/erp%20software/src/lib/inventory/server.ts#L542-L565)
- **Plain English Explanation:** Stock checks and deductions occur in two non-atomic steps ("check-then-act"). If two orders arrive at the exact same millisecond for the last remaining item, both requests pass the check before either decrements the inventory.
- **How an Attacker Could Abuse It:** An attacker can fire simultaneous checkout requests and purchase more stock than physically exists in the warehouse, causing negative inventory and fulfillment failure.
- **The Exact Fix:** Execute inventory deductions atomically in PostgreSQL using conditional updates (`UPDATE products SET current_stock = current_stock - $1 WHERE id = $2 AND current_stock >= $1`).

---

### Domain 9: Audit Logging & Detection

#### Finding 9.1: Failed Logins and Permission Denials Not Recorded in Audit Trail
- **Severity:** 🟠 **High**
- **File Paths:**
  - [`src/app/api/auth/login/route.ts`](file:///e:/new%20data/erp%20software/src/app/api/auth/login/route.ts#L40)
  - [`src/lib/auth/server.ts`](file:///e:/new%20data/erp%20software/src/lib/auth/server.ts#L465)
- **Plain English Explanation:** The audit system records successful logins, but completely ignores failed logins and authorization denials (403 Forbidden).
- **How an Attacker Could Abuse It:** An attacker can conduct brute-force attacks or probe restricted endpoints without leaving any record in the administrative audit logs.
- **The Exact Fix:** Log all failed login attempts with IP and user agent, and record all `ForbiddenError` events in the audit log.

#### Finding 9.2: Lack of Automated Anomaly Alerts for Suspicious Activity
- **Severity:** 🟡 **Medium**
- **File Path:** [`src/lib/audit/server.ts`](file:///e:/new%20data/erp%20software/src/lib/audit/server.ts)
- **Plain English Explanation:** There is no alerting threshold to trigger notifications when suspicious patterns occur (e.g. >= 5 failed logins in 5 minutes, bulk data exports, or role modifications).
- **How an Attacker Could Abuse It:** Attacks go unnoticed until long after an account has been compromised or data has been exfiltrated.
- **The Exact Fix:** Introduce an anomaly detection monitor that alerts administrators when failed logins or sensitive operations exceed safe thresholds.

---

### Domain 10: Dependencies & Supply Chain Integrity

#### Finding 10.1: Known Vulnerabilities in Development Dependencies
- **Severity:** 🟠 **High**
- **File Path:** [`package.json`](file:///e:/new%20data/erp%20software/package.json), `package-lock.json`
- **Plain English Explanation:** `npm audit` flags 9 vulnerabilities (7 High, 2 Moderate) in dev dependencies (`braces`, `chokidar`, `micromatch`, `fast-glob`, `postcss-selector-parser`) through `tailwindcss` and `eslint-config-next`.
- **How an Attacker Could Abuse It:** Deeply nested file path patterns can trigger stack-exhaustion denial of service (GHSA-vfj7-8cjw-p6xm) during build or CSS compilation.
- **The Exact Fix:** Run `npm audit fix` or upgrade transitive dependencies via package overrides to resolve vulnerable sub-packages.

#### Finding 10.2: Absence of Continuous Integration (CI) Security Pipeline
- **Severity:** 🟢 **Low**
- **File Path:** Workspace root (missing `.github/workflows/ci.yml`)
- **Plain English Explanation:** There is no automated GitHub Actions workflow verifying tests, linting, type checks, and dependency audits on code commits.
- **How an Attacker Could Abuse It:** Vulnerabilities or regressions can be accidentally merged into the `main` branch without automated gatekeeping.
- **The Exact Fix:** Create `.github/workflows/ci.yml` that runs `tsc --noEmit`, `eslint .`, `vitest run`, and `npm audit --audit-level=high` on every push and pull request.

---

### Domain 11: Database & Row-Level Security (RLS)

#### Finding 11.1: Missing Row-Level Security on Document Sequences Table
- **Severity:** 🟠 **High**
- **File Path:** [`supabase/migrations/20261015000001_fast_database_keyset_and_sequences.sql`](file:///e:/new%20data/erp%20software/supabase/migrations/20261015000001_fast_database_keyset_and_sequences.sql#L11-L18)
- **Plain English Explanation:** Table `public.company_document_sequences` was created without enabling Row-Level Security (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`).
- **How an Attacker Could Abuse It:** Any authenticated Supabase client can directly query or overwrite invoice, quotation, and payment sequence counters across all tenants.
- **The Exact Fix:** Add a migration enabling Row-Level Security on `public.company_document_sequences` with tenant-scoped access policies.

---

## Action Plan: Phase 2 Fix Prioritization

All findings rated **Critical** and **High** will be remediated in Phase 2, along with high-impact **Medium** improvements:

1. **Phase 2.1 (Auth & Backdoors):** Remove hardcoded passwords & keys, enforce `ADMIN_SESSION_SECRET`, apply constant-time compare, strengthen password policy.
2. **Phase 2.2 (Tenant Isolation & Registration):** Block uninvited tenant auto-assignment in registration, fix hardcoded company IDs in sales and CRM detail pages, enforce Customer-portal Self-Only filtering.
3. **Phase 2.3 (Input/Output & Files):** Sanitize CSV formula characters (`=`, `+`, `-`, `@`), fix open redirect on login, enforce strict receipt MIME/size validation.
4. **Phase 2.4 (Abuse & Rate Limiting):** Implement sliding-window rate limiters for login, registration, password reset, and search.
5. **Phase 2.5 (Business Logic & Audit):** Enforce separation of duties on leave approval, mask sensitive payroll/CNIC records, log failed logins and 403 denials.
6. **Phase 2.6 (Database & Headers):** Enable RLS on document sequences, add strict CSP headers to `next.config.mjs`.
7. **Phase 2.7 (CI & Supply Chain):** Add `.github/workflows/ci.yml` and resolve npm audit alerts.
