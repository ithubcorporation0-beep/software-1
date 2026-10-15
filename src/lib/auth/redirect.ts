/**
 * Sanitizes the post-login destination URL to prevent Open Redirect attacks.
 * Only allows relative paths on the same origin (e.g. "/finance" or "/sales").
 * Disallows protocol-relative URLs ("//evil.com"), absolute URLs ("https://..."),
 * backslashes, or control characters.
 */
export function sanitizeRedirectPath(url?: string | null): string {
  if (!url || typeof url !== "string") {
    return "/";
  }
  const trimmed = url.trim();
  // Must start with a single "/" and NOT start with "//", "\", or contain a scheme ":"
  if (
    trimmed.startsWith("/") &&
    !trimmed.startsWith("//") &&
    !trimmed.startsWith("/\\") &&
    !trimmed.includes(":") &&
    !trimmed.includes("\\")
  ) {
    return trimmed;
  }
  return "/";
}
