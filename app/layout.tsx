/**
 * Root Layout
 *
 * Applied to every page in the app. Sets up:
 *  - Geist Sans + Geist Mono fonts (loaded from Google Fonts via next/font)
 *  - Global CSS (globals.css — Tailwind base, custom animations)
 *  - MusicNotes canvas — the floating animated music note background that
 *    renders on a fixed canvas behind all page content (z-index 1)
 *  - A relative wrapper div (z-index 2) that sits above the canvas so page
 *    content is always interactive and clickable
 *
 * The MusicNotes component reads the user's note_color from Supabase and
 * updates the canvas color accordingly.
 */
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import MusicNotes from "./components/MusicNotes";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SoundBored",
  description: "Spotify tier list app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-black">
        {/* Animated floating music notes rendered on a fixed canvas (z-index 1) */}
        <MusicNotes />
        {/* Page content sits above the canvas (z-index 2) so it stays interactive */}
        <div className="app-shell relative z-[2] flex flex-col flex-1">
          <Link
            href="/"
            className="fixed left-5 top-5 z-[3] rounded-2xl border border-white/10 bg-black/35 p-2 shadow-[0_18px_40px_rgba(0,0,0,0.32)] backdrop-blur-md transition hover:bg-black/50"
          >
            <Image
              src="/soundbored-logo.png"
              alt="SoundBored logo"
              width={56}
              height={56}
              className="h-14 w-14 rounded-xl object-cover"
              priority
            />
          </Link>
          {children}
        </div>
      </body>
    </html>
  );
}
