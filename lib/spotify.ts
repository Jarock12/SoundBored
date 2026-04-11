/**
 * lib/spotify.ts — Spotify API authentication
 *
 * Uses the Client Credentials OAuth flow to get a short-lived access token.
 * This flow is server-to-server only — it doesn't require a user to log in
 * and is suitable for reading public Spotify data (search, track info, etc.).
 *
 * The token is fetched fresh on every call (no caching). Tokens expire in 3600s.
 * If we need to reduce Spotify API calls we could cache this in memory or Redis.
 */

export async function getSpotifyAccessToken() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing Spotify credentials");
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Spotify token error: ${response.status} ${text}`);
  }

  return response.json() as Promise<{
    access_token: string;
    token_type: string;
    expires_in: number;
  }>;
}