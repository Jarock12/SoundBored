"use client";

/**
 * Signup Page (/signup)
 *
 * Creates a new user account. Two things happen on signup:
 *  1. supabase.auth.signUp() creates the user in Supabase Auth (email + password)
 *  2. A corresponding row is inserted into our `profiles` table with the chosen username
 *
 * After success, the user is redirected to their new profile page.
 */

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../utils/supabase/supabaseClient";

export default function SignupPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  /**
   * Handles the signup form submission.
   * Usernames are lowercased and trimmed before being saved.
   * The profile row uses user.id as its primary key to link to auth.users.
   */
  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    // Normalize the username: lowercase and strip whitespace
    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim();

    if (!cleanUsername || !cleanEmail || !password) {
      setMessage("Please fill out all fields.");
      return;
    }

    // Only allow letters, numbers, underscores, and hyphens in usernames.
    // This prevents special characters (like semicolons) that break URL routing.
    if (!/^[a-z0-9_-]+$/.test(cleanUsername)) {
      setMessage("Username can only contain letters, numbers, underscores, and hyphens.");
      return;
    }

    // Step 1: Create the auth user in Supabase
    // We pass username/display_name as metadata so it's available on the auth record too
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          username: cleanUsername,
          display_name: cleanUsername,
        },
      },
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    const user = data.user;

    if (!user) {
      setMessage("Signup succeeded, but no user was returned.");
      return;
    }

    // Step 2: Create the public profile row linked to the auth user
    // is_admin defaults to false (set in the database column default)
    const { error: profileError } = await supabase.from("profiles").insert([
      {
        id: user.id,           // Same ID as auth.users so they're linked
        username: cleanUsername,
        display_name: cleanUsername,
        bio: "",
      },
    ]);

    if (profileError) {
      setMessage(profileError.message);
      return;
    }

    setMessage("Account created successfully.");
    router.push(`/profile/${cleanUsername}`);
  }

  return (
    <main className="min-h-screen text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-zinc-900 p-8 rounded-2xl shadow-lg">
        <h1 className="text-3xl font-bold mb-6 text-center">Sign Up</h1>

        <form onSubmit={handleSignup} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          />

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
            Create Account
          </button>
        </form>

        {message && (
          <p className="mt-4 text-sm text-center text-zinc-300">{message}</p>
        )}

        <p className="mt-6 text-sm text-zinc-400 text-center">
          Already have an account?{" "}
          <Link href="/login" className="text-green-400 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}