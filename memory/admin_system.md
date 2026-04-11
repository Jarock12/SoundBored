---
name: Admin system
description: How admin features work — DB columns, API routes, panel page, shield badge on profiles
type: project
---

Admins are identified by `is_admin=true` in the `profiles` table. Banned users have `is_banned=true`.

**Why:** User requested admin role with ban/delete powers. First admin must be set manually via SQL.

**How to apply:** When touching auth, profiles, or user-facing UI, remember admins get a 🛡️ shield badge visible to everyone, and the admin action strip (ban/unban/delete) is shown to admins when viewing other users' profiles.

## SQL needed (run in Supabase SQL Editor)
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE;
UPDATE profiles SET is_admin = TRUE WHERE username = 'YOUR_USERNAME_HERE';
```

## Files
- `app/api/admin/ban/route.ts` — POST to ban a user (sets ban_duration + is_banned)
- `app/api/admin/unban/route.ts` — POST to unban (removes ban_duration, clears is_banned)
- `app/api/admin/delete/route.ts` — POST to permanently delete a user from Supabase Auth
- `app/admin/page.tsx` — Admin panel UI (lists all users, search, ban/delete buttons)
- `components/TopNav.tsx` — has `showAdmin` + `isAdmin` props; shows "🛡️ Admin Panel" link

## Security model
API routes verify the caller's JWT (passed as `Authorization: Bearer <token>`) server-side using the service role key, then check `is_admin` in the profiles table before executing any action.
