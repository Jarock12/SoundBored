"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../utils/supabase/supabaseClient";
import { useAuth } from "../../../context/AuthProvider";
import MusicNotesLoader from "../../../components/MusicNotesLoader";

type FollowingProfile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

export default function FollowingPage() {
  const params = useParams();
  const router = useRouter();
  const username = typeof params.username === "string" ? params.username : "";
  const { user, authLoading } = useAuth();

  const [displayName, setDisplayName] = useState<string | null>(null);
  const [following, setFollowing] = useState<FollowingProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [unfollowBusy, setUnfollowBusy] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    async function load() {
      if (!username) return;
      setLoading(true);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, display_name")
        .eq("username", username.toLowerCase())
        .single();

      if (profileError || !profileData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      // Only the profile owner can view their following list
      if (!user?.id || user.id !== profileData.id) {
        router.replace(`/profile/${username}`);
        return;
      }

      setDisplayName(profileData.display_name);

      const { data: followingRows } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", profileData.id)
        .limit(500);

      const followingIds = (followingRows || []).map((r) => r.following_id);

      if (followingIds.length === 0) {
        setFollowing([]);
        setLoading(false);
        return;
      }

      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", followingIds);

      const profileMap = new Map((profilesData || []).map((p) => [p.id, p as FollowingProfile]));
      setFollowing(followingIds.map((id) => profileMap.get(id)).filter((p): p is FollowingProfile => !!p));
      setLoading(false);
    }

    load();
  }, [username, authLoading]);

  async function handleUnfollow(targetId: string) {
    if (!user?.id) return;
    setUnfollowBusy(targetId);
    await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", targetId);
    setFollowing((prev) => prev.filter((f) => f.id !== targetId));
    setUnfollowBusy(null);
  }

  if (loading) return <MusicNotesLoader />;

  if (notFound) {
    return (
      <main className="min-h-screen text-white flex items-center justify-center px-6">
        <div className="rounded-2xl bg-zinc-900 p-8 text-center shadow-lg">
          <h1 className="text-3xl font-bold">Profile not found</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-10 text-white">
      <div className="mx-auto w-full max-w-lg">
        <div className="mb-6 flex items-center gap-3">
          <Link
            href={`/profile/${username}`}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            ← Back
          </Link>
          <h1 className="text-xl font-bold text-white">
            {displayName || username}&apos;s Following
          </h1>
        </div>

        {following.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-700 p-8 text-center text-zinc-400">
            Not following anyone yet.
          </div>
        ) : (
          <div className="divide-y divide-zinc-800 rounded-2xl bg-zinc-900/70 overflow-hidden">
            {following.map((person) => (
              <div key={person.id} className="flex items-center gap-3 px-4 py-3">
                <Link href={`/profile/${person.username}`} className="flex items-center gap-3 flex-1 min-w-0">
                  {person.avatar_url ? (
                    <Image
                      src={person.avatar_url}
                      alt={person.username}
                      width={44}
                      height={44}
                      className="h-11 w-11 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-sm font-bold text-green-400">
                      {person.display_name?.[0]?.toUpperCase() || person.username?.[0]?.toUpperCase() || "U"}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">
                      {person.display_name || person.username}
                    </p>
                    <p className="truncate text-sm text-zinc-400">@{person.username}</p>
                  </div>
                </Link>

                <button
                  onClick={() => handleUnfollow(person.id)}
                  disabled={unfollowBusy === person.id}
                  className="shrink-0 rounded-lg border border-zinc-600 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-60 transition"
                >
                  {unfollowBusy === person.id ? "..." : "Unfollow"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
