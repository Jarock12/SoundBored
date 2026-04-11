"use client";

/**
 * Login Page (/login)
 *
 * Authenticates users with their email and password via Supabase Auth.
 * On success, looks up their username in the profiles table and redirects
 * them to their own profile page.
 */

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../utils/supabase/supabaseClient";
import { getCurrentUserSafe } from "../../utils/supabase/auth";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  /**
   * Submits credentials to Supabase Auth.
   * On success, fetches the user's profile to get their username
   * and redirects to /profile/{username}.
   */
  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    // Attempt to sign in — Supabase stores the session in localStorage automatically
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    // Get the freshly authenticated user
    const user = await getCurrentUserSafe();

    if (user) {
      // Look up their username so we can redirect to the right profile URL
      const { data: profileData } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single();

      if (profileData?.username) {
        router.push(`/profile/${profileData.username}`);
      }
    }
  }

  return (
    <main className="min-h-screen text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-zinc-900 p-8 rounded-2xl shadow-lg">
        <h1 className="text-3xl font-bold mb-6 text-center">Log In</h1>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          />

          <button
            type="submit"
            className="bg-green-500 hover:bg-green-600 px-4 py-3 rounded-lg font-semibold transition"
          >
            Log In
          </button>
        </form>

        {message && (
          <p className="mt-4 text-sm text-center text-zinc-300">{message}</p>
        )}

        <p className="mt-6 text-sm text-zinc-400 text-center">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-green-400 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}