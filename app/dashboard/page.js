"use client";

/**
 * Dashboard Page (/dashboard)
 *
 * A simple landing page shown after Spotify OAuth completes.
 * Displays the user's email, username, and their top Spotify tracks
 * (which are synced to the saved_tracks table by the /api/callback route).
 *
 * Most users will navigate from here to their profile or the feed.
 */

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../utils/supabase/supabaseClient";
import { useAuth } from "../context/AuthProvider";

export default function Dashboard() {
  const router = useRouter();
  const { user, authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [tracks, setTracks] = useState([]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }

    setEmail(user.email || "");

    async function loadUserData() {
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single();

      if (!error && profileData) {
        setUsername(profileData.username);
      }

      const { data: tracksData } = await supabase
        .from('saved_tracks')
        .select('*')
        .order('created_at', { ascending: false });

      setTracks(tracksData || []);
    }

    loadUserData();
  }, [user, authLoading, router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <main className="min-h-screen text-white px-6 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-zinc-900 p-8 rounded-2xl shadow-lg text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Welcome to SoundBored</h1>
          <p className="text-zinc-300 mb-2">
            Username: <Link href={`/profile/${username}`} className="text-green-400 hover:underline">{username}</Link>
          </p>
          <p className="text-zinc-400 mb-6">Email: {email}</p>
          
          <button
            onClick={handleLogout}
            className="bg-green-500 hover:bg-green-600 px-6 py-3 rounded-lg font-semibold transition"
          >
            Log Out
          </button>
        </div>

        <div className="bg-zinc-900 p-8 rounded-2xl shadow-lg">
          <h2 className="text-2xl font-bold mb-6 text-center">My Top Tracks</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {tracks.map((track) => (
              <div key={track.id} className="bg-zinc-800 p-4 rounded-lg">
                {track.album_url && (
                  <Image
                    src={track.album_url}
                    alt={track.track_name}
                    width={400}
                    height={192}
                    className="w-full h-48 object-cover rounded mb-4"
                  />
                )}
                <h3 className="text-lg font-semibold mb-2">{track.track_name}</h3>
                <p className="text-zinc-400">{track.artist_name}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}