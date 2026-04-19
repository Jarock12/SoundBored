"use client";

import { useState, useCallback, useRef } from "react";
import { useAuth } from "../context/AuthProvider";
import { supabase } from "../../utils/supabase/supabaseClient";
import { BadgeIcon, BADGE_META } from "../components/BadgeIcon";

// ─── Button config (OoT N64 layout) ───────────────────────────────────────────
// C buttons = yellow-gold with directional arrows, A button = blue
// All C buttons use the same ▲ triangle, rotated to point the right direction
const BUTTONS = [
  { key: "CU", label: "▲", rotate:   0, color: "#ca8a04", staffY: 8,  noteFreq: 659.25 },
  { key: "CR", label: "▲", rotate:  90, color: "#ca8a04", staffY: 24, noteFreq: 523.25 },
  { key: "A",  label: "A", rotate:   0, color: "#1d4ed8", staffY: 40, noteFreq: 440.00 },
  { key: "CL", label: "▲", rotate: -90, color: "#ca8a04", staffY: 56, noteFreq: 349.23 },
  { key: "CD", label: "▲", rotate: 180, color: "#ca8a04", staffY: 72, noteFreq: 293.66 },
] as const;

type BKey = "CU" | "CR" | "A" | "CL" | "CD";

const STAFF_LINES_Y = [8, 24, 40, 56, 72];
const MAX_NOTES = 8;

// ─── Real OoT ocarina songs ────────────────────────────────────────────────────
const SONGS: { sequence: BKey[]; badge: string; songName: string }[] = [
  { sequence: ["CL","CU","CR","CL","CU","CR"], badge: "ocarina", songName: "Zelda's Lullaby" },
  { sequence: ["CD","CR","CL","CD","CR","CL"], badge: "shield",  songName: "Saria's Song"    },
  { sequence: ["A", "CD","CU","A", "CD","CU"], badge: "cucco",   songName: "Song of Storms"  },
];

type NoteEntry = { key: string; color: string; staffY: number; id: number };
let _nid = 0;

// ─── Web Audio helpers ─────────────────────────────────────────────────────────
function getCtx(ref: React.MutableRefObject<AudioContext | null>): AudioContext {
  if (!ref.current) {
    ref.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return ref.current;
}

function playTone(ctx: AudioContext, freq: number, dur = 0.2) {
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  osc.type = "square";
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.09, ctx.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + dur + 0.05);
}

