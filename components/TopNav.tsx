"use client";

/**
 * TopNav — shared navigation bar used on every protected page.
 *
 * Each link is opt-in via boolean props so individual pages can control
 * exactly which nav items appear without duplicating markup.
 *
 * Props:
 *  showMyProfile   — show a link to the logged-in user's own profile
 *  myProfileUsername — the username to build that link
 *  showFeed        — show the Feed link
 *  showUsers       — show the Find Users link
 *  showRate        — show the Rate a Song link
 *  showProfile     — show a "View Profile" link to a different profile
 *  profileUsername — username for the View Profile link
 *  showLogout      — show the Log Out button
 *  onLogout        — callback fired when the Log Out button is clicked
 *  myProfileLabel  — override the label on the My Profile link (default "My Profile")
 *  showAdmin       — show the Admin Panel link (only set this to true for admin users)
 *  isAdmin         — whether the current user is an admin (controls shield icon display)
 */

import Link from "next/link";

type TopNavProps = {
  showMyProfile?: boolean;
  myProfileUsername?: string | null;
  showFeed?: boolean;
  showUsers?: boolean;
  showRate?: boolean;
  showProfile?: boolean;
  profileUsername?: string | null;
  showLogout?: boolean;
  onLogout?: () => void | Promise<void>;
  myProfileLabel?: string;
  /** Show the Admin Panel link — only pass true when the viewer is confirmed as admin */
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
          className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800"
        >
          {myProfileLabel}
        </Link>
      )}

      {/* Social feed — shows ratings from followed users */}
      {showFeed && (
        <Link
          href="/feed"
          className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800"
        >
          Feed
        </Link>
      )}

      {/* User discovery page — search and follow other users */}
      {showUsers && (
        <Link
          href="/users"
          className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800"
        >
          Find Users
        </Link>
      )}

      {/* Song rating page — search Spotify and submit a review */}
      {showRate && (
        <Link
          href="/rate"
          className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800"
        >
          Rate a Song
        </Link>
      )}

      {/* Link to a specific other user's profile (used when viewing someone else's page) */}
      {showProfile && profileUsername && (
        <Link
          href={`/profile/${profileUsername}`}
          className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800"
        >
          View Profile
        </Link>
      )}

      {/* Admin Panel link — only shown when showAdmin=true (i.e. the viewer is an admin) */}
      {showAdmin && isAdmin && (
        <Link
          href="/admin"
          className="rounded-lg border border-blue-700 px-4 py-2 text-sm font-semibold text-blue-300 transition hover:bg-blue-900/30"
        >
          🛡️ Admin Panel
        </Link>
      )}

      {/* Log Out button — triggers the onLogout callback (usually signs out and redirects) */}
      {showLogout && onLogout && (
        <button
          onClick={onLogout}
          className="rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-green-600"
        >
          Log Out
        </button>
      )}
    </div>
  );
}
