"use client";

import * as React from "react";
import Link from "next/link";
import { Mail, CheckCircle2, AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { forgotPasswordAction, ForgotPasswordState } from "./actions";
import { ErpHeroShowcase } from "@/components/auth/erp-hero-showcase";
import { cn } from "@/lib/utils";

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [fieldError, setFieldError] = React.useState<string | null>(null);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();
  const [success, setSuccess] = React.useState(false);

  const emailRef = React.useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setServerError(null);

    const trimmed = email.trim();
    if (!trimmed) {
      setFieldError("Please enter your registered work email address.");
      emailRef.current?.focus();
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setFieldError("Please enter a valid work email address (e.g. colleague@company.com).");
      emailRef.current?.focus();
      return;
    }

    setFieldError(null);

    const formData = new FormData();
    formData.set("email", trimmed);

    startTransition(async () => {
      const res: ForgotPasswordState = await forgotPasswordAction({}, formData);
      if (res.error) {
        setServerError(res.error);
        emailRef.current?.focus();
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

      {/* RIGHT COLUMN: Password Recovery Card */}
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
          <div className="w-full max-w-[430px] rounded-3xl border border-slate-200/80 dark:border-border/80 bg-white dark:bg-card p-8 sm:p-10 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-6">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-900/50 px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
                <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
                <span>Account Recovery</span>
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-foreground pt-1">
                Password Recovery
              </h2>
              <p className="text-xs text-slate-500 dark:text-muted-foreground leading-relaxed">
                Enter your registered work email to receive password reset instructions.
              </p>
            </div>

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
                  If an account exists for {email}, a secure password reset link has been dispatched to your inbox.
                </p>
                <Link href="/login">
                  <button
                    type="button"
                    className="w-full mt-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 text-xs tracking-wide cursor-pointer"
                  >
                    Return to Sign In
                  </button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="email"
                    className="block text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    Registered Work Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={emailRef}
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (fieldError) setFieldError(null);
                    }}
                    required
                    autoComplete="email"
                    placeholder="colleague@company.com"
                    aria-invalid={!!fieldError}
                    aria-describedby={fieldError ? "email-error" : undefined}
                    className={cn(
                      "w-full rounded-xl border bg-white dark:bg-background px-3.5 py-2.5 text-sm text-slate-900 dark:text-foreground placeholder:text-slate-400 transition-all shadow-2xs focus:outline-none focus:ring-2",
                      fieldError
                        ? "border-destructive ring-destructive/20 focus:border-destructive"
                        : "border-slate-200 dark:border-border focus:ring-blue-500/20 focus:border-blue-600"
                    )}
                  />
                  {fieldError && (
                    <p
                      id="email-error"
                      role="alert"
                      className="text-xs font-medium text-destructive flex items-center gap-1.5 pt-0.5"
                    >
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{fieldError}</span>
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full mt-2 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold py-3.5 px-4 shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 text-xs uppercase tracking-wider transition-all duration-200 active:scale-[0.99] disabled:opacity-60 cursor-pointer"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Sending reset link...</span>
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4" />
                      <span>SEND RESET LINK</span>
                    </>
                  )}
                </button>
              </form>
            )}

            <div className="border-t pt-4 text-center text-xs text-slate-600 dark:text-muted-foreground">
              Remember your password?{" "}
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
