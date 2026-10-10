/**
 * IT-HUB ERP — Safe Super Admin Bootstrap Script
 *
 * Usage:
 *   npx tsx scripts/bootstrap-super-admin.ts <email> <password> <fullName>
 *
 * Security Guarantee:
 *   - Runs purely in local/server Node environment.
 *   - Never leaks or bundles service-role keys into frontend code.
 *   - Does not hardcode master passwords.
 */

import { createClient } from "@supabase/supabase-js";

async function bootstrap() {
  const email = process.argv[2];
  const password = process.argv[3];
  const fullName = process.argv[4] || "Initial Super Administrator";

  if (!email || !password) {
    console.error("Usage: npx tsx scripts/bootstrap-super-admin.ts <email> <password> [fullName]");
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey || serviceRoleKey.includes("placeholder")) {
    console.error(
      "Error: NEXT_PUBLIC_SUPABASE_URL and a valid SUPABASE_SERVICE_ROLE_KEY must be set in your environment (.env.local)."
    );
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`[BOOTSTRAP] Initiating provisioning for Super Admin: ${email}...`);

  // 1. Create or retrieve auth user
  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  let userId: string;
  if (userError) {
    if (userError.message.includes("already registered")) {
      console.log("[BOOTSTRAP] User already registered in Auth. Escalating existing profile...");
      const { data: listData } = await supabase.auth.admin.listUsers();
      const existing = listData.users.find((u) => u.email === email);
      if (!existing) {
        console.error("[BOOTSTRAP] Could not locate existing user record.");
        process.exit(1);
      }
      userId = existing.id;
    } else {
      console.error("[BOOTSTRAP] Failed to create auth user:", userError.message);
      process.exit(1);
    }
  } else {
    userId = userData.user.id;
  }

  // 2. Elevate profile to super admin
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({
      id: userId,
      email,
      full_name: fullName,
      is_super_admin: true,
      updated_at: new Date().toISOString(),
    });

  if (profileError) {
    console.error("[BOOTSTRAP] Profile escalation error:", profileError.message);
    process.exit(1);
  }

  console.log(`[BOOTSTRAP] SUCCESS! User ${email} (ID: ${userId}) is now registered as platform Super Admin.`);
}

bootstrap().catch((err) => {
  console.error("[BOOTSTRAP] Fatal error:", err);
  process.exit(1);
});
