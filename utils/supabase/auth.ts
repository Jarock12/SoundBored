/**
 * auth.ts — Authentication helper utilities
 *
 * Provides a safe wrapper around Supabase's auth methods to handle
 * transient errors (e.g. storage lock contention on mobile browsers).
 */

import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";

// Deduplicates concurrent calls and short-circuits with a session cache.
// getUser() makes a network round-trip and holds a Web Lock — when NavBar,
// MusicNotes, and the page component all call it simultaneously on mount
// it causes "Lock broken by another request with the 'steal' option."
// getSession() reads from localStorage (no network, no lock) and is used
// as the primary path; getUser() is only the last-resort fallback.
let _inflight: Promise<User | null> | null = null;
let _cache: { user: User | null; at: number } | null = null;
const CACHE_MS = 5_000;

/**
 * Returns the currently authenticated user, or null if not logged in.
 *
 * Uses getSession() (fast, local) first, falls back to getUser() only when
 * there is no cached session. Deduplicates concurrent calls and caches the
 * result for 5 s so simultaneous component mounts don't fight over the lock.
 */
export async function getCurrentUserSafe(): Promise<User | null> {
  if (_cache && Date.now() - _cache.at < CACHE_MS) return _cache.user;
  if (_inflight) return _inflight;

  _inflight = (async () => {
    // Primary: read from the locally cached session — no network, no Web Lock.
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        _cache = { user: data.session.user, at: Date.now() };
        return data.session.user;
      }
    } catch {
      // fall through
    }
    // Fallback: server-validate the JWT only when there is no local session.
    try {
      const { data, error } = await supabase.auth.getUser();
      const user = (!error && data?.user) ? data.user : null;
      _cache = { user, at: Date.now() };
      return user;
    } catch {
      // Don't cache on exception — allow the next call to retry rather than
      // treating a transient AbortError as a confirmed "logged out" state.
      return null;
    }
  })().finally(() => { _inflight = null; });

  return _inflight;
}

/** Call after sign-in or sign-out to clear the cached user immediately. */
export function clearAuthCache() {
  _cache = null;
  _inflight = null;
}
