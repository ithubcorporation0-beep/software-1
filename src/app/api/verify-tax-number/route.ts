import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import { verifyFbrTaxpayer } from "@/lib/fbr-taxpayer-service";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
    }

    const body = await request.json();
    const taxNumber = body.taxNumber || body.ntn_number || body.cnic_number || body.tax_number;
    const customerType = body.customerType || body.trade_category || "Retailer";
    const companyId = body.companyId;

    if (!taxNumber || typeof taxNumber !== "string" || !taxNumber.trim()) {
      return NextResponse.json(
        { error: "Please enter an NTN or CNIC number." },
        { status: 400 }
      );
    }

    const verification = await verifyFbrTaxpayer(
      taxNumber.trim(),
      customerType,
      companyId,
      user.email
    );

    const regType = verification.indicators?.salesTaxRegType.status || (verification.isFiler ? "Registered" : "Unregistered");
    const stAtl = verification.indicators?.salesTaxAtl.status === "Verified Active" ? "Active" : "Inactive";
    const itAtl = verification.indicators?.incomeTaxAtl.status === "Verified Active" ? "Active" : "Inactive";

    // Returns format matching both UNAZ ERP specification and internal ERP structure
    return NextResponse.json({
      success: true,
      registration_type: regType,
      sales_tax_atl_status: stAtl,
      income_tax_atl_status: itAtl,
      data: verification,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Tax number verification failed" },
      { status: 500 }
    );
  }
}
