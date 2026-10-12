import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/auth/login/route";

const mockSignInWithPassword = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockImplementation(async () => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
    },
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
    }),
  })),
}));

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 400 when email or password is missing", async () => {
    const request = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "" }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toContain("required");
  });

  it("should return 401 when authentication fails", async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: "Invalid login credentials" },
    });

    const request = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "test@example.com",
        password: "wrong-password",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Invalid login credentials");
  });

  it("should return 200 with user data when authentication succeeds", async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      data: {
        user: { id: "user-123", email: "admin@enterprise.corp" },
        session: { access_token: "mock-token" },
      },
      error: null,
    });

    const request = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "admin@enterprise.corp",
        password: "securePassword123!",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.user.id).toBe("user-123");
    expect(body.user.email).toBe("admin@enterprise.corp");
  });
});