function playZeldaFanfare(ctx: AudioContext) {
  // Ascending pentatonic run → two-note chord resolution (OoT puzzle-solved vibe)
  const notes = [
    { freq: 392.00, start: 0.00, dur: 0.09 },  // G4
    { freq: 440.00, start: 0.07, dur: 0.09 },  // A4
    { freq: 523.25, start: 0.14, dur: 0.09 },  // C5
    { freq: 587.33, start: 0.21, dur: 0.09 },  // D5
    { freq: 659.25, start: 0.28, dur: 0.65 },  // E5 (sustained lead)
    { freq: 783.99, start: 0.34, dur: 0.55 },  // G5 (harmony)
  ];
  notes.forEach(({ freq, start, dur }) => {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = "square";
    osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
    gain.gain.setValueAtTime(0,    ctx.currentTime + start);
    gain.gain.linearRampToValueAtTime(0.10, ctx.currentTime + start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
    osc.start(ctx.currentTime + start);
    osc.stop(ctx.currentTime + start + dur + 0.1);
  });
}

// ─── OcarinaButton ─────────────────────────────────────────────────────────────
function OcarinaButton({
  bkey, label, rotate = 0, color, large = false,
  onPress,
}: {
  bkey: BKey; label: string; rotate?: number; color: string; large?: boolean;
  onPress: (k: BKey) => void;
}) {
  const sz = large ? 58 : 44;
  return (
    <button
      onClick={() => onPress(bkey)}
      className="flex items-center justify-center rounded-full font-black transition-transform active:scale-90 select-none"
      style={{
        width: sz, height: sz,
        background: `radial-gradient(circle at 38% 35%, ${color}ee, ${color}88)`,
        color: "#fff",
        fontSize: large ? 17 : 15,
        boxShadow: `0 0 16px ${color}55, 0 3px 8px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.18)`,
        border: `2px solid ${color}77`,
        textShadow: "0 1px 3px rgba(0,0,0,0.7)",
      }}
    >
      <span suppressHydrationWarning style={{ display: "inline-block", transform: `rotate(${rotate}deg)`, lineHeight: 1 }}>
        {label}
      </span>
    </button>
  );
}

// ─── OcarinaEgg ────────────────────────────────────────────────────────────────
function OcarinaEgg() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<NoteEntry[]>([]);
  const [glowing, setGlowing] = useState(false);
  const [unlocked, setUnlocked] = useState<{ badge: string; songName: string } | null>(null);
  const sequenceRef = useRef<BKey[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const pressButton = useCallback(async (key: BKey) => {
    const btn = BUTTONS.find(b => b.key === key)!;

    // Play individual note
    const ctx = getCtx(audioCtxRef);
    playTone(ctx, btn.noteFreq);

    // Add to staff display
    setNotes(prev => [...prev.slice(-(MAX_NOTES - 1)), { key, color: btn.color, staffY: btn.staffY, id: ++_nid }]);

    // Track sequence (keep last 8)
    const next = [...sequenceRef.current, key].slice(-8);
    sequenceRef.current = next;

    // Check all songs
    for (const song of SONGS) {
      const len = song.sequence.length;
      const tail = next.slice(-len);
      if (tail.length === len && tail.every((k, i) => k === song.sequence[i])) {
        sequenceRef.current = [];
        playZeldaFanfare(ctx);
        setGlowing(true);
        setTimeout(() => setGlowing(false), 2200);
        setUnlocked({ badge: song.badge, songName: song.songName });
        setTimeout(() => setUnlocked(null), 6000);

        if (user) {
          try {
            const { data } = await supabase
              .from("profiles").select("badges").eq("id", user.id).single();
            const existing: string[] = (data as { badges?: string[] } | null)?.badges ?? [];
            if (!existing.includes(song.badge)) {
              await supabase.from("profiles")
                .update({ badges: [...existing, song.badge] })
                .eq("id", user.id);
            }
          } catch { /* badges column not yet added — still celebrate */ }
        }
        return;
      }
    }
  }, [user]);

  const meta = unlocked ? BADGE_META[unlocked.badge] : null;

  return (
    <section className="px-6 pb-24">
      <div className="mx-auto max-w-lg">
        {/* Staff */}
        <div
          className="rounded-t-2xl px-8 pt-5 pb-3 relative overflow-hidden"
          style={{
            background: glowing ? "rgba(40,22,4,0.97)" : "rgba(18,11,4,0.95)",
            borderTop: `1px solid ${glowing ? "rgba(251,191,36,0.55)" : "rgba(161,84,0,0.3)"}`,
            borderLeft: `1px solid ${glowing ? "rgba(251,191,36,0.55)" : "rgba(161,84,0,0.3)"}`,
            borderRight: `1px solid ${glowing ? "rgba(251,191,36,0.55)" : "rgba(161,84,0,0.3)"}`,
            borderBottom: "none",
            boxShadow: glowing ? "0 0 36px rgba(251,191,36,0.18), inset 0 0 50px rgba(251,191,36,0.07)" : "none",
            transition: "all 0.35s ease",
          }}
        >
          {/* Treble clef */}
          <span
            className="absolute left-3 top-0.5 select-none pointer-events-none"
            style={{ fontSize: 60, lineHeight: 1, color: glowing ? "#fbbf24" : "#b45309", opacity: 0.9, transition: "color 0.35s" }}
          >
            𝄞
          </span>

          {/* Staff lines + notes */}
          <div className="relative ml-10" style={{ height: 88 }}>
            {STAFF_LINES_Y.map((y, i) => (
              <div
                key={i}
                className="absolute left-0 right-0"
                style={{
                  top: y, height: 1,
                  background: glowing ? "rgba(251,191,36,0.85)" : "rgba(180,83,9,0.6)",
                  boxShadow: glowing ? "0 0 5px rgba(251,191,36,0.6)" : "none",
                  transition: "background 0.35s, box-shadow 0.35s",
                }}
              />
            ))}

            {notes.map((note, idx) => {
              const xPct = ((idx + 1) / (MAX_NOTES + 1)) * 100;
              return (
                <div
                  key={note.id}
                  className="absolute"
                  style={{ left: `${xPct}%`, top: note.staffY - 6, transform: "translateX(-50%)" }}
                >
                  <div style={{ width: 14, height: 10, borderRadius: "50%", background: note.color, transform: "rotate(-15deg)", boxShadow: `0 0 6px ${note.color}99` }} />
                  <div style={{ position: "absolute", right: 1, top: -18, width: 1.5, height: 20, background: note.color, opacity: 0.7 }} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Buttons — OoT cross layout + A button */}
        <div
          className="rounded-b-2xl py-5 flex items-center justify-center gap-10"
          style={{
            background: "rgba(10,6,2,0.97)",
            borderTop: "1px solid rgba(161,84,0,0.12)",
            borderLeft: "1px solid rgba(161,84,0,0.3)",
            borderRight: "1px solid rgba(161,84,0,0.3)",
            borderBottom: "1px solid rgba(161,84,0,0.3)",
          }}
        >
          {/* C-button cross */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 44px)", gridTemplateRows: "repeat(3, 44px)", gap: 4 }}>
            <div style={{ gridColumn: 2, gridRow: 1, display: "flex", justifyContent: "center" }}>
              <OcarinaButton bkey="CU" label="▲" rotate={0}    color="#ca8a04" onPress={pressButton} />
            </div>
            <div style={{ gridColumn: 1, gridRow: 2, display: "flex", justifyContent: "center" }}>
              <OcarinaButton bkey="CL" label="▲" rotate={-90}  color="#ca8a04" onPress={pressButton} />
            </div>
            <div style={{ gridColumn: 3, gridRow: 2, display: "flex", justifyContent: "center" }}>
              <OcarinaButton bkey="CR" label="▲" rotate={90}   color="#ca8a04" onPress={pressButton} />
            </div>
            <div style={{ gridColumn: 2, gridRow: 3, display: "flex", justifyContent: "center" }}>
              <OcarinaButton bkey="CD" label="▲" rotate={180}  color="#ca8a04" onPress={pressButton} />
            </div>
          </div>

          {/* A button (large, blue) */}
          <OcarinaButton bkey="A" label="A" color="#1d4ed8" large onPress={pressButton} />
        </div>

        {/* Unlock toast */}
        {unlocked && meta && (
          <div
            className="mt-4 rounded-2xl px-6 py-5 text-center"
            style={{
              background: "linear-gradient(135deg, rgba(35,20,3,0.97), rgba(18,10,2,0.97))",
              border: `1px solid ${meta.color}66`,
              boxShadow: `0 0 30px ${meta.glow ?? "rgba(0,0,0,0)"}`,
            }}
          >
            <div className="flex justify-center mb-3">
              <BadgeIcon badge={unlocked.badge} size={56} />
            </div>
            <div className="text-base font-bold mb-0.5" style={{ color: meta.color }}>
              {unlocked.songName}
            </div>
            <div className="text-sm text-zinc-300">
              Badge unlocked: <span className="font-semibold text-white">{meta.name}</span>
            </div>
            {!user && (
              <div className="mt-2 text-xs text-zinc-500">Log in to save this badge to your profile</div>
            )}
          </div>
        )}

      </div>
    </section>
  );
}

// ─── Feature cards ─────────────────────────────────────────────────────────────
const features = [
  { icon: "♪", title: "Rate Any Song",      description: "Search millions of tracks via Spotify and give each one a music note score from ½ to 5. Leave a written review to explain your take." },
  { icon: "𝄞", title: "Build Your Profile", description: "A fully customizable drag-and-drop grid. Pin your favorite tracks, albums, playlists, and reviews in any layout you like." },
  { icon: "♫", title: "Follow Friends",     description: "Follow other listeners and see who's following you. Keep up with the music people you trust." },
  { icon: "♬", title: "Browse the Feed",    description: "Your feed shows every rating from people you follow — sorted newest first so you never miss a fresh take on a record." },
];

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function AboutPage() {
  return (
    <main className="min-h-screen text-white">

      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-6 pt-28 pb-20 text-center">
        <div className="mb-4 text-6xl" style={{ color: "#22c55e", lineHeight: 1 }}>𝄞</div>
        <h1 className="text-5xl md:text-6xl font-bold mb-5 tracking-tight">SoundBored</h1>
        <p className="max-w-xl text-lg text-zinc-300 leading-relaxed">
          The social platform for people who take music seriously. Rate tracks,
          build a listening profile, and follow friends to discover what they're obsessing over.
        </p>
      </section>

      {/* How it works */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-2 text-center text-xs font-semibold uppercase tracking-widest text-green-400">How it works</h2>
          <p className="mb-10 text-center text-2xl font-bold">Everything you need to share your taste in music</p>
          <div className="grid gap-6 sm:grid-cols-2">
            {features.map(f => (
              <div key={f.title} className="panel-surface rounded-2xl p-6">
                <div className="mb-3 text-3xl" style={{ color: "#22c55e", lineHeight: 1 }}>{f.icon}</div>
                <h3 className="mb-2 text-lg font-bold">{f.title}</h3>
                <p className="text-sm leading-relaxed text-zinc-400">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Rating scale */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-2xl panel-surface rounded-2xl p-8 text-center">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-widest text-green-400">The Rating Scale</h2>
          <p className="mb-8 text-xl font-bold">Music notes, not stars</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {[
              { score: "½", label: "Skip it"         },
              { score: "1", label: "Not for me"      },
              { score: "2", label: "It's fine"       },
              { score: "3", label: "Good listen"     },
              { score: "4", label: "Really solid"    },
              { score: "5", label: "All-time classic"},
            ].map(({ score, label }) => (
              <div key={score} className="rounded-xl bg-zinc-800/60 px-4 py-3">
                <div className="mb-1 text-xl font-bold text-green-400">{score} ♪</div>
                <div className="text-xs text-zinc-400">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ocarina Easter Egg — hidden further down the page intentionally */}
      <div className="pt-[120vh]" />
      <OcarinaEgg />

    </main>
  );
}
