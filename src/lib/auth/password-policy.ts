import { z } from "zod";

/**
 * Enterprise Single Source of Truth for Password Policy
 * Supabase Dashboard setting required:
 * Authentication -> Configuration -> "Minimum password length" MUST BE SET TO: 10
 */
export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;
export const SUPABASE_PASSWORD_MIN_LENGTH = PASSWORD_MIN_LENGTH;

export interface PasswordRuleItem {
  id: "length" | "uppercase" | "lowercase" | "number" | "special";
  label: string;
  test: (password: string) => boolean;
}

export const PASSWORD_RULES: readonly PasswordRuleItem[] = [
  {
    id: "length",
    label: `At least ${PASSWORD_MIN_LENGTH} characters`,
    test: (pwd: string) => pwd.length >= PASSWORD_MIN_LENGTH,
  },
  {
    id: "uppercase",
    label: "At least one uppercase letter (A-Z)",
    test: (pwd: string) => /[A-Z]/.test(pwd),
  },
  {
    id: "lowercase",
    label: "At least one lowercase letter (a-z)",
    test: (pwd: string) => /[a-z]/.test(pwd),
  },
  {
    id: "number",
    label: "At least one number (0-9)",
    test: (pwd: string) => /[0-9]/.test(pwd),
  },
  {
    id: "special",
    label: "At least one special character (!@#$%^&* etc.)",
    test: (pwd: string) => /[^A-Za-z0-9]/.test(pwd),
  },
] as const;

export type PasswordStrength = "weak" | "fair" | "strong";

export interface PasswordAnalysis {
  valid: boolean;
  errors: string[];
  passedRules: Record<PasswordRuleItem["id"], boolean>;
  score: number; // 0 to 5
  strength: PasswordStrength;
  strengthPercent: number; // 0 to 100
  label: string;
}

/**
 * Evaluates password strength and rule compliance in real-time.
 */
export function analyzePassword(password: string): PasswordAnalysis {
  const pwd = password || "";
  const passedRules: Record<PasswordRuleItem["id"], boolean> = {
    length: pwd.length >= PASSWORD_MIN_LENGTH,
    uppercase: /[A-Z]/.test(pwd),
    lowercase: /[a-z]/.test(pwd),
    number: /[0-9]/.test(pwd),
    special: /[^A-Za-z0-9]/.test(pwd),
  };

  const errors: string[] = [];
  if (!passedRules.length) {
    errors.push(
      `Password must be at least ${PASSWORD_MIN_LENGTH} characters (you entered ${pwd.length})`
    );
  }
  if (!passedRules.uppercase) {
    errors.push("Password must contain at least one uppercase letter (A-Z)");
  }
  if (!passedRules.lowercase) {
    errors.push("Password must contain at least one lowercase letter (a-z)");
  }
  if (!passedRules.number) {
    errors.push("Password must contain at least one number (0-9)");
  }
  if (!passedRules.special) {
    errors.push("Password must contain at least one special character (!@#$%^&* etc.)");
  }
  if (pwd.length > PASSWORD_MAX_LENGTH) {
    errors.push(`Password must not exceed ${PASSWORD_MAX_LENGTH} characters`);
  }

  // Count passed rules
  let score = 0;
  if (passedRules.length) score += 1;
  if (passedRules.uppercase) score += 1;
  if (passedRules.lowercase) score += 1;
  if (passedRules.number) score += 1;
  if (passedRules.special) score += 1;

  // Extra point for length >= 14
  const bonusLength = pwd.length >= 14 ? 1 : 0;

  let strength: PasswordStrength = "weak";
  if (score >= 5 || (score >= 4 && bonusLength)) {
    strength = "strong";
  } else if (score >= 3) {
    strength = "fair";
  } else {
    strength = "weak";
  }

  const strengthPercent = Math.min(100, Math.round((score / 5) * 100));

  return {
    valid: errors.length === 0,
    errors,
    passedRules,
    score,
    strength,
    strengthPercent,
    label: strength.toUpperCase(),
  };
}

/**
 * Shared Zod Schema for Passwords
 */
export const passwordPolicySchema = z
  .string()
  .min(
    PASSWORD_MIN_LENGTH,
    `Password must be at least ${PASSWORD_MIN_LENGTH} characters long`
  )
  .max(PASSWORD_MAX_LENGTH, `Password must not exceed ${PASSWORD_MAX_LENGTH} characters`)
  .refine((val) => /[A-Z]/.test(val), {
    message: "Password must contain at least one uppercase letter (A-Z)",
  })
  .refine((val) => /[a-z]/.test(val), {
    message: "Password must contain at least one lowercase letter (a-z)",
  })
  .refine((val) => /[0-9]/.test(val), {
    message: "Password must contain at least one number (0-9)",
  })
  .refine((val) => /[^A-Za-z0-9]/.test(val), {
    message: "Password must contain at least one special character (!@#$%^&* etc.)",
  });

/**
 * Compatibility function used by server actions and tests
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const analysis = analyzePassword(password);
  return {
    valid: analysis.valid,
    errors: analysis.errors,
  };
}

export const validatePasswordPolicy = validatePasswordStrength;
