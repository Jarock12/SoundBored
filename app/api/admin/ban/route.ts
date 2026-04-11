/**
 * POST /api/admin/ban
 * Bans a user by ID. Only callable by authenticated admins.
 *
 * Request body: { userId: string }
 * Authorization: Bearer <access_token>
 *
 * Auth pattern:
 *  - supabaseUser (anon key + caller JWT): verifies identity + reads caller's is_admin
 *  - supabaseAdmin (service role): performs the privileged auth.admin.updateUserById()
 *
 * Sets ban_duration to 87600h (10 years) and is_banned=true in profiles.
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

  if (userId === caller.id) {
    return NextResponse.json({ error: "You cannot ban yourself" }, { status: 400 });
  }

  // Service-role client — only needed for privileged auth.admin operations
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Ban via Supabase Auth Admin API (87600h = 10 years, effectively permanent)
  const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    ban_duration: "87600h",
  });

  if (banError) {
    return NextResponse.json({ error: banError.message }, { status: 500 });
  }

  // Mark is_banned in profiles so the UI can reflect it
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({ is_banned: true })
    .eq("id", userId);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
