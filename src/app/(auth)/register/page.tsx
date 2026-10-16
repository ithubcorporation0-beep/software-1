"use client";

import * as React from "react";
import Link from "next/link";
import { UserPlus, ShieldAlert, CheckCircle2, AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { registerAction, RegisterState } from "./actions";
import { ErpHeroShowcase } from "@/components/auth/erp-hero-showcase";
import { PasswordField } from "@/components/auth/password-field";
import { analyzePassword } from "@/lib/auth/password-policy";
import { cn } from "@/lib/utils";

export default function RegisterPage() {
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [companyName, setCompanyName] = React.useState("");
  const [inviteCode, setInviteCode] = React.useState("");

  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();
  const [success, setSuccess] = React.useState(false);

  // Field refs for accessible focus management
  const fullNameRef = React.useRef<HTMLInputElement>(null);
  const emailRef = React.useRef<HTMLInputElement>(null);
  const passwordRef = React.useRef<HTMLInputElement>(null);
  const companyNameRef = React.useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setServerError(null);

    const errors: Record<string, string> = {};

    // 1. Client-Side Field Validation
    const trimmedName = fullName.trim();
    if (!trimmedName) {
      errors.fullName = "Please enter your full name.";
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      errors.email = "Please enter your work email address.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errors.email = "Please enter a valid work email address (e.g. jane@company.com).";
    }

    // 2. Client-Side Password Policy Validation
    const analysis = analyzePassword(password);
    if (!analysis.valid) {
      errors.password = analysis.errors[0];
    }

    // 3. Password Confirmation
    if (!confirmPassword) {
      errors.confirmPassword = "Please confirm your password.";
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }

    // 4. Multi-Tenant Requirement
    const trimmedCompany = companyName.trim();
    const trimmedInvite = inviteCode.trim();
    if (!trimmedCompany && !trimmedInvite) {
      errors.companyName = "Please enter your organization name or an invite code.";
    }

    setFieldErrors(errors);

    // If there are client validation errors, move focus to first invalid field and DO NOT clear any fields
    if (Object.keys(errors).length > 0) {
      if (errors.fullName) {
        fullNameRef.current?.focus();
      } else if (errors.email) {
        emailRef.current?.focus();
      } else if (errors.password) {
        passwordRef.current?.focus();
      } else if (errors.companyName) {
        companyNameRef.current?.focus();
      }
      return;
    }

    // 5. Submit to Server Action
    const formData = new FormData();
    formData.set("fullName", trimmedName);
    formData.set("email", trimmedEmail);
    formData.set("password", password);
    formData.set("companyName", trimmedCompany);
    formData.set("inviteCode", trimmedInvite);

    startTransition(async () => {
      const res: RegisterState = await registerAction({}, formData);
      if (res.error) {
        setServerError(res.error);
        if (res.fieldErrors) {
          setFieldErrors(res.fieldErrors);
        }
        // SECURITY REQUIREMENT: Clear ONLY the password fields after a failed server attempt
        setPassword("");
        setConfirmPassword("");
        // Keep all other fields (fullName, email, companyName, inviteCode) completely preserved!
        passwordRef.current?.focus();
      } else if (res.success) {
        setSuccess(true);
      }
    });
  };

  return (
    <div className="flex min-h-screen w-full flex-col lg:flex-row">
      {/* LEFT COLUMN: Enterprise ERP Showcase Banner */}
      <div className="hidden lg:block lg:w-[58%] xl:w-[62%] h-full min-h-screen">
        <ErpHeroShowcase />
      </div>

      {/* RIGHT COLUMN: Registration Card */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-10 lg:p-12 bg-slate-50/70 dark:bg-card/40 min-h-screen">
        <div className="flex justify-start">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Sign In</span>
          </Link>
        </div>

        <div className="my-auto py-8 flex justify-center">
          <div className="w-full max-w-[480px] rounded-3xl border border-slate-200/80 dark:border-border/80 bg-white dark:bg-card p-8 sm:p-10 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-6">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-900/50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>Organization Onboarding</span>
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-foreground pt-1">
                Register Your Workspace
              </h2>
              <p className="text-xs text-slate-500 dark:text-muted-foreground leading-relaxed">
                Register your business account or join with an existing team invite.
              </p>
            </div>

            {/* Enterprise Security Safeguard Note */}
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-foreground flex items-start gap-2.5">
              <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-semibold text-amber-800 dark:text-amber-400">
                  Approval &amp; Privilege Safeguard
                </p>
                <p className="text-[11px] text-muted-foreground leading-normal">
                  Newly registered companies are submitted for Super Admin verification to maintain platform integrity.
                </p>
              </div>
            </div>

            {/* Server Error Alert */}
            {serverError && (
              <div
                role="alert"
                aria-live="assertive"
                className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive animate-in fade-in-50"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{serverError}</span>
              </div>
            )}

            {success ? (
              <div className="space-y-4 text-center py-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 mx-auto">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Registration submitted successfully! Your account and company request have been recorded.
                </p>
                <Link href="/login">
                  <button
                    type="button"
                    className="w-full mt-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 text-xs tracking-wide cursor-pointer"
                  >
                    Proceed to Sign In
                  </button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="fullName"
                    className="block text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={fullNameRef}
                    id="fullName"
                    name="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    autoComplete="name"
                    placeholder="Jane Doe"
                    aria-invalid={!!fieldErrors.fullName}
                    aria-describedby={fieldErrors.fullName ? "fullName-error" : undefined}
                    className={cn(
                      "w-full rounded-xl border bg-white dark:bg-background px-3.5 py-2.5 text-sm text-slate-900 dark:text-foreground placeholder:text-slate-400 transition-all shadow-2xs focus:outline-none focus:ring-2",
                      fieldErrors.fullName
                        ? "border-destructive ring-destructive/20 focus:border-destructive"
                        : "border-slate-200 dark:border-border focus:ring-blue-500/20 focus:border-blue-600"
                    )}
                  />
                  {fieldErrors.fullName && (
                    <p
                      id="fullName-error"
                      role="alert"
                      className="text-xs font-medium text-destructive flex items-center gap-1.5 pt-0.5"
                    >
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{fieldErrors.fullName}</span>
                    </p>
                  )}
                </div>

                {/* Email Address */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="email"
                    className="block text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    Work Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={emailRef}
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="jane@enterprise.com"
                    aria-invalid={!!fieldErrors.email}
                    aria-describedby={fieldErrors.email ? "email-error" : undefined}
                    className={cn(
                      "w-full rounded-xl border bg-white dark:bg-background px-3.5 py-2.5 text-sm text-slate-900 dark:text-foreground placeholder:text-slate-400 transition-all shadow-2xs focus:outline-none focus:ring-2",
                      fieldErrors.email
                        ? "border-destructive ring-destructive/20 focus:border-destructive"
                        : "border-slate-200 dark:border-border focus:ring-blue-500/20 focus:border-blue-600"
                    )}
                  />
                  {fieldErrors.email && (
                    <p
                      id="email-error"
                      role="alert"
                      className="text-xs font-medium text-destructive flex items-center gap-1.5 pt-0.5"
                    >
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{fieldErrors.email}</span>
                    </p>
                  )}
                </div>

                {/* Single Source of Truth Password Field with Live Rules, Strength Meter & Confirm Field */}
                <PasswordField
                  ref={passwordRef}
                  id="password"
                  name="password"
                  value={password}
                  onChange={(val) => {
                    setPassword(val);
                    if (fieldErrors.password) {
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.password;
                        return next;
                      });
                    }
                  }}
                  error={fieldErrors.password}
                  showConfirm={true}
                  confirmId="confirmPassword"
                  confirmName="confirmPassword"
                  confirmValue={confirmPassword}
                  onConfirmChange={(val) => {
                    setConfirmPassword(val);
                    if (fieldErrors.confirmPassword) {
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.confirmPassword;
                        return next;
                      });
                    }
                  }}
                  confirmError={fieldErrors.confirmPassword}
                  placeholder="At least 10 characters with mixed cases & symbols"
                />

                {/* Company Name & Invite Code */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="companyName"
                      className="block text-xs font-bold text-slate-700 dark:text-slate-300"
                    >
                      Company Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      ref={companyNameRef}
                      id="companyName"
                      name="companyName"
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Acme Logistics"
                      aria-invalid={!!fieldErrors.companyName}
                      aria-describedby={
                        fieldErrors.companyName ? "companyName-error" : undefined
                      }
                      className={cn(
                        "w-full rounded-xl border bg-white dark:bg-background px-3.5 py-2.5 text-sm text-slate-900 dark:text-foreground placeholder:text-slate-400 transition-all shadow-2xs focus:outline-none focus:ring-2",
                        fieldErrors.companyName
                          ? "border-destructive ring-destructive/20 focus:border-destructive"
                          : "border-slate-200 dark:border-border focus:ring-blue-500/20 focus:border-blue-600"
                      )}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="inviteCode"
                      className="block text-xs font-bold text-slate-700 dark:text-slate-300"
                    >
                      Invite Code <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      id="inviteCode"
                      name="inviteCode"
                      type="text"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      placeholder="INV-XXXXX"
                      className="w-full rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-background px-3.5 py-2.5 text-sm text-slate-900 dark:text-foreground placeholder:text-slate-400 transition-all shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    />
                  </div>
                </div>

                {fieldErrors.companyName && (
                  <p
                    id="companyName-error"
                    role="alert"
                    className="text-xs font-medium text-destructive flex items-center gap-1.5"
                  >
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{fieldErrors.companyName}</span>
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full mt-3 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold py-3.5 px-4 shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 text-xs uppercase tracking-wider transition-all duration-200 active:scale-[0.99] disabled:opacity-60 cursor-pointer"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Submitting Registration...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      <span>SUBMIT REGISTRATION</span>
                    </>
                  )}
                </button>
              </form>
            )}

            <div className="border-t pt-4 text-center text-xs text-slate-600 dark:text-muted-foreground">
              Already have an active account?{" "}
              <Link
                href="/login"
                className="font-bold text-blue-600 hover:text-blue-700 hover:underline"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>

        <div className="text-center text-[11px] text-slate-400 dark:text-muted-foreground/60">
          Protected by Enterprise Multi-Tenant Security &amp; Immutable Audit Trail
        </div>
      </div>
    </div>
  );
}
