import { z } from "zod";

/**
 * Enterprise Password Policy:
 * - At least 10 characters long
 * - Contains at least one uppercase letter (A-Z)
 * - Contains at least one lowercase letter (a-z)
 * - Contains at least one numeric digit (0-9)
 * - Contains at least one special symbol (!@#$%^&* etc.)
 */
export const passwordPolicySchema = z
  .string()
  .min(10, "Password must be at least 10 characters long")
  .max(128, "Password must not exceed 128 characters")
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

export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const result = passwordPolicySchema.safeParse(password);
  if (result.success) {
    return { valid: true, errors: [] };
  }
  return {
    valid: false,
    errors: result.error.issues.map((issue) => issue.message),
  };
}

export const validatePasswordPolicy = validatePasswordStrength;
