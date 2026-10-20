interface FbrOAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number; // Duration in seconds (e.g., 3600 = 1 hour)
  scope?: string;
}

interface CachedTokenState {
  accessToken: string;
  expiresAt: number; // Epoch timestamp in milliseconds
}

// In-memory token cache for server-side lifecycle
let cachedTokenState: CachedTokenState | null = null;

// Expiration threshold buffer (60 seconds) to prevent edge-of-expiry request drops
const EXPIRATION_BUFFER_MS = 60 * 1000;

/**
 * Checks whether the current in-memory FBR access token is expired or missing.
 */
export function isFbrTokenExpired(): boolean {
  if (!cachedTokenState) {
    return true;
  }
  return Date.now() >= cachedTokenState.expiresAt - EXPIRATION_BUFFER_MS;
}

/**
 * Fetches a new OAuth 2.0 access token from the FBR authentication endpoint
 * using the Client Credentials grant flow.
 */
async function fetchFbrOAuthToken(): Promise<CachedTokenState> {
  const clientId = process.env.FBR_CLIENT_ID?.trim();
  const clientSecret = process.env.FBR_CLIENT_SECRET?.trim();
  const tokenEndpoint =
    process.env.FBR_TOKEN_URL?.trim() || "https://api.fbr.gov.pk/oauth2/token";

  if (!clientId || !clientSecret) {
    throw new Error(
      "FBR Configuration Exception: FBR_CLIENT_ID and FBR_CLIENT_SECRET environment variables must be defined."
    );
  }

  const requestBody = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: requestBody.toString(),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(
      `FBR Authentication Failed: HTTP ${response.status} from ${tokenEndpoint} - ${errorText}`
    );
  }

  const tokenData = (await response.json()) as FbrOAuthTokenResponse;

  if (!tokenData.access_token) {
    throw new Error(
      "FBR Authentication Error: Invalid response payload, missing 'access_token'."
    );
  }

  // FBR tokens default to 1 hour (3600 seconds) if expires_in is not explicitly provided
  const ttlSeconds = typeof tokenData.expires_in === "number" && tokenData.expires_in > 0
    ? tokenData.expires_in
    : 3600;

  const state: CachedTokenState = {
    accessToken: tokenData.access_token,
    expiresAt: Date.now() + ttlSeconds * 1000,
  };

  cachedTokenState = state;
  return state;
}

/**
 * Retrieves a valid FBR access token.
 * If the cached token is active, returns it immediately.
 * If missing or expired, requests a new token via OAuth 2.0 Client Credentials flow.
 */
export async function getFbrAccessToken(): Promise<string> {
  if (!isFbrTokenExpired() && cachedTokenState) {
    return cachedTokenState.accessToken;
  }

  const freshState = await fetchFbrOAuthToken();
  return freshState.accessToken;
}

/**
 * Resets the in-memory token cache (useful for testing or invalidation on 401s).
 */
export function clearFbrTokenCache(): void {
  cachedTokenState = null;
}
