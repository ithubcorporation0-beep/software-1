import { NextResponse } from "next/server";
import { getCurrentUser, requireCompanyMembership } from "@/lib/auth/server";
import { verifyFbrTaxpayer } from "@/lib/fbr-taxpayer-service";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
    }

    const body = await request.json();
    const { taxNumber, customerType, companyId } = body;

    // Enforce tenant isolation: prevent user from executing or recording verification against unauthorized tenant
    if (companyId) {
      try {
        await requireCompanyMembership(companyId, user);
      } catch (authErr: any) {
        return NextResponse.json(
          { error: authErr.message || "Forbidden: You are not authorized to access this tenant." },
          { status: 403 }
        );
      }
    }

    if (!taxNumber || typeof taxNumber !== "string" || !taxNumber.trim()) {
      return NextResponse.json(
        { error: "Tax identifier (CNIC or NTN) is required" },
        { status: 400 }
      );
    }

    const verification = await verifyFbrTaxpayer(
      taxNumber.trim(),
      customerType || "Retailer",
      companyId,
      user.email
    );

    return NextResponse.json({
      success: true,
      data: verification,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to execute FBR verification" },
      { status: 500 }
    );
  }
}
