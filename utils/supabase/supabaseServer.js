/**
 * supabaseServer.js — Server-side Supabase client (service role)
 *
 * This client uses the SERVICE ROLE key, which bypasses all RLS policies.
 * It should ONLY be used in:
 *  - Next.js API routes (/app/api/...)
 *  - Server components that need privileged access
 *
 * NEVER import this in client ("use client") components — the service role key
 * must not be exposed to the browser. It is only available server-side via
 * the SUPABASE_SERVICE_ROLE_KEY environment variable (no NEXT_PUBLIC_ prefix).
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const supabaseServer = createClient(supabaseUrl, supabaseKey)