"use client";

import * as React from "react";
import Link from "next/link";
import { KeyRound, CheckCircle2, AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PasswordField } from "@/components/auth/password-field";
import { analyzePassword } from "@/lib/auth/password-policy";
import { ErpHeroShowcase } from "@/components/auth/erp-hero-showcase";

export default function ResetPasswordPage() {
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const passwordRef = React.useRef<HTMLInputElement>(null);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const errors: Record<string, string> = {};

    // 1. Password policy verification
    const analysis = analyzePassword(password);
    if (!analysis.valid) {
      errors.password = analysis.errors[0];
    }

    // 2. Confirm password match
    if (!confirmPassword) {
      errors.confirmPassword = "Please confirm your new password.";
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      passwordRef.current?.focus();
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        setErrorMessage(error.message);
        // Clear password fields on server-side failure for security
        setPassword("");
        setConfirmPassword("");
        passwordRef.current?.focus();
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred while resetting your password.");
      setPassword("");
      setConfirmPassword("");
      passwordRef.current?.focus();
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col lg:flex-row">
      {/* LEFT COLUMN: Enterprise ERP Showcase Banner */}
      <div className="hidden lg:block lg:w-[58%] xl:w-[62%] h-full min-h-screen">
        <ErpHeroShowcase />
      </div>

      {/* RIGHT COLUMN: Set New Password Card */}
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
          <div className="w-full max-w-[460px] rounded-3xl border border-slate-200/80 dark:border-border/80 bg-white dark:bg-card p-8 sm:p-10 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-6">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-900/50 px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
                <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
                <span>Security Update</span>
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-foreground pt-1">
                Set New Password
              </h2>
              <p className="text-xs text-slate-500 dark:text-muted-foreground leading-relaxed">
                Enter a secure replacement password meeting organizational compliance standards.
              </p>
            </div>

            {errorMessage && (
              <div
                role="alert"
                aria-live="assertive"
                className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive animate-in fade-in-50"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {success ? (
              <div className="space-y-4 text-center py-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 mx-auto">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your password has been successfully updated. You may now sign in with your new credentials.
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
              <form onSubmit={handleReset} noValidate className="space-y-4">
                <PasswordField
                  ref={passwordRef}
                  id="resetPassword"
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
                  label="New Password *"
                  showConfirm={true}
                  confirmId="confirmResetPassword"
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
                  confirmLabel="Confirm New Password *"
                  placeholder="At least 10 characters with mixed cases & symbols"
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold py-3.5 px-4 shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 text-xs uppercase tracking-wider transition-all duration-200 active:scale-[0.99] disabled:opacity-60 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="h-4 w-4" />
                      <span>UPDATE PASSWORD</span>
                    </>
                  )}
                </button>
              </form>
            )}

            <div className="border-t pt-4 text-center text-xs text-slate-600 dark:text-muted-foreground">
              Return to{" "}
              <Link href="/login" className="font-bold text-blue-600 hover:text-blue-700 hover:underline">
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
