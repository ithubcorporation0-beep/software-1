"use client";

import * as React from "react";
import Link from "next/link";
import { UserPlus, ShieldAlert, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { registerAction } from "./actions";

export default function RegisterPage() {
  const [state, formAction, isPending] = React.useActionState(registerAction, {
    error: null,
    success: false,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Controlled Organization Onboarding
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Accept an invitation code or register for an unprivileged standard user account.
        </p>
      </div>

      {/* Security Policy Advisory */}
      <div className="rounded-md border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-foreground flex items-start gap-2.5">
        <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-semibold text-amber-700 dark:text-amber-400">
            Enterprise Privilege Safeguard
          </p>
          <p className="text-[11px] text-muted-foreground leading-normal">
            Public sign-up does not grant administrative privileges. Privileged roles (Admin, Super Admin, Finance) must be provisioned by existing verified administrators.
          </p>
        </div>
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
            Registration successful! Your account has been provisioned and confirmed. You can now proceed directly to sign in.
          </p>
          <Link href="/login">
            <Button variant="default" size="sm" className="mt-2">
              Proceed to Sign In
            </Button>
          </Link>
        </div>
      ) : (
        <form action={formAction} className="space-y-3.5">
          <Input
            label="Full Name"
            name="fullName"
            required
            placeholder="Jane Doe"
          />

          <Input
            label="Work Email"
            name="email"
            type="email"
            required
            placeholder="jane@enterprise.com"
          />

          <Input
            label="Password"
            name="password"
            type="password"
            required
            placeholder="At least 8 characters"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Company Name"
              name="companyName"
              placeholder="e.g. Acme Logistics"
            />
            <Input
              label="Invite Code (Optional)"
              name="inviteCode"
              placeholder="INV-XXXXX"
            />
          </div>

          <Button type="submit" className="w-full mt-2" isLoading={isPending}>
            <UserPlus className="mr-2 h-4 w-4" />
            Submit Registration
          </Button>
        </form>
      )}

      <div className="border-t pt-4 text-center text-xs text-muted-foreground">
        Already have an active account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign In
        </Link>
      </div>
    </div>
  );
}
