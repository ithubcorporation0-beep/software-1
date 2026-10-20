import { describe, it, expect, beforeEach, vi } from "vitest";
import { getFbrAccessToken, isFbrTokenExpired, clearFbrTokenCache } from "@/lib/fbr-api";

describe("FBR OAuth 2.0 Client Credentials Authentication Service", () => {
  beforeEach(() => {
    clearFbrTokenCache();
    vi.restoreAllMocks();
    delete process.env.FBR_CLIENT_ID;
    delete process.env.FBR_CLIENT_SECRET;
  });

  it("throws a descriptive configuration error if FBR_CLIENT_ID or FBR_CLIENT_SECRET is missing", async () => {
    await expect(getFbrAccessToken()).rejects.toThrowError(
      /FBR_CLIENT_ID and FBR_CLIENT_SECRET environment variables must be defined/i
    );
  });

  it("requests a new OAuth token and caches it for subsequent calls", async () => {
    process.env.FBR_CLIENT_ID = "mock_client_id_123";
    process.env.FBR_CLIENT_SECRET = "mock_client_secret_xyz";
    process.env.FBR_TOKEN_URL = "https://mock.fbr.gov.pk/oauth2/token";

    let fetchCount = 0;
    const mockFetch = vi.fn().mockImplementation(async (url, init) => {
      fetchCount++;
      expect(url).toBe("https://mock.fbr.gov.pk/oauth2/token");
      expect(init.method).toBe("POST");
      expect(init.headers["Content-Type"]).toBe("application/x-www-form-urlencoded");

      const bodyParams = new URLSearchParams(init.body);
      expect(bodyParams.get("grant_type")).toBe("client_credentials");
      expect(bodyParams.get("client_id")).toBe("mock_client_id_123");
      expect(bodyParams.get("client_secret")).toBe("mock_client_secret_xyz");

      return {
        ok: true,
        status: 200,
        json: async () => ({
          access_token: "mock_fbr_access_token_abc_999",
          token_type: "Bearer",
          expires_in: 3600,
        }),
      };
    });

    vi.stubGlobal("fetch", mockFetch);

    expect(isFbrTokenExpired()).toBe(true);

    // 1. Initial retrieval
    const token1 = await getFbrAccessToken();
    expect(token1).toBe("mock_fbr_access_token_abc_999");
    expect(fetchCount).toBe(1);
    expect(isFbrTokenExpired()).toBe(false);

    // 2. Second retrieval uses cache without network call
    const token2 = await getFbrAccessToken();
    expect(token2).toBe("mock_fbr_access_token_abc_999");
    expect(fetchCount).toBe(1);
  });

  it("auto-refreshes the token when the cached token expires", async () => {
    process.env.FBR_CLIENT_ID = "mock_client_id_123";
    process.env.FBR_CLIENT_SECRET = "mock_client_secret_xyz";

    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(async () => {
      callCount++;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          access_token: `token_attempt_${callCount}`,
          token_type: "Bearer",
          expires_in: 1, // 1 second TTL
        }),
      };
    });

    vi.stubGlobal("fetch", mockFetch);

    // Initial fetch
    const first = await getFbrAccessToken();
    expect(first).toBe("token_attempt_1");

    // Clear cache or check expired state due to 60s buffer
    expect(isFbrTokenExpired()).toBe(true);

    // Next call fetches fresh token
    const second = await getFbrAccessToken();
    expect(second).toBe("token_attempt_2");
    expect(callCount).toBe(2);
  });
});
