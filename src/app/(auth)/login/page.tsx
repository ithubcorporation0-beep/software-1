"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LogIn, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginAction } from "./actions";

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams?.get("redirectTo") || "/";

  const [state, formAction, isPending] = React.useActionState(loginAction, {
    error: null,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Sign In to Your Workspace
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Enter your company email and password to access authorized modules.
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

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="redirectTo" value={redirectTo} />

        <Input
          label="Company Email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="colleague@company.com"
        />

        <div className="space-y-1">
          <Input
            label="Password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••••••"
          />
          <div className="flex justify-end pt-1">
            <Link
              href="/forgot-password"
              className="text-xs text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <Button type="submit" className="w-full" isLoading={isPending}>
          <LogIn className="mr-2 h-4 w-4" />
          Sign In
        </Button>
      </form>

      <div className="border-t pt-4 text-center text-xs text-muted-foreground space-y-2">
        <p>
          Need to join a company or accept an invitation?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Accept Invitation
          </Link>
        </p>
        <p className="text-[11px] text-muted-foreground/80">
          First-time platform administrator? Follow the secure bootstrap instructions in{" "}
          <span className="font-mono text-foreground">docs/BOOTSTRAP.md</span>.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense
      fallback={
        <div className="p-6 text-center text-xs text-muted-foreground">
          Loading sign in portal...
        </div>
      }
    >
      <LoginForm />
    </React.Suspense>
  );
}
