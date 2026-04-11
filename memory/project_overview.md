---
name: Project overview
description: SoundBored — stack, auth flow, key DB tables, main pages, and file locations
type: project
---

SoundBored is a Next.js 16 / React 19 / Supabase social music rating platform.

**Stack:** Next.js App Router, TypeScript, Tailwind CSS v4, Supabase (PostgreSQL + Auth), Spotify Web API, react-grid-layout (profile customization).

## Key DB tables
- `profiles` — id (FK auth.users), username, display_name, bio, avatar_url, profile_layout (JSON), note_color, accent_text_color, is_admin (bool), is_banned (bool)
- `song_ratings` — user_id, spotify_track_id, track_name, artist_name, album_name, image_url, rating (0.5–5), review, timestamps
- `follows` — follower_id, following_id (composite PK)
- `favorite_tracks` / `favorite_albums` — user_id, spotify IDs, position (1–5)
- `saved_tracks` — synced from Spotify OAuth (top 5 tracks)

## Auth flow
- Signup: `supabase.auth.signUp()` → insert profiles row with same UUID
- Login: `supabase.auth.signInWithPassword()` → fetch profiles for username → redirect
- All protected pages call `getCurrentUserSafe()` from `utils/supabase/auth.ts`

## Key files
- `utils/supabase/supabaseClient.js` — browser anon client
- `utils/supabase/supabaseServer.js` — server service-role client (never in browser)
- `utils/supabase/auth.ts` — `getCurrentUserSafe()` helper
- `components/TopNav.tsx` — shared nav bar (all protected pages)
- `lib/spotify.ts` — Client Credentials token fetch
- `app/api/spotify/search/route.ts` — Spotify search proxy
