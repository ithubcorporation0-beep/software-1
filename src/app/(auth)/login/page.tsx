"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams?.get("redirectTo") || "/";

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      // 1. Authenticate server-side to set HTTP session cookies reliably
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setErrorMessage(result.error || "Invalid email or password.");
        setLoading(false);
        return;
      }

      // 2. Also initialize client-side Supabase session for immediate client SDK operations
      try {
        const supabase = createClient();
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
      } catch {
        // Non-critical: HTTP cookie session is already set by server endpoint
      }

      // 3. Perform a full browser navigation to guarantee cookies are sent with all requests
      window.location.href = redirectTo;
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred during login.");
      setLoading(false);
    }
  };

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

      {errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleLogin} method="POST" className="space-y-4">
        <Input
          label="Company Email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="colleague@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <div className="space-y-1">
          <Input
            label="Password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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

        <Button type="submit" className="w-full" isLoading={loading}>
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
