"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Globe,
  ChevronDown,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { loginAction } from "./actions";
import { ErpHeroShowcase } from "@/components/auth/erp-hero-showcase";

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams?.get("redirectTo") || "/";

  const [state, formAction, isPending] = React.useActionState(loginAction, {
    error: null,
  });

  const [showPassword, setShowPassword] = React.useState(false);
  const [langMenuOpen, setLangMenuOpen] = React.useState(false);
  const [selectedLang, setSelectedLang] = React.useState("English");

  return (
    <div className="flex min-h-screen w-full flex-col lg:flex-row">
      {/* LEFT COLUMN: Rich Enterprise ERP Showcase Banner */}
      <div className="hidden lg:block lg:w-[58%] xl:w-[62%] h-full min-h-screen">
        <ErpHeroShowcase />
      </div>

      {/* RIGHT COLUMN: Clean Floating Login Card */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-10 lg:p-12 bg-slate-50/70 dark:bg-card/40 min-h-screen">
        {/* Top Bar: Language Selector */}
        <div className="flex justify-end relative">
          <button
            type="button"
            onClick={() => setLangMenuOpen((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200/90 dark:border-border bg-white dark:bg-card px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-foreground shadow-xs hover:bg-slate-50 dark:hover:bg-muted transition-colors"
          >
            <Globe className="h-3.5 w-3.5 text-slate-500" />
            <span className="font-mono text-[11px] font-bold text-slate-800 dark:text-slate-200">
              GB
            </span>
            <span>{selectedLang}</span>
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </button>

          {langMenuOpen && (
            <div className="absolute top-10 right-0 z-30 w-36 rounded-xl border border-slate-200 bg-white dark:bg-card p-1 shadow-lg text-xs">
              {["English", "Urdu", "Arabic", "French"].map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => {
                    setSelectedLang(lang);
                    setLangMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 rounded-lg transition-colors ${
                    selectedLang === lang
                      ? "bg-primary/10 text-primary font-bold"
                      : "text-slate-700 dark:text-foreground hover:bg-slate-100 dark:hover:bg-muted"
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Center: Floating Authentication Card */}
        <div className="my-auto py-8 flex justify-center">
          <div className="w-full max-w-[430px] rounded-3xl border border-slate-200/80 dark:border-border/80 bg-white dark:bg-card p-8 sm:p-10 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-6">
            {/* Header: Secure Access Pill + Titles */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-900/50 px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 shadow-2xs">
                <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
                <span>Secure access</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-foreground pt-1">
                Log in to your account
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-muted-foreground leading-relaxed">
                Enter your email and password below to log in
              </p>
            </div>

            {/* Error Notification */}
            {state?.error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive animate-in fade-in-50"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{state.error}</span>
              </div>
            )}

            {/* Form */}
            <form action={formAction} className="space-y-4">
              <input type="hidden" name="redirectTo" value={redirectTo} />

              {/* Email Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Email address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    name="email"
                    type="text"
                    required
                    autoComplete="username"
                    placeholder="email@example.com"
                    className="w-full rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-background pl-10 pr-3 py-3 text-sm text-slate-900 dark:text-foreground placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-2xs"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    placeholder="Password"
                    className="w-full rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-background pl-10 pr-10 py-3 text-sm text-slate-900 dark:text-foreground placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="rememberMe"
                  name="rememberMe"
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label
                  htmlFor="rememberMe"
                  className="text-xs font-medium text-slate-600 dark:text-slate-400 select-none cursor-pointer"
                >
                  Remember me
                </label>
              </div>

              {/* Primary Sign In Button */}
              <button
                type="submit"
                disabled={isPending}
                className="w-full mt-2 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold py-3.5 px-4 shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 text-xs sm:text-sm uppercase tracking-wider transition-all duration-200 active:scale-[0.99] disabled:opacity-60 cursor-pointer"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <ArrowRight className="h-4 w-4" />
                    <span>SIGN IN</span>
                  </>
                )}
              </button>
            </form>

            {/* Bottom Register Redirect */}
            <div className="pt-2 text-center text-xs text-slate-600 dark:text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="font-bold text-blue-600 hover:text-blue-700 hover:underline"
              >
                Create one
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Security Note */}
        <div className="text-center text-[11px] text-slate-400 dark:text-muted-foreground/60">
          Protected by Enterprise Multi-Tenant Security &amp; Immutable Audit Trail
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-6 text-xs text-muted-foreground">
          Loading sign in portal...
        </div>
      }
    >
      <LoginForm />
    </React.Suspense>
  );
}
