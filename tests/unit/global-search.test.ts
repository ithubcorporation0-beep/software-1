import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/search/route";

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockImplementation(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

describe("Categorized Global Search API (/api/search)", () => {
  const companyId = "company-tenant-uuid";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when request is unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: new Error("No session"),
    });

    const req = new Request("http://localhost:3000/api/search?q=invoice");
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it("returns categorized results including real employees and unavailable module notices", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: {
        user: { id: "admin-1", email: "admin@tenant.local", user_metadata: {} },
      },
    });

    // Profile lookup
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValueOnce({
        eq: vi.fn().mockReturnValueOnce({
          single: vi.fn().mockResolvedValueOnce({
            data: { id: "admin-1", email: "admin@tenant.local", is_super_admin: true },
          }),
        }),
      }),
    });

    // Company lookup for super admin
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValueOnce({
        eq: vi.fn().mockReturnValueOnce({
          single: vi.fn().mockResolvedValueOnce({
            data: { id: companyId, name: "Acme Corp" },
          }),
        }),
      }),
    });

    // Members lookup
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValueOnce({
        eq: vi.fn().mockReturnValueOnce({
          limit: vi.fn().mockResolvedValueOnce({
            data: [
              {
                id: "mem-1",
                status: "ACTIVE",
                profile: { id: "user-1", full_name: "Alice Engineer", email: "alice@acme.com" },
                role: { name: "Engineer" },
              },
            ],
          }),
        }),
      }),
    });

    const req = new Request(`http://localhost:3000/api/search?q=alice&companyId=${companyId}`);
    const res = await GET(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.results).toBeDefined();

    // Check employee category match
    const employeeMatch = data.results.find((r: any) => r.category === "Employees");
    expect(employeeMatch).toBeDefined();
    expect(employeeMatch.title).toBe("Alice Engineer");
  });
});
