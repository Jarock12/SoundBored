"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../../utils/supabase/supabaseClient";
import { useAuth } from "../../../context/AuthProvider";
import MusicNotesLoader from "../../../components/MusicNotesLoader";

type FollowerProfile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

export default function FollowersPage() {
  const params = useParams();
  const username = typeof params.username === "string" ? params.username : "";
  const { user, authLoading } = useAuth();

  const [profileId, setProfileId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [followers, setFollowers] = useState<FollowerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());
  const [followBusy, setFollowBusy] = useState<string | null>(null);

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

      setProfileId(profileData.id);
      setDisplayName(profileData.display_name);

      const [followerRowsResult, viewerFollowingResult] = await Promise.all([
        supabase
          .from("follows")
          .select("follower_id")
          .eq("following_id", profileData.id)
          .limit(200),
        user?.id
          ? supabase.from("follows").select("following_id").eq("follower_id", user.id)
          : Promise.resolve({ data: [] as { following_id: string }[], error: null }),
      ]);

      const followerIds = (followerRowsResult.data || []).map((r) => r.follower_id);
      if (viewerFollowingResult.data) {
        setFollowingSet(new Set((viewerFollowingResult.data).map((r) => r.following_id)));
      }

      if (followerIds.length === 0) {
        setFollowers([]);
        setLoading(false);
        return;
      }

      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", followerIds);

      const profileMap = new Map((profilesData || []).map((p) => [p.id, p as FollowerProfile]));
      setFollowers(followerIds.map((id) => profileMap.get(id)).filter((p): p is FollowerProfile => !!p));
      setLoading(false);
    }

    load();
  }, [username, authLoading]);

  async function handleToggleFollow(targetId: string) {
    if (!user?.id || targetId === user.id) return;
    setFollowBusy(targetId);

    if (followingSet.has(targetId)) {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", targetId);
      setFollowingSet((prev) => { const next = new Set(prev); next.delete(targetId); return next; });
    } else {
      await supabase.from("follows").insert({ follower_id: user.id, following_id: targetId });
      setFollowingSet((prev) => new Set([...prev, targetId]));
    }

    setFollowBusy(null);
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
            {displayName || username}&apos;s Followers
          </h1>
        </div>

        {followers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-700 p-8 text-center text-zinc-400">
            No followers yet.
          </div>
        ) : (
          <div className="divide-y divide-zinc-800 rounded-2xl bg-zinc-900/70 overflow-hidden">
            {followers.map((follower) => (
              <div key={follower.id} className="flex items-center gap-3 px-4 py-3">
                <Link href={`/profile/${follower.username}`} className="flex items-center gap-3 flex-1 min-w-0">
                  {follower.avatar_url ? (
                    <Image
                      src={follower.avatar_url}
                      alt={follower.username}
                      width={44}
                      height={44}
                      className="h-11 w-11 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-sm font-bold text-green-400">
                      {follower.display_name?.[0]?.toUpperCase() || follower.username?.[0]?.toUpperCase() || "U"}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">
                      {follower.display_name || follower.username}
                    </p>
                    <p className="truncate text-sm text-zinc-400">@{follower.username}</p>
                  </div>
                </Link>

                {user?.id && follower.id !== user.id && (
                  <button
                    onClick={() => handleToggleFollow(follower.id)}
                    disabled={followBusy === follower.id}
                    className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold transition disabled:opacity-60 ${
                      followingSet.has(follower.id)
                        ? "border border-zinc-600 text-zinc-300 hover:bg-zinc-800"
                        : "bg-green-500 text-black hover:bg-green-600"
                    }`}
                  >
                    {followBusy === follower.id ? "..." : followingSet.has(follower.id) ? "Following" : "Follow"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
