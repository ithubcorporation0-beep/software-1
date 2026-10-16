# 🐛 IT-HUB ERP — Fixed Bugs & Defect Remediation Log

This log documents all bugs identified, investigated, and remediated during the enterprise bug sweep and password UX overhaul.

| Bug ID | Component / File Location | Defect Description | Root Cause | Engineering Fix Applied |
| :--- | :--- | :--- | :--- | :--- |
| **BUG-001** | `src/app/(auth)/register/page.tsx` | Password policy mismatch between UI and server | UI input placeholder specified "At least 8 characters", but server action rejected with 10 characters | Created single source of truth in `src/lib/auth/password-policy.ts` (10 chars min, uppercase, lowercase, number, symbol) shared across client & server |
| **BUG-002** | `src/app/(auth)/register/page.tsx` | All typed fields erased on failed submit | Uncontrolled HTML inputs inside `useActionState` re-mounted without retained values upon server validation error | Converted form to controlled React state, returned `values` in `registerAction`, and preserved all non-password fields |
| **BUG-003** | `src/app/(auth)/reset-password/page.tsx` | Client bypassed enterprise password policy with hardcoded 8-char check | Component checked `password.length < 8` directly instead of enterprise Zod schema | Integrated `analyzePassword` and `PasswordField` component with 10-char minimum policy |
| **BUG-004** | `src/app/(auth)/register/page.tsx` & `reset-password/page.tsx` | Missing live password requirements and strength indicator | No visual rule checklist or strength grading existed for user guidance | Created accessible `src/components/auth/password-field.tsx` with live 5-rule tick checklist, strength meter, and show/hide eye toggle |
| **BUG-005** | `src/app/(erp)/modules/user-management/user-management-client.tsx` | Change Password modal accepted arbitrary short passwords | Modal lacked password policy validation and confirmation matching | Integrated `PasswordField` with real-time rule checks and confirm matching before submission |
| **BUG-006** | `src/app/(auth)/login/page.tsx` | User-typed email erased on incorrect password | Uncontrolled email input reset during `useActionState` failure re-render | Made email input controlled; updated `loginAction` to return submitted email and cleared only password field |
| **BUG-007** | `src/app/(auth)/forgot-password/page.tsx` | User-typed email erased on rate limit or server error | Email input was uncontrolled and reset upon server response | Converted to controlled input state with field error reporting; returned submitted email in `forgotPasswordAction` |
| **BUG-008** | `src/app/(erp)/settings/settings-client.tsx` | Invite Member dialog wiped email and full name on failure | Modal form action did not preserve user inputs across failed submissions | Added controlled `inviteEmail` and `inviteFullName` states; cleared only upon verified server success |
| **BUG-009** | `src/app/(erp)/settings/settings-client.tsx` | Runtime ReferenceError / TypeScript TS2448 error | `roles` state was referenced in Tab 2 before its declaration in Tab 3 | Hoisted `const [roles, setRoles] = React.useState(initialRoles)` declaration above Tab 2 |
| **BUG-010** | `src/app/layout.tsx` & `public/` | Missing favicon asset generating 404 console errors | No `favicon.ico` existed in `public/` | Generated valid binary `public/favicon.ico` and `src/app/icon.svg`; linked in metadata |
| **BUG-011** | `src/app/(auth)/register/page.tsx` | Passwords improperly cleared on client validation errors | Any client validation error caused full form reset | Enforced rule that passwords are only cleared after server-side failure for security, never on client-side validation errors |
| **BUG-012** | `src/components/layout/user-menu.tsx` | Implicit `any` type annotations causing typecheck failure | Missing explicit types on Supabase user profile callbacks | Added explicit type annotations on callback parameters |

---

### Unfixed Items & External Limitations

1. **Supabase Dashboard Authentication Configuration**:
   - The Supabase hosted database enforces minimum password length at the PostgreSQL Auth API level.
   - **Required User Action**: In the Supabase project dashboard, navigate to **Authentication -> Configuration** and ensure **Minimum password length** is set to **`10`** to match the application's `PASSWORD_MIN_LENGTH = 10`.
