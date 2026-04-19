"use client";

/**
 * TopNav â€” shared navigation bar used on every protected page.
 *
 * Each link is opt-in via boolean props so individual pages can control
 * exactly which nav items appear without duplicating markup.
 *
 * Props:
 *  showMyProfile   â€” show a link to the logged-in user's own profile
 *  myProfileUsername â€” the username to build that link
 *  showFeed        â€” show the Feed link
 *  showUsers       â€” show the Find Users link
 *  showRate        â€” show the Rate a Song link
 *  showProfile     â€” show a "View Profile" link to a different profile
 *  profileUsername â€” username for the View Profile link
 *  showLogout      â€” show the Log Out button
 *  onLogout        â€” callback fired when the Log Out button is clicked
 *  myProfileLabel  â€” override the label on the My Profile link (default "My Profile")
 *  showAdmin       â€” show the Admin Panel link (only set this to true for admin users)
 *  isAdmin         â€” whether the current user is an admin (controls shield icon display)
 */

import Link from "next/link";

type TopNavProps = {
  showMyProfile?: boolean;
  myProfileUsername?: string | null;
  showFeed?: boolean;
  showUsers?: boolean;
  showRate?: boolean;
  showAllRatings?: boolean;
  showProfile?: boolean;
  profileUsername?: string | null;
  showLogout?: boolean;
  onLogout?: () => void | Promise<void>;
  myProfileLabel?: string;
  /** Show the Admin Panel link â€” only pass true when the viewer is confirmed as admin */
  showAdmin?: boolean;
  /** Whether the current viewer is an admin (used to render the shield on their own profile link) */
  isAdmin?: boolean;
};

export default function TopNav({
  showMyProfile = false,
  myProfileUsername = null,
  showFeed = true,
  showUsers = true,
  showRate = true,
  showAllRatings = true,
  showProfile = false,
  profileUsername = null,
  showLogout = false,
  onLogout,
  myProfileLabel = "My Profile",
  showAdmin = false,
  isAdmin = false,
}: TopNavProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {/* Link to the current user's own profile page */}
      {showMyProfile && myProfileUsername && (
        <Link
          href={`/profile/${myProfileUsername}`}
          className="nav-chip rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800"
        >
          {myProfileLabel}
        </Link>
      )}

      {/* Social feed â€” shows ratings from followed users */}
      {showFeed && (
        <Link
          href="/feed"
          className="nav-chip rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800"
        >
          Feed
        </Link>
      )}

      {/* User discovery page â€” search and follow other users */}
      {showUsers && (
        <Link
          href="/users"
          className="nav-chip rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800"
        >
          Find Users
        </Link>
      )}

      {/* Song rating page â€” search Spotify and submit a review */}
      {showRate && (
        <Link
          href="/rate"
          className="nav-chip rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800"
        >
          Rate a Song
        </Link>
      )}

      {showAllRatings && myProfileUsername && (
        <Link
          href={`/profile/${myProfileUsername}/ratings`}
          className="nav-chip rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800"
        >
          All Ratings
        </Link>
      )}

      {/* Link to a specific other user's profile (used when viewing someone else's page) */}
      {showProfile && profileUsername && (
        <Link
          href={`/profile/${profileUsername}`}
          className="nav-chip rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800"
        >
          View Profile
        </Link>
      )}

      {/* Admin Panel link â€” only shown when showAdmin=true (i.e. the viewer is an admin) */}
      {showAdmin && isAdmin && (
        <Link
          href="/admin"
          className="rounded-lg border border-blue-700 bg-blue-950/25 px-4 py-2 text-sm font-semibold text-blue-300 transition hover:bg-blue-900/30"
        >
          Admin Panel
        </Link>
      )}

      {/* Log Out button â€” triggers the onLogout callback (usually signs out and redirects) */}
      {showLogout && onLogout && (
        <button
          onClick={onLogout}
          className="rounded-lg bg-green-400 px-4 py-2 text-sm font-semibold text-black shadow-[0_10px_24px_rgba(74,222,128,0.22)] transition hover:bg-green-300"
        >
          Log Out
        </button>
      )}
    </div>
  );
}
