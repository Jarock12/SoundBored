/**
 * POST /api/admin/unban
 * Lifts a ban on a user. Only callable by authenticated admins.
 *
 * Request body: { userId: string }
 * Authorization: Bearer <access_token>
 *
 * Auth pattern:
 *  - supabaseUser (anon key + caller JWT): verifies identity + reads caller's is_admin
 *  - supabaseAdmin (service role): performs the privileged auth.admin.updateUserById()
 *
 * Sets ban_duration to "none" and is_banned=false in profiles.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  const { userId } = await req.json();

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  // User-context client: verify identity and read caller's own profile (no service role needed)
  const supabaseUser = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
    }
  );

  const {
    data: { user: caller },
    error: callerError,
  } = await supabaseUser.auth.getUser();

  if (callerError || !caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Read is_admin from the caller's own profile row using their JWT
  const { data: callerProfile, error: profileReadError } = await supabaseUser
    .from("profiles")
    .select("is_admin")
    .eq("id", caller.id)
    .single();

  if (profileReadError || !callerProfile?.is_admin) {
    return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
  }

  // Service-role client — only needed for privileged auth.admin operations
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // "none" removes the ban_duration in Supabase Auth, restoring login access
  const { error: unbanError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    ban_duration: "none",
  });

  if (unbanError) {
    return NextResponse.json({ error: unbanError.message }, { status: 500 });
  }

  // Clear the is_banned flag in profiles
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({ is_banned: false })
    .eq("id", userId);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
