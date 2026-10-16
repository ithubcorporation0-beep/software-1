export {
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  SUPABASE_PASSWORD_MIN_LENGTH,
  PASSWORD_RULES,
  passwordPolicySchema,
  analyzePassword,
  validatePasswordStrength,
  validatePasswordPolicy,
} from "@/lib/auth/password-policy";

export type {
  PasswordRuleItem,
  PasswordStrength,
  PasswordAnalysis,
} from "@/lib/auth/password-policy";
