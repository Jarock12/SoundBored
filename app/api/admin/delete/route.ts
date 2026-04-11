/**
 * POST /api/admin/delete
 * Permanently deletes a user by ID. Only callable by authenticated admins.
 *
 * Request body: { userId: string }
 * Authorization: Bearer <access_token>
 *
 * Auth pattern:
 *  - supabaseUser (anon key + caller JWT): verifies identity + reads caller's is_admin
 *    (users can always read their own profile row, so no service role needed for this)
 *  - supabaseAdmin (service role): performs the privileged auth.admin.deleteUser()
 *
 * WARNING: This is permanent and cannot be undone.
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

  // User-context client: the caller's JWT is injected as the Authorization header.
  // This lets us call getUser() to verify identity, and also read the caller's own
  // profile row (RLS allows users to SELECT their own row without a service role key).
  const supabaseUser = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
    }
  );

  // Verify who is calling
  const {
    data: { user: caller },
    error: callerError,
  } = await supabaseUser.auth.getUser();

  if (callerError || !caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Read the caller's own is_admin flag using their JWT (no service role needed)
  const { data: callerProfile, error: profileReadError } = await supabaseUser
    .from("profiles")
    .select("is_admin")
    .eq("id", caller.id)
    .single();

  if (profileReadError || !callerProfile?.is_admin) {
    return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
  }

  if (userId === caller.id) {
    return NextResponse.json({ error: "You cannot delete your own account this way" }, { status: 400 });
  }

  // Service-role client — only needed for the privileged auth.admin.deleteUser() call
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
