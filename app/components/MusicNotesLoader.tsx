"use client";

// Shared full-screen loading animation used across all pages.
// Color is always rendered with the default on the server (avoids hydration
// mismatch), then swapped to the cached localStorage value in useEffect.

import { useState, useEffect } from "react";

const NOTES = ["♩", "♪", "♫", "♪", "♩"] as const;
const DEFAULT_COLOR = "#22c55e";
const STORAGE_KEY = "soundbored_note_color";

/** Call this after loading the user's profile to persist their note color. */
export function cacheNoteColor(color: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, color);
  }
}

type Props = {
  /** Pass noteColor if already known (e.g. from profile page state). */
  color?: string;
};

export default function MusicNotesLoader({ color }: Props) {
  // Always start with the default so server and client render identically.
  // useEffect then updates to the cached color — runs only on the client,
  // after hydration, so React never sees a mismatch.
  const [noteColor, setNoteColor] = useState(DEFAULT_COLOR);

  useEffect(() => {
    const resolved =
      color ||
      localStorage.getItem(STORAGE_KEY) ||
      DEFAULT_COLOR;
    setNoteColor(resolved);
  }, [color]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6">
      <style>{`
        @keyframes noteBob {
          0%, 100% { transform: translateY(0px) scale(1); opacity: 0.9; }
          50%       { transform: translateY(-22px) scale(1.15); opacity: 1; }
        }
      `}</style>
      <div className="flex items-end gap-4" style={{ height: 72 }}>
        {NOTES.map((note, i) => (
          <span
            key={i}
            style={{
              fontSize: 40,
              color: noteColor,
              display: "inline-block",
              animation: "noteBob 1s ease-in-out infinite",
              animationDelay: `${i * 0.18}s`,
              lineHeight: 1,
              textShadow: `0 4px 16px ${noteColor}66`,
            }}
          >
            {note}
          </span>
        ))}
      </div>
    </main>
  );
}
