/**
 * supabaseClient.js — Browser-side Supabase client
 *
 * This client uses the public anon key and runs in the browser.
 * It respects Row Level Security (RLS) policies defined in Supabase,
 * so users can only read/write data they're allowed to access.
 *
 * Use this client in all "use client" components and pages.
 * For privileged server-side operations (admin actions), use supabaseServer.js instead.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase environment variables are missing.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);