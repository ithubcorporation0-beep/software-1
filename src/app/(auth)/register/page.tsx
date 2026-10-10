"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus, ShieldAlert, CheckCircle2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function RegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [inviteCode, setInviteCode] = React.useState("");
  const [companyName, setCompanyName] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            requested_company: companyName,
            invite_code: inviteCode,
          },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      setSuccessMessage(
        "Registration initiated successfully. Please verify your email address to confirm your account. Your company administrator will verify your role assignment."
      );
      setLoading(false);
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred during registration.");
      setLoading(false);
    }
  };

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

      {errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage ? (
        <div className="space-y-4 text-center py-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 mx-auto">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{successMessage}</p>
          <Link href="/login">
            <Button variant="default" size="sm" className="mt-2">
              Proceed to Sign In
            </Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleRegister} className="space-y-3.5">
          <Input
            label="Full Name"
            required
            placeholder="Jane Doe"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />

          <Input
            label="Work Email"
            type="email"
            required
            placeholder="jane@enterprise.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Input
            label="Password"
            type="password"
            required
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Company Name"
              placeholder="e.g. Acme Logistics"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
            <Input
              label="Invite Code (Optional)"
              placeholder="INV-XXXXX"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
            />
          </div>

          <Button type="submit" className="w-full mt-2" isLoading={loading}>
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
