import { NextResponse } from "next/server";
import { getCurrentUser, requireCompanyMembership } from "@/lib/auth/server";
import { createCustomer, getCustomers } from "@/lib/crm/server";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId");
    if (!companyId) {
      return NextResponse.json({ error: "Company ID is required" }, { status: 400 });
    }

    await requireCompanyMembership(companyId, user);
    const search = searchParams.get("search") || undefined;
    const result = await getCustomers(companyId, { search, pageSize: 100 });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch customers" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { companyId, ...customerData } = body;

    if (!companyId) {
      return NextResponse.json({ error: "Company ID is required" }, { status: 400 });
    }

    await requireCompanyMembership(companyId, user);

    const result = await createCustomer(companyId, customerData, user);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to create customer", errors: result.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error occurred" },
      { status: 500 }
    );
  }
}
