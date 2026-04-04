import { NextRequest, NextResponse } from "next/server";
import { getSpotifyAccessToken } from "../../../../lib/spotify";

export async function GET(req: NextRequest) {
  try {
    const query = req.nextUrl.searchParams.get("q");
    const type = req.nextUrl.searchParams.get("type") || "album";

    if (!query) {
      return NextResponse.json(
        { error: "Missing search query" },
        { status: 400 }
      );
    }

    if (type !== "album" && type !== "track") {
      return NextResponse.json(
        { error: "Invalid search type" },
        { status: 400 }
      );
    }

    const tokenData = await getSpotifyAccessToken();

    const spotifyResponse = await fetch(
      `https://api.spotify.com/v1/search?` +
        new URLSearchParams({
          q: query,
          type,
          limit: "10",
        }),
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
        cache: "no-store",
      }
    );

    if (!spotifyResponse.ok) {
      const text = await spotifyResponse.text();
      return NextResponse.json(
        { error: "Spotify search failed", details: text },
        { status: spotifyResponse.status }
      );
    }

    const data = await spotifyResponse.json();

    if (type === "album") {
      const albums =
        data.albums?.items?.map((album: any) => ({
          spotify_album_id: album.id,
          album_name: album.name,
          artist_name: album.artists?.map((a: any) => a.name).join(", ") || "",
          image_url: album.images?.[0]?.url || null,
        })) || [];

      return NextResponse.json({ albums });
    }

    const tracks =
      data.tracks?.items?.map((track: any) => ({
        spotify_track_id: track.id,
        track_name: track.name,
        artist_name: track.artists?.map((a: any) => a.name).join(", ") || "",
        album_name: track.album?.name || null,
        image_url: track.album?.images?.[0]?.url || null,
      })) || [];

    return NextResponse.json({ tracks });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unknown Spotify error",
      },
      { status: 500 }
    );
  }
}