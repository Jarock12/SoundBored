/**
 * auth.ts — Authentication helper utilities
 *
 * Provides a safe wrapper around Supabase's auth methods to handle
 * transient errors (e.g. storage lock contention on mobile browsers).
 */

import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";

/**
 * Returns the currently authenticated user, or null if not logged in.
 *
 * Prefers getUser() (validates against the server) but falls back to
 * getSession() if that fails due to a transient error. Every protected
 * page should call this at the top of its useEffect to gate access.
 */
export async function getCurrentUserSafe(): Promise<User | null> {
  try {
    // Preferred: verify the JWT server-side to confirm the session is still valid
    const { data, error } = await supabase.auth.getUser();
    if (!error && data?.user) {
      return data.user;
    }
  } catch {
    // Fallback below handles transient lock/contention failures (common on iOS Safari)
  }

  try {
    // Fallback: read from the locally cached session (no network round-trip)
    const { data } = await supabase.auth.getSession();
    return data.session?.user ?? null;
  } catch {
    return null;
  }
}
