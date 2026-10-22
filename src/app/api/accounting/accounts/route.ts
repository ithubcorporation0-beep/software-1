import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import {
  getAccounts,
  createAccount,
  updateAccount,
  toggleAccountActive,
} from "@/lib/finance/server";
import { AccountType } from "@/types/database.types";

const DEFAULT_COMPANY_ID = "00000000-0000-0000-0000-000000000001";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = DEFAULT_COMPANY_ID;
    const accounts = await getAccounts(companyId);

    return NextResponse.json({ accounts }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch accounts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      code,
      name,
      account_type,
      sub_type,
      parent_id,
      tax_line,
      currency,
      opening_balance,
      opening_balance_date,
      description,
    } = body;

    if (!code || !name || !account_type) {
      return NextResponse.json(
        { error: "Account Code, Name, and Account Type are required." },
        { status: 400 }
      );
    }

    const companyId = DEFAULT_COMPANY_ID;
    const newAccount = await createAccount(
      companyId,
      {
        code: String(code).trim(),
        name: String(name).trim(),
        account_type: account_type as AccountType,
        sub_type: sub_type || null,
        parent_id: parent_id || null,
        tax_line: tax_line || null,
        currency: currency || "PKR",
        opening_balance: opening_balance !== undefined ? Number(opening_balance) : 0,
        opening_balance_date: opening_balance_date || null,
        description: description || null,
      },
      user
    );

    return NextResponse.json({ account: newAccount }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create account" },
      { status: 400 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { accountId, action, name, description, sub_type, tax_line, is_active } = body;

    if (!accountId) {
      return NextResponse.json({ error: "Account ID is required." }, { status: 400 });
    }

    const companyId = DEFAULT_COMPANY_ID;

    if (action === "toggle_active") {
      const updated = await toggleAccountActive(companyId, accountId, user);
      return NextResponse.json({ account: updated }, { status: 200 });
    }

    const updated = await updateAccount(
      companyId,
      accountId,
      {
        name,
        description,
        sub_type,
        tax_line,
        is_active,
      },
      user
    );

    return NextResponse.json({ account: updated }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update account" },
      { status: 400 }
    );
  }
}
