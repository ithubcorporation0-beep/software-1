"use client";

import * as React from "react";
import Link from "next/link";
import { Mail, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { forgotPasswordAction } from "./actions";

export default function ForgotPasswordPage() {
  const [state, formAction, isPending] = React.useActionState(forgotPasswordAction, {
    error: null,
    success: false,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Password Recovery
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Enter your registered company email address to receive password reset instructions.
        </p>
      </div>

      {state?.error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{state.error}</span>
        </div>
      )}

      {state?.success ? (
        <div className="space-y-4 text-center py-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 mx-auto">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            If an account exists for the specified email, a secure password reset link has been dispatched to your inbox.
          </p>
          <Link href="/login">
            <Button variant="outline" size="sm" className="mt-2">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Return to Sign In
            </Button>
          </Link>
        </div>
      ) : (
        <form action={formAction} className="space-y-4">
          <Input
            label="Registered Email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="colleague@company.com"
          />

          <Button type="submit" className="w-full" isLoading={isPending}>
            <Mail className="mr-2 h-4 w-4" />
            Send Password Reset Link
          </Button>

          <div className="text-center">
            <Link
              href="/login"
              className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="mr-1 h-3.5 w-3.5" />
              Back to Sign In
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
