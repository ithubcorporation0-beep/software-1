"use client";

import * as React from "react";
import { Eye, EyeOff, Check, Circle, ShieldCheck, AlertCircle } from "lucide-react";
import {
  PASSWORD_RULES,
  analyzePassword,
  PasswordAnalysis,
} from "@/lib/auth/password-policy";
import { cn } from "@/lib/utils";

export interface PasswordFieldProps {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  autoComplete?: string;
  placeholder?: string;
  // Confirm password controls
  showConfirm?: boolean;
  confirmId?: string;
  confirmName?: string;
  confirmValue?: string;
  onConfirmChange?: (value: string) => void;
  confirmError?: string | null;
  confirmLabel?: string;
  // Options
  showChecklist?: boolean;
  showStrengthMeter?: boolean;
  className?: string;
}

export const PasswordField = React.forwardRef<HTMLInputElement, PasswordFieldProps>(
  (
    {
      id = "password",
      name = "password",
      value,
      onChange,
      error,
      label = "Password *",
      required = true,
      disabled = false,
      autoComplete = "new-password",
      placeholder = "Create a secure password",
      showConfirm = false,
      confirmId = "confirmPassword",
      confirmName = "confirmPassword",
      confirmValue = "",
      onConfirmChange,
      confirmError,
      confirmLabel = "Confirm Password *",
      showChecklist = true,
      showStrengthMeter = true,
      className,
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

    const analysis: PasswordAnalysis = React.useMemo(() => {
      return analyzePassword(value);
    }, [value]);

    const isMatch = React.useMemo(() => {
      if (!value || !confirmValue) return null;
      return value === confirmValue;
    }, [value, confirmValue]);

    return (
      <div className={cn("space-y-4", className)}>
        {/* Main Password Input */}
        <div className="space-y-1.5">
          <label
            htmlFor={id}
            className="block text-xs font-bold text-slate-700 dark:text-slate-300"
          >
            {label}
          </label>
          <div className="relative">
            <input
              ref={ref}
              id={id}
              name={name}
              type={showPassword ? "text" : "password"}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled}
              required={required}
              autoComplete={autoComplete}
              placeholder={placeholder}
              aria-invalid={!!error}
              aria-describedby={`${id}-error ${id}-rules`}
              className={cn(
                "w-full rounded-xl border bg-white dark:bg-background px-3.5 pr-11 py-2.5 text-sm text-slate-900 dark:text-foreground placeholder:text-slate-400 transition-all shadow-2xs focus:outline-none focus:ring-2",
                error
                  ? "border-destructive ring-destructive/20 focus:border-destructive"
                  : "border-slate-200 dark:border-border focus:ring-blue-500/20 focus:border-blue-600"
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              disabled={disabled}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors focus:outline-none cursor-pointer"
              aria-label={showPassword ? "Hide password" : "Show password"}
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>

          {error && (
            <p
              id={`${id}-error`}
              role="alert"
              className="text-xs font-medium text-destructive flex items-center gap-1.5 pt-0.5"
            >
              <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </p>
          )}
        </div>

        {/* Strength Meter */}
        {showStrengthMeter && value.length > 0 && (
          <div className="space-y-1.5 rounded-xl border border-slate-200/80 dark:border-border/80 bg-slate-50/50 dark:bg-card/40 p-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-600 dark:text-muted-foreground flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
                Password Strength:
              </span>
              <span
                className={cn(
                  "font-bold text-[11px] uppercase tracking-wider",
                  analysis.strength === "weak" && "text-red-500",
                  analysis.strength === "fair" && "text-amber-500",
                  analysis.strength === "strong" && "text-emerald-500"
                )}
              >
                {analysis.strength}
              </span>
            </div>

            <div className="h-1.5 w-full bg-slate-200 dark:bg-muted rounded-full overflow-hidden flex gap-1">
              <div
                className={cn(
                  "h-full transition-all duration-300 rounded-full",
                  analysis.strength === "weak" && "w-1/3 bg-red-500",
                  analysis.strength === "fair" && "w-2/3 bg-amber-500",
                  analysis.strength === "strong" && "w-full bg-emerald-500"
                )}
              />
            </div>
          </div>
        )}

        {/* Live Rules Checklist */}
        {showChecklist && (
          <div
            id={`${id}-rules`}
            aria-live="polite"
            className="rounded-xl border border-slate-200/70 dark:border-border/60 bg-white/70 dark:bg-card/30 p-3 space-y-2"
          >
            <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 tracking-wide uppercase">
              Password Requirements
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
              {PASSWORD_RULES.map((rule) => {
                const passed = analysis.passedRules[rule.id];
                return (
                  <li
                    key={rule.id}
                    className={cn(
                      "flex items-center gap-2 transition-colors",
                      passed
                        ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                        : "text-slate-400 dark:text-slate-500"
                    )}
                  >
                    {passed ? (
                      <Check
                        className="h-3.5 w-3.5 text-emerald-500 shrink-0"
                        aria-hidden="true"
                      />
                    ) : (
                      <Circle
                        className="h-2 w-2 fill-slate-300 dark:fill-slate-600 text-transparent shrink-0 mx-0.5"
                        aria-hidden="true"
                      />
                    )}
                    <span className="text-[11px]">{rule.label}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Optional Confirm Password Field */}
        {showConfirm && onConfirmChange && (
          <div className="space-y-1.5 pt-1">
            <label
              htmlFor={confirmId}
              className="block text-xs font-bold text-slate-700 dark:text-slate-300"
            >
              {confirmLabel}
            </label>
            <div className="relative">
              <input
                id={confirmId}
                name={confirmName}
                type={showConfirmPassword ? "text" : "password"}
                value={confirmValue}
                onChange={(e) => onConfirmChange(e.target.value)}
                disabled={disabled}
                required={required}
                autoComplete="new-password"
                placeholder="Repeat your password"
                aria-invalid={confirmError ? true : isMatch === false}
                aria-describedby={`${confirmId}-status`}
                className={cn(
                  "w-full rounded-xl border bg-white dark:bg-background px-3.5 pr-11 py-2.5 text-sm text-slate-900 dark:text-foreground placeholder:text-slate-400 transition-all shadow-2xs focus:outline-none focus:ring-2",
                  confirmError || isMatch === false
                    ? "border-destructive ring-destructive/20 focus:border-destructive"
                    : isMatch === true
                    ? "border-emerald-500 ring-emerald-500/20 focus:border-emerald-600"
                    : "border-slate-200 dark:border-border focus:ring-blue-500/20 focus:border-blue-600"
                )}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                disabled={disabled}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors focus:outline-none cursor-pointer"
                aria-label={
                  showConfirmPassword
                    ? "Hide confirm password"
                    : "Show confirm password"
                }
                tabIndex={-1}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>

            {/* Live Match Notification */}
            <div id={`${confirmId}-status`} className="pt-0.5">
              {confirmError ? (
                <p
                  role="alert"
                  className="text-xs font-medium text-destructive flex items-center gap-1.5"
                >
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{confirmError}</span>
                </p>
              ) : isMatch === true ? (
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
                  <span>Passwords match</span>
                </p>
              ) : isMatch === false ? (
                <p className="text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
                  <span>Passwords do not match yet</span>
                </p>
              ) : null}
            </div>
          </div>
        )}
      </div>
    );
  }
);

PasswordField.displayName = "PasswordField";
