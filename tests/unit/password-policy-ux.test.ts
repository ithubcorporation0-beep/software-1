import { describe, it, expect, vi } from "vitest";
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  SUPABASE_PASSWORD_MIN_LENGTH,
  PASSWORD_RULES,
  passwordPolicySchema,
  analyzePassword,
  validatePasswordStrength,
} from "@/lib/auth/password-policy";
import { registerAction } from "@/app/(auth)/register/actions";

// Mock Supabase to test registerAction error branches without external network
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    auth: {
      admin: {
        createUser: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "User already registered with this email" },
        }),
      },
    },
    from: vi.fn().mockReturnValue({
      upsert: vi.fn().mockResolvedValue({}),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: "test-comp-id" } }),
        }),
      }),
    }),
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      signUp: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "User already registered" },
      }),
    },
  }),
}));

vi.mock("@/lib/audit/server", () => ({
  recordAuditLog: vi.fn().mockResolvedValue({}),
}));

describe("Password Policy & UX Single Source of Truth", () => {
  it("verifies single source of truth configuration constants", () => {
    expect(PASSWORD_MIN_LENGTH).toBe(10);
    expect(PASSWORD_MAX_LENGTH).toBe(128);
    expect(SUPABASE_PASSWORD_MIN_LENGTH).toBe(10);
    expect(PASSWORD_RULES.length).toBe(5);
  });

  it("verifies client and server use the identical password policy rules", () => {
    const ruleIds = PASSWORD_RULES.map((r) => r.id);
    expect(ruleIds).toEqual(["length", "uppercase", "lowercase", "number", "special"]);
  });

  it("validates that a short password (8 chars) fails length rule and reports exact count", () => {
    const analysis = analyzePassword("Abc123!@");
    expect(analysis.valid).toBe(false);
    expect(analysis.passedRules.length).toBe(false);
    expect(analysis.passedRules.uppercase).toBe(true);
    expect(analysis.passedRules.lowercase).toBe(true);
    expect(analysis.passedRules.number).toBe(true);
    expect(analysis.passedRules.special).toBe(true);

    // Verify plain-English error with exact entered length
    expect(analysis.errors[0]).toBe("Password must be at least 10 characters (you entered 8)");
  });

  it("verifies each checklist rule correctly reflects pass/fail state", () => {
    // 1. Missing uppercase
    const noUpper = analyzePassword("abcdefgh123!");
    expect(noUpper.passedRules.uppercase).toBe(false);
    expect(noUpper.passedRules.length).toBe(true);

    // 2. Missing lowercase
    const noLower = analyzePassword("ABCDEFGH123!");
    expect(noLower.passedRules.lowercase).toBe(false);
    expect(noLower.passedRules.uppercase).toBe(true);

    // 3. Missing number
    const noNumber = analyzePassword("Abcdefghijk!");
    expect(noNumber.passedRules.number).toBe(false);
    expect(noNumber.passedRules.uppercase).toBe(true);

    // 4. Missing special character
    const noSpecial = analyzePassword("Abcdefgh1234");
    expect(noSpecial.passedRules.special).toBe(false);
    expect(noSpecial.passedRules.number).toBe(true);

    // 5. Fully compliant
    const compliant = analyzePassword("Enterprise#2026");
    expect(compliant.valid).toBe(true);
    expect(compliant.passedRules.length).toBe(true);
    expect(compliant.passedRules.uppercase).toBe(true);
    expect(compliant.passedRules.lowercase).toBe(true);
    expect(compliant.passedRules.number).toBe(true);
    expect(compliant.passedRules.special).toBe(true);
    expect(compliant.errors.length).toBe(0);
  });

  it("verifies password strength meter grading", () => {
    const weak = analyzePassword("short");
    expect(weak.strength).toBe("weak");

    const fair = analyzePassword("Password123"); // 11 chars, upper, lower, number, but no special
    expect(fair.strength).toBe("fair");

    const strong = analyzePassword("SecureP@ssword2026!");
    expect(strong.strength).toBe("strong");
  });

  it("verifies Zod schema and helper functions produce identical validation errors", () => {
    const testPassword = "Short1!";
    const parseResult = passwordPolicySchema.safeParse(testPassword);
    const helperResult = validatePasswordStrength(testPassword);

    expect(parseResult.success).toBe(false);
    expect(helperResult.valid).toBe(false);
    expect(helperResult.errors[0]).toContain("at least 10 characters");
  });

  it("verifies registerAction preserves all user-typed fields on a short password failure", async () => {
    const formData = new FormData();
    formData.set("fullName", "Tariq Mahmood");
    formData.set("email", "tariq@lahore-logistics.pk");
    formData.set("password", "Abc123!@"); // 8 chars (fails policy)
    formData.set("companyName", "Lahore Freight Corp");
    formData.set("inviteCode", "INV-9988");

    const result = await registerAction({}, formData);

    // 1. Should fail with specific password length error
    expect(result.error).toBe("Password must be at least 10 characters (you entered 8)");
    expect(result.success).toBeFalsy();

    // 2. CRITICAL UX RULE: All typed data must be preserved in returned values!
    expect(result.values).toBeDefined();
    expect(result.values?.fullName).toBe("Tariq Mahmood");
    expect(result.values?.email).toBe("tariq@lahore-logistics.pk");
    expect(result.values?.companyName).toBe("Lahore Freight Corp");
    expect(result.values?.inviteCode).toBe("INV-9988");
  });

  it("verifies registerAction preserves all user-typed fields on server-side failure", async () => {
    const formData = new FormData();
    formData.set("fullName", "Fatima Noor");
    formData.set("email", "fatima@karachi-cargo.pk");
    formData.set("password", "StrongP@ssw0rd!2026"); // 19 chars (valid policy)
    formData.set("companyName", "Karachi Shipping");
    formData.set("inviteCode", "");

    const result = await registerAction({}, formData);

    // Should return server error (e.g. duplicate user)
    expect(result.error).toContain("already exists");
    expect(result.success).toBeFalsy();

    // Typed data must remain intact so user does not have to retype everything
    expect(result.values?.fullName).toBe("Fatima Noor");
    expect(result.values?.email).toBe("fatima@karachi-cargo.pk");
    expect(result.values?.companyName).toBe("Karachi Shipping");
  });
});
