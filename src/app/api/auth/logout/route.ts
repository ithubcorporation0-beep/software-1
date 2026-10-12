import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recordAuditLog } from "@/lib/audit/server";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await recordAuditLog({
        userId: user.id,
        action: "auth.logout",
        resource: "auth",
        resourceId: user.id,
        details: { email: user.email },
      });
    }

    await supabase.auth.signOut();
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
