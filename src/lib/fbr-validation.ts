/**
 * Pakistani Tax & Identity Number Validation Utility
 * Supports NADRA CNIC, FBR NTN (with Modulo 11 checksum), and STRN verification.
 */

export interface TaxIdValidationResult {
  isValid: boolean;
  type: "CNIC" | "NTN" | "STRN" | "UNKNOWN";
  raw: string;
  cleaned: string;
  formatted: string;
  province?: string;
  gender?: "Male" | "Female";
  checkDigitValid?: boolean;
  errorMessage?: string;
}

const PROVINCE_MAP: Record<string, string> = {
  "1": "Khyber Pakhtunkhwa",
  "2": "FATA / Merged Districts",
  "3": "Punjab",
  "4": "Sindh",
  "5": "Balochistan",
  "6": "Islamabad Capital Territory",
  "7": "Gilgit-Baltistan / AJK",
};

/**
 * Calculates FBR NTN Modulo 11 check digit.
 * Standard NTN is 7 digits plus 1 check digit.
 */
export function calculateNtnCheckDigit(baseDigits: string): number | null {
  if (baseDigits.length !== 7 || !/^\d{7}$/.test(baseDigits)) {
    return null;
  }
  const weights = [8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 7; i++) {
    sum += parseInt(baseDigits[i], 10) * weights[i];
  }
  const remainder = sum % 11;
  const checkDigit = (11 - remainder) % 11;
  return checkDigit;
}

/**
 * Validates a Pakistani CNIC (13 digits).
 * Format: XXXXX-XXXXXXX-X
 */
export function validateCnic(input: string): TaxIdValidationResult {
  const raw = input.trim();
  const cleaned = raw.replace(/[\s-]/g, "");

  if (!/^\d+$/.test(cleaned)) {
    return {
      isValid: false,
      type: "CNIC",
      raw,
      cleaned,
      formatted: raw,
      errorMessage: "CNIC must contain only numeric digits (no letters or special characters).",
    };
  }

  if (cleaned.length !== 13) {
    return {
      isValid: false,
      type: "CNIC",
      raw,
      cleaned,
      formatted: raw,
      errorMessage: `Invalid CNIC length: Expected exactly 13 digits, but received ${cleaned.length} digits (${raw}). Standard format is XXXXX-XXXXXXX-X.`,
    };
  }

  const provinceCode = cleaned[0];
  const province = PROVINCE_MAP[provinceCode] || "Pakistan";
  const lastDigit = parseInt(cleaned[12], 10);
  const gender = lastDigit % 2 === 1 ? "Male" : "Female";
  const formatted = `${cleaned.slice(0, 5)}-${cleaned.slice(5, 12)}-${cleaned.slice(12, 13)}`;

  return {
    isValid: true,
    type: "CNIC",
    raw,
    cleaned,
    formatted,
    province,
    gender,
    checkDigitValid: true,
  };
}

/**
 * Validates an FBR NTN (7 or 8 digits).
 * Format: XXXXXXX-X or XXXXXXX
 */
export function validateNtn(input: string): TaxIdValidationResult {
  const raw = input.trim();
  const cleaned = raw.replace(/[\s-]/g, "");

  if (!/^\d+$/.test(cleaned)) {
    return {
      isValid: false,
      type: "NTN",
      raw,
      cleaned,
      formatted: raw,
      errorMessage: "NTN must contain only numeric digits (e.g. 1234567-8).",
    };
  }

  if (cleaned.length !== 7 && cleaned.length !== 8) {
    return {
      isValid: false,
      type: "NTN",
      raw,
      cleaned,
      formatted: raw,
      errorMessage: `Invalid NTN length: Expected 7 or 8 digits, but received ${cleaned.length} digits. Standard format is XXXXXXX-X.`,
    };
  }

  const base7 = cleaned.slice(0, 7);
  const expectedCheckDigit = calculateNtnCheckDigit(base7);
  let checkDigitValid = true;
  let formatted = cleaned;

  if (cleaned.length === 8) {
    const actualCheckDigit = parseInt(cleaned[7], 10);
    // If check digit is 10, FBR assigns special handling or single digit
    checkDigitValid = expectedCheckDigit === actualCheckDigit || expectedCheckDigit === 10;
    formatted = `${base7}-${actualCheckDigit}`;
  } else if (cleaned.length === 7) {
    formatted = expectedCheckDigit !== null ? `${base7}-${expectedCheckDigit}` : base7;
  }

  return {
    isValid: checkDigitValid,
    type: "NTN",
    raw,
    cleaned,
    formatted,
    checkDigitValid,
    errorMessage: checkDigitValid
      ? undefined
      : `NTN check digit mismatch for ${raw}. Expected check digit was ${expectedCheckDigit}.`,
  };
}

/**
 * Universal Tax ID validator for Pakistani identifiers.
 * Automatically classifies whether an input is CNIC, NTN, or invalid.
 */
export function validateTaxId(input: string): TaxIdValidationResult {
  const raw = input?.trim() || "";
  const cleaned = raw.replace(/[\s-]/g, "");

  if (!cleaned) {
    return {
      isValid: false,
      type: "UNKNOWN",
      raw,
      cleaned: "",
      formatted: "",
      errorMessage: "Tax identifier cannot be empty.",
    };
  }

  if (!/^\d+$/.test(cleaned)) {
    return {
      isValid: false,
      type: "UNKNOWN",
      raw,
      cleaned,
      formatted: raw,
      errorMessage: "Tax identifier must contain only numeric digits and hyphens.",
    };
  }

  // 13 digits is standard Pakistani CNIC / STRN
  if (cleaned.length === 13) {
    return validateCnic(raw);
  }

  // 7 or 8 digits is standard FBR NTN
  if (cleaned.length === 7 || cleaned.length === 8) {
    return validateNtn(raw);
  }

  return {
    isValid: false,
    type: "UNKNOWN",
    raw,
    cleaned,
    formatted: raw,
    errorMessage: `Invalid Tax ID format: Entered ${cleaned.length} digits (${raw}). A Pakistani CNIC must be 13 digits (XXXXX-XXXXXXX-X) and an NTN must be 7 or 8 digits (XXXXXXX-X).`,
  };
}
